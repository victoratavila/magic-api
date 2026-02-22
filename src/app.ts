// Express app configuration.
// We separate `app` from `server` so it's easier to test later.

import express from "express";
import cors from "cors";
import { routes } from "./routes"

export const app = express();

// Allow requests from other origins (frontends, tools, etc.)
app.use(cors());

// Parse JSON bodies into req.body
app.use(express.json());

// Register routes
app.use(routes);

app.listen(8080, () => {
  console.log(`API running on http://localhost:8080`);
});
