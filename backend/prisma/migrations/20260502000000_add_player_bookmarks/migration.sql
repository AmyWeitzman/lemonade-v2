-- AlterTable
ALTER TABLE "players" ADD COLUMN "jobBookmarks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "players" ADD COLUMN "educationBookmarks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
