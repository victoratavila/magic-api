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
app.use(express.text({ type: "text/plain" }));
app.use(express.text()); 

// Register routes
app.use(routes);

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`API running on port ${port}`);
});