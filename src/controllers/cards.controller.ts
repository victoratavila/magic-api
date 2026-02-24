import { Request, Response } from "express";
import { CardsService } from "../services/cards.services";
import { CreateCardDTO } from "../dtos/card.dto";
import { ZodError, z } from "zod";
import { Prisma } from "@prisma/client";
import { DeckController } from "./decks.controller";
import { DeckService } from "../services/decks.services";
import { deckIdParamSchema } from "../dtos/deck.id.dto";

const filterSchema = z.object({
  name: z.string().min(1),
  filter: z.enum(["all", "own", "missing"]).default("all"),
});

export class CardsController {
    constructor(private service: CardsService, private deckService: DeckService){}

  //   importFromText = async (req: Request, res: Response) => {
  //   const text = typeof req.body === "string" ? req.body : req.body?.text;

  //   if (typeof text !== "string" || !text.trim()) {
  //     return res.status(400).json({ message: "Campo 'text' é obrigatório" });
  //   }

  //   const result = await this.service.importFromText(text);

  //   if (!result.ok) {
  //     return res.status(400).json({
  //       message: "Falha ao importar",
  //       totalLines: result.totalLines,
  //       errors: result.errors,
  //     });
  //   }

  //   return res.status(201).json({
  //     message: "Import concluído",
  //     totalLines: result.totalLines,
  //     created: result.created,
  //   });
  // };


    list = async (req: Request, res: Response) => {

        const cardList = await this.service.findAll();
        return res.json(cardList)

    }

   findCardsByDeck = async (req: Request, res: Response) => {
  try {

    const { deckId } = deckIdParamSchema.parse(req.params);

    const cards = await this.service.findCardsByDeck(deckId);

    return res.status(200).json({
      deckId: deckId,
      success: true,
      cards,
    });

  } catch (error: any) {

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid deckId format"
      });
    }

    if (error.message === "Deck not found") {
      return res.status(404).json({
        success: false,
        error: "Deck not found"
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal error"
    });

  }
};

    

    cardExists = async (req: Request, res: Response) => {
      const { name } = req.params;

      if(!name) {
        res.status(400).json({
          'Error': 'please provide a name to check if a card existss'
        })
      } else {
          const cardExists = await this.service.cardExists(name)
          res.json(cardExists)
      }
      
    }

     findByFilter = async (req: Request, res: Response) => {
    try {
      const { name, filter } = filterSchema.parse(req.query);

      const cards = await this.service.findByFilter(name, filter);

      return res.status(200).json(cards);
    } catch {
      return res.status(400).json({
        error: "Use ?name=...&filter=all|own|missing",
      });
    }
  };

  deleteAllCards = async (req: Request, res: Response) => {
    try {
      const deletedCards = await this.service.deleteAllCards();
      
      res.json({
        "success": "All of the cards were successfully deleted",
        "deleted_cards": deletedCards
      })
    } catch(err) {
      res.status(500).json(err)
    }
  }

    findByName = async (req: Request, res: Response) => {
      const { name } = req.params;

      if(!name){
        res.status(400).json({
          "Error": "Please provide the name of the card you would like to find"
        })
      } else {

      const findCard = await this.service.findByName(name);
      return res.json(findCard);
      } 
    }

    delete = async (req: Request, res: Response) => {

      const { id } = req.params;

      if(!id){
        res.status(400).json({
          "Error": "Please provide the id of the card you would like to delete"
        })
      } else {

        // Check if card exists
      const card = await this.service.findById(id)
      if(card == null || card == undefined){
        return res.status(404).json({
          "error": `No card was found matching the id ${id}` 
        })
      } else {
        const deletedCard = await this.service.deleteCard(id);
        return res.json(deletedCard)
      }
       
      }
      
    }

    updateOwnership = async (req: Request, res: Response) => {

      const { own } = req.body;
      const { id } = req.params;
      if(id == undefined || own == undefined ) {

        res.status(400).json({
          "Error": "Please provide card name and the new own information"
        })

      } else {

      // Check if card exists
      const card = await this.service.findById(id)
      if(card == null || card == undefined){
        return res.status(404).json({
          "error": `No card was found matching the id ${id}` 
        })
      } else {
        const updateOwnership = await this.service.updateOwnership(id, own)
        return res.json(updateOwnership)
      }

      }

        
    }


findByOwnership = async (req: Request, res: Response) => {
  // 1. Pegamos do req.query (pois o front envia ?own=...)
  const { own } = req.query;

  // 2. Convertemos a string para booleano de forma segura
  const isTrue = own === 'true';
  const isFalse = own === 'false';

  // 3. Validamos se o valor enviado é válido
  if (!isTrue && !isFalse) {
    return res.status(400).json({
      "Error": "Please provide card ownership information to search (true or false)"
    });
  }

  // 4. Passamos o valor booleano real para o serviço
  const statusToSearch = isTrue; // Se for 'true', statusToSearch é true. Caso contrário, false.
  
  try {
    const cards = await this.service.findByOwnership(statusToSearch);
    return res.status(200).json(cards);
  } catch (error) {
    return res.status(500).json({ "Error": "Internal server error" });
  }
}

create = async (req: Request, res: Response) => {
  try {
    const data = CreateCardDTO.parse(req.body);
    const cardExists = await this.service.cardExists(data.name);

    if(cardExists == false) {
      return res.status(404).json({
        'error': `No card was found matching the provided name, please try with a different one` 
      })
    } 

    const createdCard = await this.service.createCard(data);

    return res.status(201).json({
      success: true,
      card_created: createdCard,
    });

  } catch (error: any) {

  if (error.message === "Deck not found") {

    return res.status(404).json({
      success: false,
      error: "Deck not found. A card can only be created if the target deck exists."
    });

  }

    // Erro de validação (DTO)
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: error.errors,
      });
    }

    // Erro conhecido do Prisma (banco)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique violation
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          error: "Duplicate value (unique constraint)",
          details: error.meta, // geralmente mostra quais campos
        });
      }

      return res.status(400).json({
        success: false,
        error: "Database request error",
        details: { code: error.code, message: error.message },
      });
    }

    // Qualquer outro erro
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: String(error?.message ?? error),
    });
  }
};
}