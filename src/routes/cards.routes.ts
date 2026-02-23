// Routes = map HTTP paths to controller actions.

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
  const cardsRepo = new CardsRepository()
  const cardsService = new CardsService(cardsRepo)
  const cardsController = new CardsController(cardsService);

  const decksRepo = new DeckRepository()
  const decksService = new DeckService(decksRepo)
  const decksController = new DeckController(decksService);
  

  // CRUD endpoints
  router.post("/", cardsController.create);     // Create
  router.get("/", cardsController.list);        // Read all (list)
  router.get("/name/:name", cardsController.findByName)
  router.get("/ownership", cardsController.findByOwnership);
  router.get("/exists/:name", cardsController.cardExists)
  router.put("/:id", cardsController.updateOwnership);   // Update
  router.delete("/:id", cardsController.delete);// Delete
  router.get("/filter", cardsController.findByFilter)
  router.delete("/delete/all", cardsController.deleteAllCards);
  router.post("/bulk-add", cardsController.importFromText);

  router.get("/decks", decksController.list);
  router.post("/decks", decksController.create);


  return router;
}
