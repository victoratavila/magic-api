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

  async findByNameAndOwnership(
    deckId: string,
    name: string | undefined,
    own: boolean,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.CardWhereInput = {
      deckId,
      own,
      ...(name?.trim()
        ? {
            name: {
              contains: name.trim(),
              mode: "insensitive",
            },
          }
        : {}),
    };

    const [cards, total] = await prisma.$transaction([
      prisma.card.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.card.count({ where }),
    ]);

    return {
      data: cards,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async bulkAddCards(cards: CreateCardInput[]) {
    return prisma.card.createMany({
      data: cards,
    });
  }

  async findByName(
    deckId: string,
    name: string | undefined,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.CardWhereInput = {
      deckId,
      ...(name?.trim()
        ? {
            name: {
              contains: name.trim(),
              mode: "insensitive",
            },
          }
        : {}),
    };

    const [cards, total] = await prisma.$transaction([
      prisma.card.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.card.count({ where }),
    ]);

    return {
      data: cards,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findCardById(id: string) {
    return await prisma.card.findUnique({
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
  // repository
  async findCardsByDeck(deckId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [cards, total] = await prisma.$transaction([
      prisma.card.findMany({
        where: {
          deckId,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.card.count({
        where: {
          deckId,
        },
      }),
    ]);

    return {
      data: cards,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async exportAllCards(deckId: string) {
    const cards = await prisma.card.groupBy({
      by: ["name", "set"],
      where: { deckId },
      _count: { _all: true },
      orderBy: { name: "asc" },
    });

    return cards.map((row) => ({
      name: row.name,
      set: row.set,
      amount: row._count._all,
    }));
  }

  async exportAllOwnCards(deckId: string) {
    const cards = await prisma.card.groupBy({
      by: ["name", "set"],
      where: { deckId, own: true },
      _count: { _all: true },
      orderBy: { name: "asc" },
    });

    return cards.map((row) => ({
      name: row.name,
      set: row.set,
      amount: row._count._all,
    }));
  }

  async exportAllMissingCards(deckId: string) {
    const cards = await prisma.card.groupBy({
      by: ["name", "set"],
      where: { deckId, own: false },
      _count: { _all: true },
      orderBy: { name: "asc" },
    });

    return cards.map((row) => ({
      name: row.name,
      set: row.set,
      amount: row._count._all,
    }));
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

  async updateCardImageAndSet(
    card_id: string,
    new_image_url: string,
    new_set_name: string,
  ) {
    return await prisma.card.update({
      where: {
        id: card_id,
      },

      data: {
        image_url: new_image_url,
        set: new_set_name,
      },
    });
  }
}
