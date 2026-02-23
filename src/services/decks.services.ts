import { Prisma } from "@prisma/client";
import { DeckRepository } from "../repositories/decks.repository";
import { createCardDTO } from "../repositories/cards.repository";
import { createDeckDTO } from "../dtos/deck.dto";

export class DeckService {
    constructor(private repo: DeckRepository){}

    findAllDecks(){
    return this.repo.findAllDecks();
  }

  deleteDeck(id: string){
    return this.repo.deleteDeck(id);
  }

  createDeck(name: createDeckDTO){
    return this.repo.createDeck(name);
  }

  deckAlreadyExists(name: string){
    return this.repo.deckAlreadyExists(name);
  }
}