-- AlterTable
ALTER TABLE "actions" ALTER COLUMN "maxTimeBlocks" DROP NOT NULL,
ALTER COLUMN "maxTimeBlocks" DROP DEFAULT;
