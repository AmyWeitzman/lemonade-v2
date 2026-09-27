-- CreateTable
CREATE TABLE "session_hides" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_hides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_hides_userId_gameSessionId_key" ON "session_hides"("userId", "gameSessionId");

-- AddForeignKey
ALTER TABLE "session_hides" ADD CONSTRAINT "session_hides_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_hides" ADD CONSTRAINT "session_hides_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
