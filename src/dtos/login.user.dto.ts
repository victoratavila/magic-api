import { z } from "zod";

export const loginUserDTO = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginUserDTO = z.infer<typeof loginUserDTO>;
