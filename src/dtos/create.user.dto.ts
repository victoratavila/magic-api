import { z } from "zod";

export const userRoleEnum = z.enum(["admin", "user"]);

export const createUserDTO = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
});

export type CreateUserDTO = z.infer<typeof createUserDTO>;
