ALTER TABLE "players" ADD COLUMN "unpaidLeavePayReduction" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "action_history"
  ADD COLUMN "activityBlocks" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "ptoBlocks" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "unpaidBlocks" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "schoolBreakBlocks" INTEGER NOT NULL DEFAULT 0;

-- Older action history did not distinguish the funding sources.
UPDATE "action_history" SET "activityBlocks" = "totalTimeBlocks";
UPDATE "employments" SET "unpaidTimeOffRemaining" = CASE WHEN "isSeasonal" THEN 0 ELSE 2 END WHERE "isActive";

UPDATE "actions" SET "allowsPTO" = TRUE WHERE "name" IN (
  'Write a Book', 'Self-Publish Book', 'Submit Book to Publisher',
  'Audition for Commercials', 'Audition for Movies', 'Audition for TV Shows',
  'Pursue Education', 'Do Continuing Education'
);
UPDATE "actions" SET "allowsPTO" = FALSE WHERE "name" IN (
  'Do Karaoke', 'Game Night', 'Stargaze', 'Teach Summer Courses'
);
UPDATE "actions" SET "minTimeBlocks" = 1, "maxTimeBlocks" = 1,
  "timeBlockIncrement" = 1, "costFormula" = 'per_person' WHERE "name" = 'Travel Domestically';
UPDATE "actions" SET "minTimeBlocks" = 2, "maxTimeBlocks" = 2,
  "timeBlockIncrement" = 2, "costFormula" = 'per_person' WHERE "name" = 'Travel Internationally';
