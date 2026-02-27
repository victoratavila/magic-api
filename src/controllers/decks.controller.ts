import { Request, Response } from "express";
import { DeckService } from "../services/decks.services";
import { createDeckDTO } from "../dtos/deck.dto";
import { deckIdParamSchema } from "../dtos/deck.id.dto";
import z from "zod";
import { updateDeckDTO } from "../dtos/update.deck.dto";

import { DeckLimitExceededError } from "../services/decks.services";

const bodySchema = z.object({
  bulkText: z.string().min(1),
  ownDefault: z.boolean().optional(),
  fetchImages: z.boolean().optional(),
});

export class DeckController {
  constructor(private service: DeckService) {}

  list = async (req: Request, res: Response) => {
    const deckList = await this.service.findAllDecks();
    return res.json(deckList);
  };

  deleteAllCardsFromDeck = async (req: Request, res: Response) => {
    try {
      const { deckId } = deckIdParamSchema.parse(req.params);

      if (!deckId) {
        res.status(400).json({ Error: "please provide deckId" });
      } else {
        const deletedCards = await this.service.deleteAllCardsFromDeck(deckId);

        return res.status(200).json({
          success: true,
          message: "All deck cards successfully deleted",
          deleted: deletedCards,
        });
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Invalid deckId format",
        });
      }
    }
  };

  deleteDeck = async (req: Request, res: Response) => {
    const { deckId } = req.params;

    if (!deckId) {
      res.status(400).json({
        Error: "Please provide the id of the deck you would like to delete",
      });
    } else {
      try {
        const deletedDeck = await this.service.deleteDeck(deckId);
        return res.json(deletedDeck);
      } catch (error: any) {
        if (error.message === "Deck not found") {
          return res.status(404).json({
            success: false,
            error: "Deck not found",
          });
        }
      }
    }
  };

  create = async (req: Request, res: Response) => {
    const data = createDeckDTO.safeParse(req.body);

    if (data.error) {
      res.status(400).json(data.error);
    } else {
      const deckAlreadyExists = await this.service.deckAlreadyExists(
        data.data.name,
      );

      if (deckAlreadyExists.length != 0) {
        res.status(400).json({
          error: `Deck ${data.data.name} already exists`,
        });
      } else {
        const createdDeck = await this.service.createDeck(data.data);
        res.status(201).json({
          success: `Deck ${data.data.name} successfully registered`,
          deckData: createdDeck,
        });
      }

      try {
      } catch (error: any) {
        res.json(error);
      }
    }
  };

  updateDeckInfo = async (req: Request, res: Response) => {
    try {
      const { deckId, name, cards_max } = updateDeckDTO.parse(req.body);
      const deck = await this.service.findDeckById(deckId);

      if (!deck) return res.status(404).json({ message: "Deck not found" });

      const data: { name?: string; cards_max?: number } = {};
      if (name !== undefined) data.name = name;
      if (cards_max !== undefined) data.cards_max = cards_max;

      const updated = await this.service.updateDeckInfo(deckId, data);
      return res.status(200).json(updated);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.message });
      }
      return res.status(500).json({ message: "UNKNOWN_ERROR" });
    }
  };

  bulkAddCards = async (req: Request, res: Response) => {
    try {
      const deckId = z.string().uuid().parse(req.params.deckId);

      // ✅ CASO 1: body é texto puro (text/plain)
      if (typeof req.body === "string") {
        const result = await this.service.bulkAddCards({
          deckId,
          bulkText: req.body,
        });

        return res.status(201).json(result);
      }

      // ✅ CASO 2: body é JSON
      const body = bodySchema.parse(req.body);

      const payload = {
        deckId,
        bulkText: body.bulkText,
        ...(body.ownDefault !== undefined
          ? { ownDefault: body.ownDefault }
          : {}),
        ...(body.fetchImages !== undefined
          ? { fetchImages: body.fetchImages }
          : {}),
      };

      const result = await this.service.bulkAddCards(payload);

      return res.status(201).json(result);
    } catch (err) {
      if (err instanceof DeckLimitExceededError) {
        return res.status(400).json({
          error: "Deck cards limit exceeded.",
          details: err.details,
        });
      }

      if (err instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid request.", details: err.flatten() });
      }

      return res.status(500).json({ error: "Internal server error." });
    }
  };
}
