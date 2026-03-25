-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hostPlayerId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'default',
    "currentYear" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "endReason" TEXT,
    "maxPlayers" INTEGER NOT NULL DEFAULT 8,
    "pitcherCurrentLemons" INTEGER NOT NULL DEFAULT 0,
    "pitcherYearlyGoal" INTEGER NOT NULL DEFAULT 0,
    "pitcherGraceYearUsed" BOOLEAN NOT NULL DEFAULT false,
    "pitcherContributionsByPlayer" JSONB NOT NULL DEFAULT '{}',
    "pitcherYearlyContributions" JSONB NOT NULL DEFAULT '{}',
    "inflationRates" JSONB NOT NULL DEFAULT '[]',
    "taxBrackets" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL DEFAULT 18,
    "money" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectedIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retirementSavings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "collegeFund" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "health" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "maxHealth" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "stress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "skills" JSONB NOT NULL DEFAULT '{"math":0,"science":0,"art":0,"music":0,"writing":0,"analysis":0,"homeRepair":0,"technology":0}',
    "traits" JSONB NOT NULL DEFAULT '{"bravery":0,"perseverance":0,"charisma":0,"compassion":0,"creativity":0,"organization":0,"patience":0,"caution":0,"sociability":0,"stressTolerance":0,"goodWithKids":0,"physicalAbility":0,"communication":0}',
    "isAlive" BOOLEAN NOT NULL DEFAULT true,
    "isRetired" BOOLEAN NOT NULL DEFAULT false,
    "yearComplete" BOOLEAN NOT NULL DEFAULT false,
    "chronicConditions" JSONB NOT NULL DEFAULT '[]',
    "certifications" JSONB NOT NULL DEFAULT '[]',
    "maritalStatus" TEXT NOT NULL DEFAULT 'single',
    "spouse" JSONB,
    "parentContributions" JSONB NOT NULL DEFAULT '{}',
    "totalLemonsEarned" INTEGER NOT NULL DEFAULT 0,
    "goodDeedCount" INTEGER NOT NULL DEFAULT 0,
    "badDeedCount" INTEGER NOT NULL DEFAULT 0,
    "cardsReceivedThisYear" INTEGER NOT NULL DEFAULT 0,
    "hasHealthInsurance" BOOLEAN NOT NULL DEFAULT false,
    "healthInsuranceType" TEXT NOT NULL DEFAULT 'single',
    "hasHomeInsurance" BOOLEAN NOT NULL DEFAULT false,
    "autoInsuranceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "location" TEXT NOT NULL DEFAULT 'city',
    "writingProgress" JSONB,
    "actingProgress" JSONB,
    "musicProgress" JSONB,
    "marriageCompatibility" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "children" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "age" INTEGER NOT NULL DEFAULT 0,
    "isAdopted" BOOLEAN NOT NULL DEFAULT false,
    "hasChildren" BOOLEAN NOT NULL DEFAULT false,
    "childrenCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'small',
    "age" INTEGER NOT NULL DEFAULT 0,
    "deathAgeMin" INTEGER NOT NULL,
    "deathAgeMax" INTEGER NOT NULL,
    "isAlive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adoption_applications" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "childAgeGroup" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "appliedYear" INTEGER NOT NULL,
    "availableYear" INTEGER,
    "completedYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adoption_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "principal" DOUBLE PRECISION NOT NULL,
    "currentBalance" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "minimumPayment" DOUBLE PRECISION NOT NULL,
    "originAge" INTEGER NOT NULL,
    "isJoint" BOOLEAN NOT NULL DEFAULT false,
    "owner" TEXT NOT NULL DEFAULT 'player',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retirement_transactions" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "age" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retirement_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employments" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "startAge" INTEGER NOT NULL,
    "currentSalary" DOUBLE PRECISION NOT NULL,
    "yearsOfService" INTEGER NOT NULL DEFAULT 0,
    "ptoRemaining" INTEGER NOT NULL DEFAULT 0,
    "unpaidTimeOffRemaining" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPartTime" BOOLEAN NOT NULL DEFAULT false,
    "isSeasonal" BOOLEAN NOT NULL DEFAULT false,
    "consecutiveMissedRaiseYears" INTEGER NOT NULL DEFAULT 0,
    "endAge" INTEGER,
    "endReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educations" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "isPartTime" BOOLEAN NOT NULL DEFAULT false,
    "startAge" INTEGER NOT NULL,
    "creditsCompleted" JSONB NOT NULL DEFAULT '{"generalEducation":0,"field":0,"major":0}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "graduated" BOOLEAN NOT NULL DEFAULT false,
    "graduationAge" INTEGER,
    "parentContributionUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scholarships" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "housing_ownerships" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "housingId" TEXT NOT NULL,
    "startAge" INTEGER NOT NULL,
    "endAge" INTEGER,
    "isRental" BOOLEAN NOT NULL DEFAULT true,
    "purchasePrice" DOUBLE PRECISION,
    "salePrice" DOUBLE PRECISION,
    "totalRentPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "yearsLived" INTEGER NOT NULL DEFAULT 0,
    "improvements" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "housing_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_ownerships" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "startAge" INTEGER NOT NULL,
    "endAge" INTEGER,
    "purchasePrice" DOUBLE PRECISION,
    "salePrice" DOUBLE PRECISION,
    "wasParentGift" BOOLEAN NOT NULL DEFAULT false,
    "isSpouseVehicle" BOOLEAN NOT NULL DEFAULT false,
    "totalMaintenancePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInsurancePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "yearsOwned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_history" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTimeBlocks" INTEGER NOT NULL DEFAULT 0,
    "lemonsEarned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "action_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_events" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "effectsApplied" JSONB NOT NULL DEFAULT '{}',
    "goodDeedResponses" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "persistent" BOOLEAN NOT NULL DEFAULT false,
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "actionRequired" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "playerId" TEXT,
    "playerName" TEXT NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "isSystemMessage" BOOLEAN NOT NULL DEFAULT false,
    "reactions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marriage_compatibility" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "currentScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "yearlyScores" JSONB NOT NULL DEFAULT '{}',
    "debtStressHistory" JSONB NOT NULL DEFAULT '[]',
    "familyActionHistory" JSONB NOT NULL DEFAULT '[]',
    "totalYearsMarried" INTEGER NOT NULL DEFAULT 0,
    "communicationGained" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "compassionGained" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "patienceGained" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marriage_compatibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "requirements" JSONB NOT NULL DEFAULT '{}',
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costFormula" TEXT NOT NULL DEFAULT 'none',
    "seniorDiscount" BOOLEAN NOT NULL DEFAULT false,
    "minTimeBlocks" INTEGER NOT NULL DEFAULT 0,
    "maxTimeBlocks" INTEGER NOT NULL DEFAULT 0,
    "requiresPTO" BOOLEAN NOT NULL DEFAULT false,
    "effects" JSONB NOT NULL DEFAULT '{}',
    "executionType" TEXT NOT NULL DEFAULT 'cart',
    "frequency" TEXT NOT NULL DEFAULT 'unlimited',
    "discounts" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requirements" JSONB NOT NULL DEFAULT '{}',
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "raiseSchedule" JSONB NOT NULL DEFAULT '[]',
    "hasPension" BOOLEAN NOT NULL DEFAULT false,
    "pensionPercentage" DOUBLE PRECISION,
    "timeBlocks" INTEGER NOT NULL,
    "stressLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ptoDays" INTEGER NOT NULL DEFAULT 0,
    "unpaidTimeOff" INTEGER,
    "fullTime" BOOLEAN NOT NULL DEFAULT true,
    "partTime" BOOLEAN NOT NULL DEFAULT false,
    "seasonal" BOOLEAN NOT NULL DEFAULT false,
    "benefits" JSONB NOT NULL DEFAULT '[]',
    "annualGains" JSONB NOT NULL DEFAULT '{}',
    "location" TEXT NOT NULL DEFAULT 'both',
    "easeOfGetting" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "requirements" JSONB NOT NULL DEFAULT '{}',
    "tuitionFullTime" DOUBLE PRECISION NOT NULL,
    "totalCredits" JSONB NOT NULL DEFAULT '{"generalEducation":0,"field":0,"major":0}',
    "skillGains" JSONB NOT NULL DEFAULT '{"automatic":{},"major":{}}',
    "isStem" BOOLEAN NOT NULL DEFAULT false,
    "partTimeAllowed" BOOLEAN NOT NULL DEFAULT true,
    "grantsOnGraduation" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "education_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "housing" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "isRental" BOOLEAN NOT NULL DEFAULT true,
    "rentPerYear" DOUBLE PRECISION,
    "purchasePrice" DOUBLE PRECISION,
    "utilitiesBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utilitiesPerPerson" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insurancePerYear" DOUBLE PRECISION,
    "recommendedOccupancy" INTEGER NOT NULL,
    "maxOccupancy" INTEGER NOT NULL,
    "maxKids" INTEGER NOT NULL DEFAULT -1,
    "petLimitLarge" INTEGER NOT NULL DEFAULT 0,
    "petLimitSmall" INTEGER NOT NULL DEFAULT 0,
    "ageLimit" INTEGER,
    "requiresEnrollment" BOOLEAN NOT NULL DEFAULT false,
    "allowsRemodeling" BOOLEAN NOT NULL DEFAULT false,
    "allowsPool" BOOLEAN NOT NULL DEFAULT false,
    "allowsSolarPanels" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "housing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fuelType" TEXT NOT NULL DEFAULT 'none',
    "ageVariant" TEXT NOT NULL DEFAULT 'new',
    "purchasePrice" DOUBLE PRECISION,
    "annualCost" DOUBLE PRECISION,
    "insuranceBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gasPerYear" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maintenanceBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "passengerCapacity" INTEGER NOT NULL DEFAULT 1,
    "restrictedToArea" BOOLEAN NOT NULL DEFAULT false,
    "canBeParentGift" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL,
    "requirements" JSONB NOT NULL DEFAULT '{}',
    "effects" JSONB NOT NULL DEFAULT '{}',
    "isGoodDeedOpportunity" BOOLEAN NOT NULL DEFAULT false,
    "goodDeedOptions" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "game_sessions_code_key" ON "game_sessions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "players_userId_gameSessionId_key" ON "players"("userId", "gameSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "action_history_playerId_actionId_year_key" ON "action_history"("playerId", "actionId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "marriage_compatibility_playerId_key" ON "marriage_compatibility"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "actions_name_key" ON "actions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_title_key" ON "jobs"("title");

-- CreateIndex
CREATE UNIQUE INDEX "education_programs_name_type_key" ON "education_programs"("name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "housing_name_key" ON "housing"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_name_ageVariant_key" ON "vehicles"("name", "ageVariant");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoption_applications" ADD CONSTRAINT "adoption_applications_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retirement_transactions" ADD CONSTRAINT "retirement_transactions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employments" ADD CONSTRAINT "employments_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employments" ADD CONSTRAINT "employments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educations" ADD CONSTRAINT "educations_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educations" ADD CONSTRAINT "educations_programId_fkey" FOREIGN KEY ("programId") REFERENCES "education_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housing_ownerships" ADD CONSTRAINT "housing_ownerships_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housing_ownerships" ADD CONSTRAINT "housing_ownerships_housingId_fkey" FOREIGN KEY ("housingId") REFERENCES "housing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_ownerships" ADD CONSTRAINT "vehicle_ownerships_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_ownerships" ADD CONSTRAINT "vehicle_ownerships_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_history" ADD CONSTRAINT "action_history_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_history" ADD CONSTRAINT "action_history_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "actions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_events" ADD CONSTRAINT "card_events_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_events" ADD CONSTRAINT "card_events_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
