import { z } from "zod";

export const deckIdParamSchema = z.object({
  deckId: z.string().uuid("Invalid deckId format"),
});