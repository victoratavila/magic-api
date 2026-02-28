import { Router } from "express";
import { CardsController } from "../controllers/cards.controller";
import { CardsRepository } from "../repositories/cards.repository";
import { CardsService } from "../services/cards.services";
import { DeckRepository } from "../repositories/decks.repository";
import { DeckService } from "../services/decks.services";
import { DeckController } from "../controllers/decks.controller";

export function cardsRoutes() {
  const router = Router();

  // Manual dependency injection:
  const cardsRepo = new CardsRepository();
  const decksRepo = new DeckRepository();

  const cardsService = new CardsService(cardsRepo, decksRepo);
  const decksService = new DeckService(decksRepo);

  const cardsController = new CardsController(cardsService, decksService);
  const decksController = new DeckController(decksService, cardsService);

  // Card Routes
  router.post("/", cardsController.create); // Create
  router.get("/", cardsController.list); // List all cards regardless of their decks
  router.get("/ownership", cardsController.findByOwnership);
  router.put("/:id", cardsController.updateOwnership); // Update card ownership by id
  router.delete("/:id", cardsController.delete); // Delete card by id
  router.get("/filter", cardsController.findByFilter); // Search cards by deck, ownership status and card name
  router.put("/bulk/update", cardsController.updateAllCardsOwnership);

  // Deck Routes
  router.get("/decks", decksController.list);
  router.post("/decks", decksController.create);
  router.get("/find/deck/:deckId", decksController.findDeckById);
  router.get("/decks/:deckId", cardsController.findCardsByDeck);
  router.delete("/decks/:deckId", decksController.deleteDeck);
  router.delete(
    "/delete/all/deck/:deckId",
    decksController.deleteAllCardsFromDeck,
  );
  router.put("/update/deck", decksController.updateDeckInfo);
  router.post("/:deckId/bulk", decksController.bulkAddCards);
  router.put("/set/commander", decksController.setCommanderCard);

  return router;
}
