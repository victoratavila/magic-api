import { z } from "zod";

export const updateImageAndSetDTO = z
  .object({
    card_id: z.coerce.string().uuid(),
    card_current_name: z.coerce.string().min(1),
  })
  .refine(
    (d) =>
      d.card_id !== undefined ||
      d.card_current_name !== undefined || {
        message: "Send card_current_name or card_id missing",
      },
  );
