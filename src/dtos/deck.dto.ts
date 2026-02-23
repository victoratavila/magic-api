import { z } from "zod";

export const createDeckDTO = z.object({

  name: z.string().min(1, "name is required"),
  
});



export type createDeckDTO = z.infer<typeof createDeckDTO>;