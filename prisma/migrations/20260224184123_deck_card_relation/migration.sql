/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `set` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Deck` table. All the data in the column will be lost.
  - Added the required column `deckId` to the `Card` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Card` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cards_max` to the `Deck` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Deck` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Card_name_key";

-- DropIndex
DROP INDEX "Card_name_set_key";

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "createdAt",
DROP COLUMN "image_url",
DROP COLUMN "set",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deckId" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Deck" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "cards_max" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Card_deckId_idx" ON "Card"("deckId");

-- CreateIndex
CREATE INDEX "Card_deckId_name_idx" ON "Card"("deckId", "name");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
