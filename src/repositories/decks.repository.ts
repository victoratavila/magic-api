import { prisma } from "../db/prisma";
import { Prisma } from "@prisma/client";

// DTOs (Data Transfer Objects): the shapes we expect for input data.
import { createDeckDTO } from "../dtos/deck.dto";


export class DeckRepository {
    
    findAllDecks(){
        return prisma.deck.findMany({ orderBy: { updatedAt: 'desc'}})
    }

    async deleteDeck(id: string){
    const deletedDeck = await prisma.card.delete({
        where: { id: id}
    })

    return deletedDeck;
}

    async createDeck(data: createDeckDTO){
        return prisma.deck.create({data})
    }

    async deckAlreadyExists(name: string){
        const deck = prisma.deck.findMany({
            where: {
                name: name
            }
        })

        return deck;
    }
}