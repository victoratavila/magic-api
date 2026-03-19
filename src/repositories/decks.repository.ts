import { prisma } from "../db/prisma";

// DTOs (Data Transfer Objects): the shapes we expect for input data.
import { createDeckDTO } from "../dtos/deck.dto";

export type UpdateDeckData = {
  name?: string;
  cards_max?: number;
};

export class DeckRepository {
  findAllDecks = async (userId: string) => {
    const decks = await prisma.deck.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        user_id: true,
        name: true,
        cards_max: true,
        commander_card_id: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            cards: true,
          },
        },
      },

      where: {
        user_id: userId,
      },
    });

    return decks.map((deck) => ({
      id: deck.id,
      user_id: deck.user_id,
      name: deck.name,
      total_cards: deck._count.cards,
      cards_max: deck.cards_max,
      commander_card_id: deck.commander_card_id,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    }));
  };

  async deleteDeck(userId: string, deckId: string) {
    const deletedDeck = await prisma.deck.delete({
      where: { id: deckId, user_id: userId },
    });

    return deletedDeck;
  }

  async createDeck(data: createDeckDTO, userId: string) {
    return prisma.deck.create({
      data: {
        ...data,
        user_id: userId,
      },
    });
  }

  async deckAlreadyExists(name: string, userId: string) {
    const deck = prisma.deck.findMany({
      where: {
        name: name,
        user_id: userId,
      },
    });

    return deck;
  }

  async findDeckById(userId: string, deckId: string) {
    return await prisma.deck.findUnique({
      where: { id: deckId, user_id: userId },
    }); // retorna Deck | null
  }

  async checkMaxCardsandCurrentCards(deckId: string) {
    const cardCount = await prisma.card.count({
      where: { deckId },
    });

    const card_max = await prisma.deck.findUnique({
      where: {
        id: deckId,
      },
      select: {
        name: true,
        cards_max: true,
      },
    });

    const object = {
      cardCount,
      ...card_max,
    };

    return object;
  }

  async deleteAllCardsFromDeck(userId: string, deckId: string) {
    // 1. buscar os cards
    const cards = await prisma.card.findMany({
      where: { deckId: deckId },
    });

    // 2. deletar
    await prisma.card.deleteMany({
      where: { deckId: deckId },
    });

    // 3. retornar os dados deletados
    return cards;
  }

  async findDeckByName(name: string) {
    const deckName = await prisma.deck.findMany({
      where: {
        name: name,
      },
    });

    if (deckName.length > 0) {
      throw new Error(
        "A deck with this name already exists, please choose a different name",
      );
    } else {
      return null;
    }

    return;
  }

  updateDeckInfo(userId: string, id: string, data: UpdateDeckData) {
    return prisma.deck.update({
      where: { id: id, user_id: userId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.cards_max !== undefined ? { cards_max: data.cards_max } : {}),
      },
    });
  }

  setCommanderCard(deckId: string, card_id: string) {
    return prisma.deck.update({
      where: {
        id: deckId,
      },
      data: {
        commander_card_id: card_id,
      },
    });
  }

  async findCommanderCardId(deckId: string) {
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
      select: {
        commander_card_id: true,
      },
    });

    return deck?.commander_card_id ?? null;
  }

  async deckStats(userId: string, deckId: string) {
    const [deck, total_cards, owned_cards] = await prisma.$transaction([
      prisma.deck.findUnique({
        where: { id: deckId, user_id: userId },
        select: {
          id: true,
          name: true,
          cards_max: true,
        },
      }),
      prisma.card.count({
        where: { deckId },
      }),
      prisma.card.count({
        where: {
          deckId,
          own: true,
        },
      }),
    ]);

    if (!deck) {
      throw new Error("Deck not found");
    }

    return {
      id: deck.id,
      name: deck.name,
      cards_max: deck.cards_max,
      total_cards,
      owned_cards,
      missing_cards: total_cards - owned_cards,
    };
  }
}
