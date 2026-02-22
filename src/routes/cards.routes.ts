// Routes = map HTTP paths to controller actions.

import { Router } from "express";
import { CardsController } from "../controllers/cards.controller";
import { CardsRepository } from "../repositories/cards.repository";
import { CardsService } from "../services/cards.services";

export function cardsRoutes() {
  const router = Router();

  // Manual dependency injection:
  const repo = new CardsRepository()
  const service = new CardsService(repo)
  const controller = new CardsController(service);

  // CRUD endpoints
  router.post("/", controller.create);     // Create
  router.get("/", controller.list);        // Read all (list)
  router.get("/name/:name", controller.findByName)
router.get("/ownership", controller.findByOwnership);
  router.get("/exists/:name", controller.cardExists)
  router.put("/:id", controller.updateOwnership);   // Update
  router.delete("/:id", controller.delete);// Delete

  return router;
}
