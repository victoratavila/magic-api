import { z } from "zod";

export const CreateCardDTO = z.object({

  name: z.string(),

  set: z.string(),

  own: z.boolean(),

});

export type CreateCardDTO = z.infer<typeof CreateCardDTO>;