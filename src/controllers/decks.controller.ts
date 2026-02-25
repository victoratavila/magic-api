import { Request, Response } from "express";
import { DeckService } from "../services/decks.services";
import { createDeckDTO } from "../dtos/deck.dto";

export class DeckController {
    constructor(private service: DeckService){}

    list = async (req: Request, res: Response) => {

        const deckList = await this.service.findAllDecks();
        return res.json(deckList)

    }

    deleteDeck = async (req: Request, res: Response) => {

        const { deckId } = req.params;

        if(!deckId) {
            res.status(400).json({"Error": "Please provide the id of the deck you would like to delete"})
        } else {

            try {
                const deletedDeck = await this.service.deleteDeck(deckId);
                return res.json(deletedDeck)    
                
            } catch(error: any) {

                if (error.message === "Deck not found") {
                return res.status(404).json({
                    success: false,
                    error: "Deck not found"
                });
            }
            }
            
        }

    }

        create = async (req: Request, res: Response) => {

            const data = createDeckDTO.safeParse(req.body);

            if(data.error){
                res.status(400).json(data.error)
            } else {

                const deckAlreadyExists = await this.service.deckAlreadyExists(data.data.name);

                if(deckAlreadyExists.length != 0){
                    res.status(400).json({
                    "error": `Deck ${data.data.name} already exists`,
                })
                } else {
                    const createdDeck = await this.service.createDeck(data.data)
                    res.status(201).json({
                    "success": `Deck ${data.data.name} successfully registered`,
                    "deckData": createdDeck
                })
                }

                
            try {
            

                } catch(error: any) {
                res.json(error)
              }
                
            }

           
    }   
}