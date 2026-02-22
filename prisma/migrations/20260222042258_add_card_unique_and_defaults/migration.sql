/*
  Warnings:

  - A unique constraint covering the columns `[name,set]` on the table `Card` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Card_name_set_key" ON "Card"("name", "set");
