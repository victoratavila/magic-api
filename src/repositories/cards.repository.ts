import { prisma } from "../db/prisma";

// DTOs (Data Transfer Objects): the shapes we expect for input data.
export type createCardDTO = { name: string; set: string, image_url: string , own: boolean};
export type updateCardDTO = { name?: string; set?: string, image_url?: string , own?: boolean};

export class CardsRepository {

    // These the methods (functions) from the class, that the controller will call
    findAllInDatabase(){
        return prisma.card.findMany({ orderBy: { createdAt: 'desc'}})
    }

    findByOwnership(own: boolean){
        return prisma.card.findMany({
            where: {
                own: own
            }
        })
    }

    async findByName(name: string){
        return prisma.card.findMany({
            where: {
                name: {
                contains: name,
                mode: "insensitive"
                }
  }
        })
    }

     findById(id: string){
        return prisma.card.findUnique({
            where: {id: id}
        })
    }

    async createCard(data: createCardDTO) {
    return prisma.card.create({ data });
    }

    // cards.repository.ts

async updateOwnByName(id: string, own: boolean) {

    return prisma.card.update({
    where: { id : id},
    data: { own: own }
    });

}

async deleteCard(id: string){
    return prisma.card.delete({
        where: { id: id}
    })
}
}