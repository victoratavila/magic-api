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

type BulkAddRequest = {
  deckId: string;
  bulkText: string;
  ownDefault?: boolean;
  fetchImages?: boolean;
};

type BulkAddResponse = {
  created: number;
  parsedLines: number;
  warnings: string[];
};

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

  async bulkAddCards(payload: BulkAddRequest): Promise<BulkAddResponse> {
    const deckId = z.string().uuid().parse(payload.deckId);

    const parsed = parseDeckBulkText(payload.bulkText);

    const expanded = parsed.items.flatMap((line) =>
      Array.from({ length: line.qty }).map(() => ({
        deckId,
        name: line.name,
        set: line.setCode, // ✅ só a sigla (SLD, PLST...)
        own: payload.ownDefault ?? false,
        image_url: null as string | null,
      })),
    );

    if (expanded.length === 0) {
      return {
        created: 0,
        parsedLines: parsed.items.length,
        warnings: parsed.warnings.length
          ? parsed.warnings
          : ["No valid card lines found."],
      };
    }

    const shouldFetchImages = payload.fetchImages ?? true;

    // ✅ Faz a verificação de limite e a importação numa transaction
    return prisma.$transaction(async (tx) => {
      const deck = await tx.deck.findUnique({
        where: { id: deckId },
        select: {
          cards_max: true,
          _count: { select: { cards: true } },
        },
      });

      if (!deck) {
        throw new Error("Deck not found.");
      }

      const currentCards = deck._count.cards;
      const tryingToAdd = expanded.length;
      const cardsMax = deck.cards_max;

      if (currentCards + tryingToAdd > cardsMax) {
        throw new DeckLimitExceededError({
          cardsMax,
          currentCards,
          tryingToAdd,
        });
      }

      // (opcional) buscar imagens antes de salvar (continua igual)
      if (shouldFetchImages) {
        const uniqueNames = Array.from(new Set(expanded.map((c) => c.name)));
        const nameToImage = new Map<string, string | null>();

        for (const name of uniqueNames) {
          const img = await fetchImageUrlByName(name);
          nameToImage.set(name, img);
        }

        for (const c of expanded) {
          c.image_url = nameToImage.get(c.name) ?? null;
        }
      }

      await tx.card.createMany({ data: expanded });

      return {
        created: expanded.length,
        parsedLines: parsed.items.length,
        warnings: parsed.warnings,
      };
    });
  }

  async setCommanderCard(deckId: string, card_id: string) {
    return this.repo.setCommanderCard(deckId, card_id);
  }
}
