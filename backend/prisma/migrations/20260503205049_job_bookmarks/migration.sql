/*
  Warnings:

  - You are about to drop the column `pitcherGraceYearUsed` on the `game_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "game_sessions" DROP COLUMN "pitcherGraceYearUsed",
ADD COLUMN     "pitcherInGraceYear" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "players" ADD COLUMN     "temporaryHealthDebt" DOUBLE PRECISION NOT NULL DEFAULT 0;
