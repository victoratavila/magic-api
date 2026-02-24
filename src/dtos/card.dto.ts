import { z } from "zod";
import { string } from "zod/v4";

export const CreateCardDTO = z.object({

   name: z
    .string()
    .trim()
    .min(1, "card name is mandatory"),

    set:z
    .string()
    .trim()
    .min(0)
    .optional()
    .default(""),

  own: z.boolean().default(false),

  deckId: z
    .string()
    .uuid("deckId must be a valid UUID"),
});

export type CreateCardDTO = z.infer<typeof CreateCardDTO>;