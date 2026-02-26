import { z } from "zod";

export const createDeckDTO = z.object({
  name: z.string().trim().min(1, "Deck name is mandatory"),

  cards_max: z.coerce
    .number()
    .int("cards_max must be integer")
    .min(0, "cards_max minimum is 0")
    .max(101, "cards_max is 101"),
});

export type createDeckDTO = z.infer<typeof createDeckDTO>;
