import { z } from "zod";

export const uuidParam = (paramName: string) =>
  z.object({
    [paramName]: z.string().uuid(`Invalid ${paramName} format`),
  });