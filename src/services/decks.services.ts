import { prisma } from "../db/prisma";
import {
  DeckRepository,
  UpdateDeckData,
} from "../repositories/decks.repository";
import { createDeckDTO } from "../dtos/deck.dto";
import z from "zod";

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
  chunkThreshold: number; // a partir de quantas cartas começa a chunkar
  chunkSize: number; // tamanho de cada lote
  imageConcurrency: number; // concorrência para fetch de imagens
  skipDuplicates: boolean; // só funciona se houver unique constraint correspondente
};

const DEFAULT_BULK_OPTIONS: BulkOptions = {
  chunkThreshold: 50,
  chunkSize: 100,
  imageConcurrency: 5,
  skipDuplicates: false,
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
  constructor(private repo: DeckRepository) {}

  findAllDecks() {
    return this.repo.findAllDecks();
  }

  async deleteAllCardsFromDeck(deckId: string) {
    return await this.repo.deleteAllCardsFromDeck(deckId);
  }

  async deleteDeck(id: string) {
    // Check if deck exists before searching for it
    const deckExists = await this.repo.findDeckById(id);

    if (deckExists == null) {
      throw new Error("Deck not found");
    }

    return this.repo.deleteDeck(id);
  }

  createDeck(name: createDeckDTO) {
    return this.repo.createDeck(name);
  }

  deckAlreadyExists(name: string) {
    return this.repo.deckAlreadyExists(name);
  }

  findDeckById(id: string) {
    return this.repo.findDeckById(id);
  }

  checkMaxCardsandCurrentCards(deckId: string) {
    return this.repo.checkMaxCardsandCurrentCards(deckId);
  }

  updateDeckInfo(id: string, data: UpdateDeckData) {
    return this.repo.updateDeckInfo(id, data);
  }

  async bulkAddCards(
    payload: BulkAddRequest,
    options: Partial<BulkOptions> = {},
  ): Promise<BulkAddResponse> {
    const opts = { ...DEFAULT_BULK_OPTIONS, ...options };

    const deckId = z.string().uuid().parse(payload.deckId);
    const parsed = parseDeckBulkText(payload.bulkText);

    const expandedRaw = parsed.items.flatMap((line) =>
      Array.from({ length: line.qty }).map(() => ({
        deckId,
        name: line.name,
        set: line.setCode,
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

    // Checa limite do deck (fora de transaction longa)
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
      select: {
        cards_max: true,
        _count: { select: { cards: true } },
      },
    });

    const expanded = expandedRaw;

    if (!deck) throw new Error("Deck not found.");

    const currentCards = deck._count.cards;
    const tryingToAdd = expanded.length;
    const cardsMax = deck.cards_max;

    if (currentCards + tryingToAdd > cardsMax) {
      throw new DeckLimitExceededError({ cardsMax, currentCards, tryingToAdd });
    }

    // Fetch de imagens fora do DB (concorrência limitada)
    const shouldFetchImages = payload.fetchImages ?? true;

    if (shouldFetchImages) {
      const uniqueNames = Array.from(new Set(expanded.map((c) => c.name)));

      const nameImgPairs = await mapLimit(
        uniqueNames,
        opts.imageConcurrency,
        async (name) => {
          try {
            const img = await fetchImageUrlByName(name);
            return [name, img] as const;
          } catch {
            return [name, null] as const;
          }
        },
      );

      const nameToImage = new Map<string, string | null>(nameImgPairs);

      for (const c of expanded) {
        c.image_url = nameToImage.get(c.name) ?? null;
      }
    }

    // Inserir em chunks (evita P2028 em imports grandes)
    const chunks =
      expanded.length >= opts.chunkThreshold
        ? chunkArray(expanded, opts.chunkSize)
        : [expanded];

    let createdTotal = 0;
    const chunkMeta: Array<{ index: number; size: number; created: number }> =
      [];

    for (let index = 0; index < chunks.length; index++) {
      const data = chunks[index];
      if (!data) continue; // satisfaz TS com noUncheckedIndexedAccess

      const r = await prisma.card.createMany({
        data,
        ...(opts.skipDuplicates ? { skipDuplicates: true } : {}),
      });

      createdTotal += r.count;

      if (chunks.length > 1) {
        chunkMeta.push({ index, size: data.length, created: r.count });
      }
    }

    const base: BulkAddResponse = {
      created: createdTotal,
      parsedLines: parsed.items.length,
      warnings: parsed.warnings,
    };

    // ✅ com exactOptionalPropertyTypes: só inclua a prop se existir (não atribua undefined)
    if (chunkMeta.length) {
      (base as any).chunks = chunkMeta;
    }

    return base;
  }

  async setCommanderCard(deckId: string, card_id: string) {
    return this.repo.setCommanderCard(deckId, card_id);
  }
}
