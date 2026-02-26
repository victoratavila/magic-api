import { z } from "zod";

export const updateDeckDTO = z
  .object({
    deckId: z.string().uuid(),
    name: z.string().min(1).optional(),
    cards_max: z.coerce.number().int().positive().optional(),
  })
  .refine((d) => d.name !== undefined || d.cards_max !== undefined, {
    message: "Send at least name or cards_max",
  });
