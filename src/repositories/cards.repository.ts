import { prisma } from "../db/prisma";
import { Prisma } from "@prisma/client";
import { CreateCardDTO } from "../dtos/card.dto";

// DTOs (Data Transfer Objects): the shapes we expect for input data.

export type CreateCardInput = {
  deckId: string;
  name: string;
  set?: string | null;
  own?: boolean;
  image_url?: string | null;
};

export class CardsRepository {
  async createMany(cards: Prisma.CardCreateManyInput[]) {
    return prisma.card.createMany({
      data: cards,
      skipDuplicates: true, // precisa de @@unique([name, set]) no schema.prisma
    });
  }

  // These the methods (functions) from the class, that the controller will call
  findAllInDatabase() {
    return prisma.card.findMany({
      orderBy: {
        id: "asc",
      },
    });
  }

  findByOwnership(own: boolean) {
    return prisma.card.findMany({
      orderBy: {
        id: "asc",
      },
      where: {
        own: own,
      },
    });
  }

  findByNameAndOwnership(
    deckId: string,
    name: string | undefined,
    own: boolean,
  ) {
    return prisma.card.findMany({
      orderBy: { id: "asc" },
      where: {
        deckId,
        own,
        ...(name && name.trim()
          ? {
              name: {
                contains: name.trim(),
                mode: "insensitive",
              },
            }
          : {}),
      },
    });
  }

  async bulkAddCards(cards: CreateCardInput[]) {
    return prisma.card.createMany({
      data: cards,
    });
  }

  findByName(deckId: string, name?: string) {
    return prisma.card.findMany({
      orderBy: { id: "asc" },
      where: {
        deckId,

        ...(name?.trim()
          ? {
              name: {
                contains: name.trim(),
                mode: "insensitive",
              },
            }
          : {}),
      },
    });
  }

  findById(id: string) {
    return prisma.card.findUnique({
      where: { id: id },
    });
  }

  async createCard(data: CreateCardDTO) {
    return prisma.card.create({ data });
  }

  // cards.repository.ts

  async updateOwnByName(id: string, own: boolean) {
    return prisma.card.update({
      where: { id: id },
      data: { own: own },
    });
  }

  async deleteCard(id: string) {
    return prisma.card.delete({
      where: { id: id },
    });
  }

  async deleteAllCards() {
    return prisma.card.deleteMany({});
  }

  async findCardsByDeck(deckId: string) {
    return await prisma.card.findMany({
      where: {
        deckId: deckId,
      },
    });
  }

  async updateAllCardsOwnership(deckId: string, own: boolean) {
    return await prisma.card.updateMany({
      where: {
        deckId: deckId,
      },

      data: {
        own: own,
      },
    });
  }
}
