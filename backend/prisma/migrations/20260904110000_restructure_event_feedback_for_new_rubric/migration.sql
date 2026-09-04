-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "teamId" TEXT,
    "participantRole" TEXT NOT NULL,
    "q1RegistrationComms" INTEGER NOT NULL,
    "q2BriefingClarity" INTEGER NOT NULL,
    "q3ProblemStatementClarity" INTEGER NOT NULL,
    "q4MentoringQuality" INTEGER NOT NULL,
    "q5OrganiserSupport" INTEGER NOT NULL,
    "q6WorkspaceTechFacilities" INTEGER NOT NULL,
    "q7FoodHospitality" INTEGER NOT NULL,
    "q8JuryFeedbackQuality" INTEGER NOT NULL,
    "q9LearningGained" INTEGER NOT NULL,
    "q10NetworkingExposure" INTEGER NOT NULL,
    "q11OverallValue" INTEGER NOT NULL,
    "avgRating" REAL NOT NULL,
    "mostValuableAspect" TEXT,
    "suggestionsForImprovement" TEXT,
    "keyOutcomes" TEXT NOT NULL,
    "wouldParticipateAgain" TEXT NOT NULL,
    "wouldRecommend" TEXT NOT NULL,
    "quotePermission" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventFeedback_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EventFeedback" ("avgRating", "createdAt", "id", "q7FoodHospitality", "teamId", "updatedAt", "userId", "userRole") SELECT "avgRating", "createdAt", "id", "q7FoodHospitality", "teamId", "updatedAt", "userId", "userRole" FROM "EventFeedback";
DROP TABLE "EventFeedback";
ALTER TABLE "new_EventFeedback" RENAME TO "EventFeedback";
CREATE INDEX "EventFeedback_userRole_idx" ON "EventFeedback"("userRole");
CREATE INDEX "EventFeedback_teamId_idx" ON "EventFeedback"("teamId");
CREATE INDEX "EventFeedback_createdAt_idx" ON "EventFeedback"("createdAt");
CREATE UNIQUE INDEX "EventFeedback_userId_key" ON "EventFeedback"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
