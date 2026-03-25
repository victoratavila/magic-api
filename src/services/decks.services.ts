import { prisma } from "../db/prisma";
import {
  DeckRepository,
  UpdateDeckData,
} from "../repositories/decks.repository";
import { createDeckDTO } from "../dtos/deck.dto";
import z from "zod";
import createError from "http-errors";

export class DeckLimitExceededError extends Error {
  constructor(
    public details: {
      cardsMax: number;
      currentCards: number;
      tryingToAdd: number;
    },
  ) {
    super("Deck cards limit exceeded.");
    this.name = "DeckLimitExceededError";
  }
}

import {
  parseDeckBulkText,
  normalizeAndMergeDuplicates,
  BulkCardLine,
} from "../dtos/bulk.add.dto";
import { CardsRepository } from "../repositories/cards.repository";
import { CardsService } from "./cards.services";

export type BulkAddRequest = {
  deckId: string;
  bulkText: string;
  ownDefault?: boolean;
  fetchImages?: boolean;
};

export type BulkAddResponse = {
  created: number;
  parsedLines: number;
  warnings: string[];
  chunks?: Array<{ index: number; size: number; created: number }>;
};

type BulkOptions = {
  chunkThreshold: number;
  chunkSize: number;
  imageConcurrency: number;
  skipDuplicates: boolean;
  parallelChunks: number; // ← adicionar
};

const DEFAULT_BULK_OPTIONS: BulkOptions = {
  chunkThreshold: 100,
  chunkSize: 50,
  imageConcurrency: 10,
  skipDuplicates: false,
  parallelChunks: 3, // ← adicionar
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Executa mapper async com concorrência limitada.
 * - Preserva ordem
 * - Não estoura o Prisma/IO externo
 */
async function mapLimit<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length) as R[];
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;

      const item = items[i];
      // ✅ Fix do TS: items[i] pode ser T | undefined
      if (item === undefined) continue;

      results[i] = await mapper(item, i);
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    () => worker(),
  );

  await Promise.all(workers);
  return results;
}

/**
 * Dedupe em memória para evitar inserts redundantes antes de bater no DB.
 * (Opcional, mas ajuda em bulk vindo com linhas repetidas)
 */
