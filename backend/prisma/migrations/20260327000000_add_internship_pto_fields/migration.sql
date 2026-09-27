-- Add didInternshipThisYear to players
ALTER TABLE "players" ADD COLUMN "didInternshipThisYear" BOOLEAN NOT NULL DEFAULT false;

-- Add ptoUsed to employments
ALTER TABLE "employments" ADD COLUMN "ptoUsed" INTEGER NOT NULL DEFAULT 0;
