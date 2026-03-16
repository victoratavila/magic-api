import { Router } from "express";
import { CardsController } from "../controllers/cards.controller";
import { CardsRepository } from "../repositories/cards.repository";
import { CardsService } from "../services/cards.services";
import { DeckRepository } from "../repositories/decks.repository";
import { DeckService } from "../services/decks.services";
import { DeckController } from "../controllers/decks.controller";
import { UserController } from "../controllers/users.controller";
import { UserRepository } from "../repositories/users.repository";
import { UserService } from "../services/users.services";
import { authMiddleware } from "../middlewares/authMiddleware";
import { PasswordResetController } from "../controllers/passwordReset.controller";

export function cardsRoutes() {
  const router = Router();

  // Manual dependency injection:
  const cardsRepo = new CardsRepository();
  const decksRepo = new DeckRepository();
  const usersRepo = new UserRepository();

  const cardsService = new CardsService(cardsRepo, decksRepo);
  const decksService = new DeckService(decksRepo, cardsService);
  const usersService = new UserService(usersRepo);

  const cardsController = new CardsController(cardsService, decksService);
  const decksController = new DeckController(decksService, cardsService);
  const usersController = new UserController(usersService);

  const pwrResetController = new PasswordResetController();

  // User Routes
  router.get("/users", usersController.findAllUsers);
  router.post("/users", usersController.createUser);
  router.put(
    "/update/password",
    authMiddleware,
    usersController.updatePassword,
  );
  router.post("/auth/login", usersController.validateUser);
  router.post("/forgot-password", pwrResetController.forgotPassword);
  router.post("/complete/reset-password", pwrResetController.resetPassword);

  // Card Routes
  router.post("/", authMiddleware, cardsController.create); // Create
  router.get("/", authMiddleware, cardsController.list); // List all cards regardless of their decks
  router.get("/ownership", cardsController.findByOwnership);
  router.put("/:id", cardsController.updateOwnership); // Update card ownership by id
  router.delete("/:id", cardsController.delete); // Delete card by id
  router.get("/filter", authMiddleware, cardsController.findByFilter); // Search cards by deck, ownership status and card name
  router.put(
    "/bulk/update",
    authMiddleware,
    cardsController.updateAllCardsOwnership,
  );
  router.get("/bring/sets", cardsController.bringCardSets);
  router.get("/sets", cardsController.bringCardSets);
  router.put("/sets/update", cardsController.updateSetAndImageUrl);

  // Deck Routes
  router.get("/decks", authMiddleware, decksController.list);
  router.post("/decks", authMiddleware, decksController.create);
  router.get(
    "/find/deck/:deckId",
    authMiddleware,
    decksController.findDeckById,
  );
  router.get("/decks/:deckId", authMiddleware, cardsController.findCardsByDeck);
  router.get("/decks/stats/:deckId", authMiddleware, decksController.deckStats);
  router.delete("/decks/:deckId", authMiddleware, decksController.deleteDeck);
  router.delete(
    "/delete/all/deck/:deckId",
    authMiddleware,
    decksController.deleteAllCardsFromDeck,
  );
  router.put("/update/deck", authMiddleware, decksController.updateDeckInfo);
  router.post("/:deckId/bulk", authMiddleware, decksController.bulkAddCards);
  router.put(
    "/set/commander",
    authMiddleware,
    decksController.setCommanderCard,
  );
  router.get("/export", authMiddleware, decksController.exportCardList);

  return router;
}
