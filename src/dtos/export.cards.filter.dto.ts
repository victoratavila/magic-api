import { z } from "zod";

// Validator for entries in the filter route

export const exportCardsFilter = z.object({
  filter: z.enum(["all", "own", "missing"]).default("all"),
});
