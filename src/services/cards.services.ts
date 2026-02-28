// Service layer = business rules and orchestration.
// It "decides" behavior (e.g., 404 if user does not exist)
// and uses the repository for DB operations.

import { CreateCardDTO } from "../dtos/card.dto";
import { CardsRepository } from "../repositories/cards.repository";
import { Prisma } from "@prisma/client";
import { DeckRepository } from "../repositories/decks.repository";
import { errorClass } from "../utils/errorClass";

type CardFilter = "all" | "own" | "missing";

type ScryfallNamedResponse = {
  object: string;
  not_found?: boolean;
  image_uris?: {
    normal?: string;
    large?: string;
    png?: string;
    small?: string;
  };
  card_faces?: Array<{
    image_uris?: {
      normal?: string;
      large?: string;
      png?: string;
      small?: string;
    };
  }>;
};

async function checkIfCardExists(name: string) {
  const url = `https://api.scryfall.com/cards/named?exact=${name}`;

  const response = await fetch(url);

  if (!response) {
    return undefined;
  } else {
    return response;
  }
}

function pickImageUrl(s: ScryfallNamedResponse): string | null {
  // carta normal
  const direct =
    s.image_uris?.normal ??
    s.image_uris?.png ??
    s.image_uris?.large ??
    s.image_uris?.small;
  if (direct) return direct;

  // cartas “dupla face” (modal/transform etc)
  const face = s.card_faces?.[0]?.image_uris;
  const fromFace = face?.normal ?? face?.png ?? face?.large ?? face?.small;
  return fromFace ?? null;
}

export class CardsService {
  // Receive the repository in the constructor
  constructor(
    private repo: CardsRepository,
    private deckRepo: DeckRepository,
  ) {}

  private chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  private getImageUrlFromScryfallCard(card: any): string | null {
    // normal cards
    if (card?.image_uris?.normal) return card.image_uris.normal;

    // double-faced / split / etc.
    const face0 = card?.card_faces?.[0];
    if (face0?.image_uris?.normal) return face0.image_uris.normal;

    return null;
  }

  private async fetchScryfallImagesByNameAndSet(
    pairs: Array<{ name: string; set: string }>,
  ) {
    // /cards/collection aceita até 75 identifiers por request
    const batches = this.chunk(
      pairs.map((p) => ({ name: p.name, set: p.set.toLowerCase() })),
      75,
    );

    const imageMap = new Map<string, string>();
    const notFound: Array<{ name: string; set: string }> = [];

    for (const identifiers of batches) {
      const resp = await fetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifiers }),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(
          `Scryfall error: ${resp.status} ${resp.statusText} ${text}`,
        );
      }

      const data = await resp.json();

      // cards encontrados
      for (const card of data?.data ?? []) {
        const set = String(card?.set ?? "").toUpperCase(); // scryfall retorna lower
        const name = String(card?.name ?? "");
        const key = `${name.toLowerCase()}__${set}`;
        const imageUrl = this.getImageUrlFromScryfallCard(card);

        if (imageUrl) imageMap.set(key, imageUrl);
      }

      // cards não encontrados (quando disponível)
      for (const nf of data?.not_found ?? []) {
        const set = String(nf?.set ?? "").toUpperCase();
        const name = String(nf?.name ?? "");
        if (name && set) notFound.push({ name, set });
      }
    }

    return { imageMap, notFound };
  }

  findAll() {
    return this.repo.findAllInDatabase();
  }

  async findByFilter(
    deckId: string,
    name: string | undefined,
    filter: CardFilter,
  ) {
    if (filter == "all") {
      const cards = await this.repo.findByName(deckId, name);
      const commander_card_id = await this.deckRepo.findCommanderCardId(deckId);

      const data = { commander_card_id, cards };
      return data;
    }

    if (filter == "own") {
      const cards = await this.repo.findByNameAndOwnership(deckId, name, true);
      const commander_card_id = await this.deckRepo.findCommanderCardId(deckId);

      const data = { commander_card_id, cards };
      return data;
    }

    // missing
    const cards = await this.repo.findByNameAndOwnership(deckId, name, false);
    const commander_card_id = await this.deckRepo.findCommanderCardId(deckId);

    const data = { commander_card_id, cards };
    return data;
  }

  findByOwnership(status: boolean) {
    return this.repo.findByOwnership(status);
  }

  findById(id: string) {
    return this.repo.findById(id);
  }

  async checkIfCartExistsBeforeSaving(name: string) {
    const check = await checkIfCardExists(name);
    return check;
  }

  findByName(deckId: string, name: string) {
    return this.repo.findByName(deckId, name);
  }

  deleteCard(id: string) {
    return this.repo.deleteCard(id);
  }

  updateOwnership(id: string, own: boolean) {
    return this.repo.updateOwnByName(id, own);
  }

  async findCardByName(name: string) {
    const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(
      name,
    )}`;

    const resp = await fetch(url);

    if (!resp.ok) {
      return false;
    } else {
      return true;
    }
  }

  async deleteAllCards() {
    return this.repo.deleteAllCards();
  }

  async createCard(data: CreateCardDTO) {
    const deckExists = await this.deckRepo.findDeckById(data.deckId);
    if (!deckExists) throw new Error("Deck not found");

    // Search for the card image
    const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(data.name)}`;

    const resp = await fetch(url);

    // If no image is available in the Scryfall API
    if (!resp.ok) {
      const payload = {
        ...data,
        image_url: "not_available",
      };
      return this.repo.createCard(payload);
    }

    const scryfall: ScryfallNamedResponse = await resp.json();

    const imageUrl = scryfall.image_uris?.normal ?? "not_available";

    const payload = {
      ...data,
      image_url: imageUrl,
    };

    const deckData = await this.deckRepo.checkMaxCardsandCurrentCards(
      data.deckId,
    );

    if (!deckData || deckData.cards_max === undefined) {
      throw new Error("Deck not found");
    }

    if (deckData.cardCount + 1 > deckData.cards_max) {
      throw new errorClass(
        `Deck limit exceeded. Current cards ${deckData.cardCount} - max of cards: ${deckData.cards_max}`,
        409,
      );
    }

    return this.repo.createCard(payload);
  }

  async findCardsByDeck(id: string) {
    // Check if deck exists before searching for it
    const deckExists = await this.deckRepo.findDeckById(id);

    if (deckExists == null) {
      throw new Error("Deck not found");
    }

    const cards = await this.repo.findCardsByDeck(id);
    return cards;
  }

  async updateAllCardsOwnership(deckId: string, own: boolean) {
    const deckExists = await this.deckRepo.findDeckById(deckId);

    if (deckExists == null) {
      throw new Error("Deck not found");
    }

    const updatedCards = await this.repo.updateAllCardsOwnership(deckId, own);
    return updatedCards;
  }
}
