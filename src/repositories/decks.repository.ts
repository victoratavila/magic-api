import { prisma } from "../db/prisma";
import { Prisma } from "@prisma/client";

// DTOs (Data Transfer Objects): the shapes we expect for input data.
import { createDeckDTO } from "../dtos/deck.dto";

export type UpdateDeckData = {
  name?: string;
  cards_max?: number;
};

export class DeckRepository {
  findAllDecks = async () => {
    const decks = await prisma.deck.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        cards_max: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            cards: true,
          },
        },
      },
    });

    return decks.map((deck) => ({
      id: deck.id,
      name: deck.name,
      total_cards: deck._count.cards,
      cards_max: deck.cards_max,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    }));
  };

  async deleteDeck(id: string) {
    const deletedDeck = await prisma.deck.delete({
      where: { id: id },
    });

    return deletedDeck;
  }

  async createDeck(data: createDeckDTO) {
    return prisma.deck.create({ data });
  }

  async deckAlreadyExists(name: string) {
    const deck = prisma.deck.findMany({
      where: {
        name: name,
      },
    });

    return deck;
  }

  async findDeckById(id: string) {
    return await prisma.deck.findUnique({ where: { id } }); // retorna Deck | null
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

  async deleteAllCardsFromDeck(deckId: string) {
    // 1. buscar os cards
    const cards = await prisma.card.findMany({
      where: { deckId },
    });

    // 2. deletar
    await prisma.card.deleteMany({
      where: { deckId },
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

  updateDeckInfo(id: string, data: UpdateDeckData) {
    return prisma.deck.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.cards_max !== undefined ? { cards_max: data.cards_max } : {}),
      },
    });
  }
}
