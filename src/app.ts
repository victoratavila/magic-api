// Express app configuration.
// We separate `app` from `server` so it's easier to test later.

import express from "express";
import cors from "cors";
import { routes } from "./routes";
import { testDatabaseConnection } from "./db/prisma";

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

  app.listen(8080, () => {
    console.log("🚀 Server running on port 8080");
  });
}

startServer();
