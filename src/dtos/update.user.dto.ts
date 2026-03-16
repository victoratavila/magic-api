import { z } from "zod";

export const UpdateUserDTO = z.object({
  userId: z.string(),
  password: z.string().min(6),
});

export type UpdateUserDTO = z.infer<typeof UpdateUserDTO>;
