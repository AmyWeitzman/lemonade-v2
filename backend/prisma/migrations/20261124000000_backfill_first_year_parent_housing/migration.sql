-- Give eligible first-year players a starting home without replacing a home
-- they already chose or requiring them to spend time blocks.
INSERT INTO "housing_ownerships" ("id", "playerId", "housingId", "startAge", "chosenLocation", "updatedAt")
SELECT 'parent-start-' || p."id", p."id", h."id", p."age", p."location", CURRENT_TIMESTAMP
FROM "players" p
JOIN "game_sessions" s ON s."id" = p."gameSessionId"
CROSS JOIN (SELECT "id" FROM "housing" WHERE "type" = 'parent' ORDER BY "id" LIMIT 1) h
WHERE s."currentYear" = 0 AND p."isInitialized" AND p."isAlive"
  AND CASE WHEN jsonb_typeof(p."parentContributions"->'maxParentAge') = 'number' THEN
    (p."parentContributions"->>'maxParentAge')::numeric = -1 OR
    (p."parentContributions"->>'maxParentAge')::numeric >= p."age"
    ELSE FALSE END
  AND NOT EXISTS (SELECT 1 FROM "housing_ownerships" o WHERE o."playerId" = p."id" AND o."endAge" IS NULL)
ON CONFLICT ("id") DO NOTHING;
