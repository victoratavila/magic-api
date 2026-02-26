import { z } from "zod";

// Validator for entries in the filter route

export const searchFilter = z.object({
  deckId: z.string().uuid(),
  name: z.string().optional().default(""),
  filter: z.enum(["all", "own", "missing"]).default("all"),
});
