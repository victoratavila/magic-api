// Express app configuration.
// We separate `app` from `server` so it's easier to test later.

import express from "express";
import cors from "cors";
import { routes } from "./routes";
import { testDatabaseConnection } from "./db/prisma";
import "dotenv/config";

export const app = express();

// Allow requests from other origins (frontends, tools, etc.)
app.use(cors());

// Parse JSON bodies into req.body
app.use(express.text({ type: "text/plain", limit: "2mb" }));
app.use(express.json({ limit: "2mb" }));

// Register routes
app.use(routes);

async function startServer() {
  await testDatabaseConnection();
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  app.listen(8080, () => {
    console.log("🚀 Server running on port 8080");
  });
}

startServer();
