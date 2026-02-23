import { Router } from "express";
import { cardsRoutes } from "./cards.routes";

export const routes = Router();

// All /users endpoints
routes.use("/cards", cardsRoutes());

// Healthcheck endpoint (useful for monitoring)
routes.get("/health-check", (_req, res) => res.json({ ok: true }));
