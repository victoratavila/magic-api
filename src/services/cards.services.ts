// Service layer = business rules and orchestration.
// It "decides" behavior (e.g., 404 if user does not exist)
// and uses the repository for DB operations.

import { CreateCardDTO } from "../dtos/card.dto";
import { CardsRepository } from "../repositories/cards.repository";
import { Prisma } from "@prisma/client";
import { DeckRepository } from "../repositories/decks.repository";
import { errorClass } from "../utils/errorClass";
import { boolean } from "zod/v4";

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
    page: number,
    limit: number,
  ) {
    const commander_card_id = await this.deckRepo.findCommanderCardId(deckId);

    let cards;

    if (filter === "all") {
      cards = await this.repo.findByName(deckId, name, page, limit);
    } else if (filter === "own") {
      cards = await this.repo.findByNameAndOwnership(
        deckId,
        name,
        true,
        page,
        limit,
      );
    } else {
      cards = await this.repo.findByNameAndOwnership(
        deckId,
        name,
        false,
        page,
        limit,
      );
    }

    return {
      commander_card_id,
      pagination: {
        total: cards.total,
        page: cards.page,
        limit: cards.limit,
        totalPages: cards.totalPages,
      },
      data: cards.data,
    };
  }

  findByOwnership(status: boolean) {
    return this.repo.findByOwnership(status);
  }

  findCardById(id: string) {
    return this.repo.findCardById(id);
  }

  async checkIfCartExistsBeforeSaving(name: string) {
    const check = await checkIfCardExists(name);
    return check;
  }

  findByName(deckId: string, name: string, page: number, limit: number) {
    return this.repo.findByName(deckId, name, page, limit);
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

  async createCard(userId: string, data: CreateCardDTO) {
    const deckExists = await this.deckRepo.findDeckById(userId, data.deckId);
    if (!deckExists) throw new Error("Deck not found");

    // Search for the card image
    const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(data.name)}&set=${data.set}`;

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

  async findCardsByDeck(
    userId: string,
    id: string,
    page: number,
    limit: number,
  ) {
    // Check if deck exists before searching for it
    const deckExists = await this.deckRepo.findDeckById(userId, id);

    if (deckExists == null) {
      throw new Error("Deck not found");
    }

    const cards = await this.repo.findCardsByDeck(id, page, limit);
    return cards;
  }

  async findCardsToExport(userId: string, id: string, filter: string) {
    // Check if deck exists before searching for it
    const deckExists = await this.deckRepo.findDeckById(userId, id);

    if (deckExists == null) {
      throw new Error("Deck not found");
    }

    if (filter == "all") {
      const cards = await this.repo.exportAllCards(id);
      return cards;
    }

    if (filter == "own") {
      const cards = await this.repo.exportAllOwnCards(id);
      return cards;
    }

    if (filter == "missing") {
      const cards = await this.repo.exportAllMissingCards(id);
      return cards;
    }
  }

  async updateAllCardsOwnership(userId: string, deckId: string, own: boolean) {
    const deckExists = await this.deckRepo.findDeckById(userId, deckId);

    if (deckExists == null) {
      throw new Error("Deck not found");
    }

    const updatedCards = await this.repo.updateAllCardsOwnership(deckId, own);
    return updatedCards;
  }

  async bringCardSets(card_current_name: string, cardId: string) {
    // Check if card exists
    const card = await this.repo.findCardById(cardId);

    if (card == null || card == undefined) {
      throw new Error(
        "No card found matching the provided id, please privide a new one",
      );
    }

    const scryfallResponse = await fetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card_current_name)}`,
    ).then((r) => r.json());

    const prints = await fetch(scryfallResponse.prints_search_uri).then((r) =>
      r.json(),
    );

    return prints.data.map((p: any) => ({
      set: p.set,
      set_name: p.set_name,
      image:
        p.image_uris?.normal ?? p.card_faces?.[0]?.image_uris?.normal ?? null,
    }));
  }

  async updateSetAndImageUrl(
    card_current_name: string,
    cardId: string,
    new_set_name: string,
    new_image_url: string,
  ) {
    const cardSets = await this.bringCardSets(card_current_name, cardId);
    const response = cardSets.find((card: any) => card.set === new_set_name);

    if (!response) {
      throw new Error(
        `No result matching the set ${new_set_name}, please try a different one`,
      );
    } else {
      const updatedCard = this.repo.updateCardImageAndSet(
        cardId,
        new_image_url,
        new_set_name.toUpperCase(),
      );

      return updatedCard;
    }

    // const updatedCard = await this.repo.updateCardImageAndSet(data);
    // return updatedCard;
  }
}
