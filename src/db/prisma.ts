// Prisma client singleton.
// We create ONE instance and reuse it in the whole app.

import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
