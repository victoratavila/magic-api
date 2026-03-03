import { z } from "zod";

export const updateImageAndSetDTO = z
  .object({
    card_id: z.coerce.string().uuid(),
    card_current_name: z.coerce.string().min(1),
    new_set_name: z.coerce.string().min(1),
    new_image_url: z.coerce.string().min(1),
  })
  .refine(
    (d) =>
      d.card_id !== undefined ||
      d.card_current_name !== undefined ||
      d.new_set_name !== undefined ||
      d.new_image_url !== undefined || {
        message: "Send card_current_name, card_id or new_set_name missing",
      },
  );
