/*
  Warnings:

  - You are about to drop the column `deckId` on the `Card` table. All the data in the column will be lost.
  - Added the required column `belongs_to_deck_id` to the `Card` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_deckId_fkey";

-- DropIndex
DROP INDEX "Card_deckId_idx";

-- DropIndex
DROP INDEX "Card_deckId_name_idx";

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "deckId",
ADD COLUMN     "belongs_to_deck_id" TEXT NOT NULL,
ALTER COLUMN "own" SET DEFAULT false;

-- CreateIndex
CREATE INDEX "Card_belongs_to_deck_id_idx" ON "Card"("belongs_to_deck_id");

-- CreateIndex
CREATE INDEX "Card_belongs_to_deck_id_name_idx" ON "Card"("belongs_to_deck_id", "name");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_belongs_to_deck_id_fkey" FOREIGN KEY ("belongs_to_deck_id") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
