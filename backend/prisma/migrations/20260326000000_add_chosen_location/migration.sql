-- AlterTable: add chosenLocation to employments
ALTER TABLE "employments" ADD COLUMN "chosenLocation" TEXT NOT NULL DEFAULT 'city';

-- AlterTable: add chosenLocation to housing_ownerships
ALTER TABLE "housing_ownerships" ADD COLUMN "chosenLocation" TEXT NOT NULL DEFAULT 'city';
