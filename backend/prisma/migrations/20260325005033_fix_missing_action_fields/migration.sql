/*
  Warnings:

  - You are about to drop the column `ptoDays` on the `jobs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "actions" ADD COLUMN     "baseCost" DOUBLE PRECISION,
ADD COLUMN     "userInput" JSONB;

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "ptoDays",
ADD COLUMN     "ptoTimeBlocks" INTEGER NOT NULL DEFAULT 0;
