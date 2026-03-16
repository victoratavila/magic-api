-- CreateIndex
CREATE INDEX "Deck_user_id_idx" ON "Deck"("user_id");

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
