import { Prisma } from "@prisma/client";
import { DeckRepository } from "../repositories/decks.repository";
// import { createCardDTO } from "../repositories/cards.repository";
import { createDeckDTO } from "../dtos/deck.dto";

export class DeckService {
    constructor(private repo: DeckRepository){}

  findAllDecks(){
    return this.repo.findAllDecks();
  }

  async deleteDeck(id: string){

    // Check if deck exists before searching for it
    const deckExists = await this.repo.findDeckById(id);

    if(deckExists == null){
      throw new Error('Deck not found');
    }
    
    return this.repo.deleteDeck(id);
  }

  createDeck(name: createDeckDTO){
    return this.repo.createDeck(name);
  }

  deckAlreadyExists(name: string){
    return this.repo.deckAlreadyExists(name);
  }

  findDeckById(id: string){
    return this.repo.findDeckById(id);
  }
  
  checkMaxCardsandCurrentCards(deckId: string){
    return this.repo.checkMaxCardsandCurrentCards(deckId)
  }
  
}