function dedupeExpanded(
  expanded: Array<{
    deckId: string;
    name: string;
    set: string;
    own: boolean;
    image_url: string | null;
  }>,
) {
  const seen = new Set<string>();
  const out: typeof expanded = [];

  for (const c of expanded) {
    const key = `${c.deckId}::${c.name.toLowerCase()}::${c.set.toLowerCase()}::${c.own}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }

  return out;
}

type ScryfallCard = {
  image_uris?: { normal?: string };
  card_faces?: Array<{ image_uris?: { normal?: string } }>;
};

function pickImageUrl(s: ScryfallCard): string | null {
  return s.image_uris?.normal ?? s.card_faces?.[0]?.image_uris?.normal ?? null;
}

async function fetchImageUrlByName(name: string): Promise<string | null> {
  const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = (await resp.json()) as ScryfallCard;
    return pickImageUrl(data);
  } catch {
    return null;
  }
}

export class DeckService {
  constructor(
    private repo: DeckRepository,
    private card_service: CardsService,
  ) {}

  findAllDecks(userId: string) {
    return this.repo.findAllDecks(userId);
  }

  async deleteAllCardsFromDeck(userId: string, deckId: string) {
    return await this.repo.deleteAllCardsFromDeck(userId, deckId);
  }

  async deleteDeck(userId: string, deckId: string) {
    // Check if deck exists before searching for it
    const deckExists = await this.repo.findDeckById(userId, deckId);

    if (deckExists == null) {
      throw new Error("Deck not found");
    }

    return this.repo.deleteDeck(userId, deckId);
  }

  createDeck(name: createDeckDTO, userId: string) {
    return this.repo.createDeck(name, userId);
  }

  deckAlreadyExists(name: string, userId: string) {
    return this.repo.deckAlreadyExists(name, userId);
  }

  findDeckById(userId: string, deckId: string) {
    return this.repo.findDeckById(userId, deckId);
  }

  checkMaxCardsandCurrentCards(deckId: string) {
    return this.repo.checkMaxCardsandCurrentCards(deckId);
  }

  updateDeckInfo(userId: string, id: string, data: UpdateDeckData) {
    return this.repo.updateDeckInfo(userId, id, data);
  }

  async bulkAddCards(
    payload: BulkAddRequest,
    options: Partial<BulkOptions> = {},
  ): Promise<BulkAddResponse> {
    const opts = { ...DEFAULT_BULK_OPTIONS, ...options };
    const deckId = z.string().uuid().parse(payload.deckId);
    const parsed = parseDeckBulkText(payload.bulkText);

    if (parsed.items.length === 0) {
      return {
        created: 0,
        parsedLines: 0,
        warnings: parsed.warnings.length
          ? parsed.warnings
          : ["No valid card lines found."],
      };
    }

    const expandedRaw = parsed.items.flatMap((line) =>
      Array.from({ length: line.qty }, () => ({
        deckId,
        name: line.name,
        set: line.setCode ?? null,
        own: payload.ownDefault ?? false,
        image_url: null as string | null,
      })),
    );

    if (expandedRaw.length === 0) {
      return {
        created: 0,
        parsedLines: parsed.items.length,
        warnings: parsed.warnings.length
          ? parsed.warnings
          : ["No valid card lines found."],
      };
    }

    // ── Helper: fetch com concorrência limitada ────────────────────────────
    type CardForFetch = {
      name: string;
      set: string | null;
      collectorNumber: string | null;
    };

    const fetchImagesWithConcurrency = async (
      cards: CardForFetch[],
      concurrency: number,
    ): Promise<Map<string, string | null>> => {
      const cardToImage = new Map<string, string | null>();
      let idx = 0;

      const worker = async () => {
        while (idx < cards.length) {
          const current = idx++;
          const c = cards[current]!;
          const key = `${c.name}::${c.set}::${c.collectorNumber}`;

          if (!c.set || !c.collectorNumber) {
            // Fallback: busca só pelo nome
            try {
              const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(c.name)}`;
              const res = await fetch(url, {
                signal: AbortSignal.timeout(5_000),
              });
              if (!res.ok) {
                cardToImage.set(key, null);
                continue;
              }
              const data = await res.json();
              const img =
                data.image_uris?.normal ??
                data.card_faces?.[0]?.image_uris?.normal ??
                null;
              cardToImage.set(key, img);
            } catch {
              cardToImage.set(key, null);
            }
            continue;
          }

          try {
            // Tenta endpoint direto por set/number
            const urlDirect = `https://api.scryfall.com/cards/${encodeURIComponent(
              c.set.toLowerCase(),
            )}/${encodeURIComponent(c.collectorNumber)}`;
            const resDirect = await fetch(urlDirect, {
              signal: AbortSignal.timeout(5_000),
            });

            if (resDirect.ok) {
              const data = await resDirect.json();
              const img =
                data.image_uris?.normal ??
                data.card_faces?.[0]?.image_uris?.normal ??
                null;
              cardToImage.set(key, img);
              continue;
            }

            // Fallback: busca por nome + set
            const urlNamed = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
              c.name,
            )}&set=${encodeURIComponent(c.set.toLowerCase())}`;
            const resNamed = await fetch(urlNamed, {
              signal: AbortSignal.timeout(5_000),
            });

            if (!resNamed.ok) {
              cardToImage.set(key, null);
              continue;
            }
            const dataNamed = await resNamed.json();
            const img =
              dataNamed.image_uris?.normal ??
              dataNamed.card_faces?.[0]?.image_uris?.normal ??
              null;
            cardToImage.set(key, img);
          } catch {
            cardToImage.set(key, null);
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(concurrency, cards.length) }, () =>
          worker(),
        ),
      );
      return cardToImage;
    };
    // ───────────────────────────────────────────────────────────────────────

    // Dispara query do deck e fetch de imagens em paralelo
    const deckPromise = prisma.deck.findUnique({
      where: { id: deckId },
      select: {
        cards_max: true,
        _count: { select: { cards: true } },
      },
    });

    const shouldFetchImages = payload.fetchImages ?? true;

    const imagePromise: Promise<Map<string, string | null>> = shouldFetchImages
      ? (() => {
          const uniqueKeys = new Map<string, CardForFetch>();
          for (const line of parsed.items) {
            const key = `${line.name}::${line.setCode ?? null}::${line.collectorNumber ?? null}`;
            uniqueKeys.set(key, {
              name: line.name,
              set: line.setCode ?? null,
              collectorNumber: line.collectorNumber ?? null,
            });
          }
          return fetchImagesWithConcurrency(
            Array.from(uniqueKeys.values()),
            opts.imageConcurrency ?? 10,
          );
        })()
      : Promise.resolve(new Map());

    const [deck, cardToImage] = await Promise.all([deckPromise, imagePromise]);

    if (!deck) throw new Error("Deck not found.");

    const {
      cards_max: cardsMax,
      _count: { cards: currentCards },
    } = deck;
    const tryingToAdd = expandedRaw.length;

    if (currentCards + tryingToAdd > cardsMax) {
      throw new DeckLimitExceededError({ cardsMax, currentCards, tryingToAdd });
    }

    // Aplica imagens usando name::set como chave
    if (shouldFetchImages) {
      const imageByNameSet = new Map<string, string | null>();
      for (const [key, img] of cardToImage) {
        const [name, set] = key.split("::");
        imageByNameSet.set(`${name}::${set}`, img);
      }

      for (const c of expandedRaw) {
        c.image_url = imageByNameSet.get(`${c.name}::${c.set}`) ?? null;
      }
    }

    // Inserção em chunks paralelos
    const shouldChunk = expandedRaw.length >= opts.chunkThreshold;
    const chunks = shouldChunk
      ? chunkArray(expandedRaw, opts.chunkSize)
      : [expandedRaw];

    let createdTotal = 0;
    const chunkMeta: Array<{ index: number; size: number; created: number }> =
      [];

    if (shouldChunk) {
      const PARALLEL_CHUNKS = opts.parallelChunks ?? 3;
      for (let i = 0; i < chunks.length; i += PARALLEL_CHUNKS) {
        const batch = chunks.slice(i, i + PARALLEL_CHUNKS);
        const results = await Promise.all(
          batch.map((data, localIdx) =>
            prisma.card
              .createMany({ data, skipDuplicates: false })
              .then((r) => ({
                index: i + localIdx,
                size: data.length,
                created: r.count,
              })),
          ),
        );
        for (const meta of results) {
          createdTotal += meta.created;
          chunkMeta.push(meta);
        }
      }
    } else {
      const r = await prisma.card.createMany({
        data: expandedRaw,
        skipDuplicates: false,
      });
      createdTotal = r.count;
    }

    const base: BulkAddResponse = {
      created: createdTotal,
      parsedLines: parsed.items.length,
      warnings: parsed.warnings,
    };

    if (chunkMeta.length) (base as any).chunks = chunkMeta;

    return base;
  }

  async isCardLegendary(cardId: string) {
    const card = await this.card_service.findCardById(cardId);
    if (card == null) {
      throw new Error("Card not found");
    } else {
      const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}`;
      const response = await fetch(url);
      const data = await response.json();
      console.log(data.type_line);
      if (
        data.type_line.includes("Legendary Creature") ||
        data.type_line.includes("Legendary Artifact")
      ) {
        return true;
      }

      return false;
    }
  }

  async setCommanderCard(deckId: string, card_id: string) {
    const isLegendary = await this.isCardLegendary(card_id);
    console.log(isLegendary);

    if (!isLegendary) {
      throw createError(
        400,
        "Apenas Legendary Creatures/Artifacts podem ser definidos como comandantes",
      );
    } else {
      return this.repo.setCommanderCard(deckId, card_id);
    }
  }

  async exportCardList(userId: string, deckId: string, filter: string) {
    try {
      const cardList =
        (await this.card_service.findCardsToExport(userId, deckId, filter)) ??
        [];

      const text = cardList
        .map((c) => `${c.amount} ${c.name} [${String(c.set).toLowerCase()}]`)
        .join("\n");

      return text;
    } catch (err: any) {
      if (err) {
        throw new Error(err);
      }
    }
  }

  async deckStats(userId: string, deckId: string) {
    try {
      const deckStats = await this.repo.deckStats(userId, deckId);
      return deckStats;
    } catch (err: any) {
      if (err) {
        throw new Error(err);
      }
    }
  }
}
