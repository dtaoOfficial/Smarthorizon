-- CreateTable
CREATE TABLE "Hackathon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "feedbackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "judgeStatus" TEXT NOT NULL DEFAULT 'Available',
    "avgReviewTime" REAL NOT NULL DEFAULT 0.0,
    "currentTeamId" TEXT,
    "nextTeamId" TEXT,
    "roleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "resultsLocked" BOOLEAN NOT NULL DEFAULT false,
    "frozenLeaderboard" TEXT,
    "leaderboardVisibility" TEXT NOT NULL DEFAULT 'ADMIN_ONLY',
    "exposeScoresToStudents" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Track_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationId" TEXT,
    "name" TEXT NOT NULL,
    "teamCode" TEXT,
    "qrCode" TEXT,
    "college" TEXT,
    "collegeName" TEXT,
    "domain" TEXT,
    "selectedPsId" TEXT,
    "mentorName1" TEXT,
    "emergencyContact" TEXT,
    "projectTitle" TEXT,
    "problemStatement" TEXT,
    "projectDesc" TEXT,
    "projectUrl" TEXT,
    "demoUrl" TEXT,
    "presentationUrl" TEXT,
    "techStack" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Registered',
    "checkInStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "repoVisibility" TEXT,
    "repoLastUpdated" DATETIME,
    "repoCommitCount" INTEGER NOT NULL DEFAULT 0,
    "mentorId" TEXT,
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "checkInTime" DATETIME,
    "checkedInBy" TEXT,
    "qrGeneratedAt" DATETIME,
    "pdfUrl" TEXT,
    "pdfFilename" TEXT,
    "pdfUploadedAt" DATETIME,
    "trackId" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "leadName" TEXT,
    "leadEmail" TEXT,
    "leadMobile" TEXT,
    "leadUsn" TEXT,
    "member2Name" TEXT,
    "member2Email" TEXT,
    "member2Mobile" TEXT,
    "member2Usn" TEXT,
    "member3Name" TEXT,
    "member3Email" TEXT,
    "member3Mobile" TEXT,
    "member3Usn" TEXT,
    "member4Name" TEXT,
    "member4Email" TEXT,
    "member4Mobile" TEXT,
    "member4Usn" TEXT,
    "member5Name" TEXT,
    "member5Email" TEXT,
    "member5Mobile" TEXT,
    "member5Usn" TEXT,
    "paymentStatusFinal" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "Team_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Team_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT DEFAULT 'MEMBER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JudgeAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "judgeId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "trackId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JudgeAssignment_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JudgeAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JudgeAssignment_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvaluationClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EvaluationClaim_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvaluationClaim_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "ReviewRound" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvaluationClaim_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "trackId" TEXT,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "submissionDeadline" DATETIME,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateType" TEXT,
    "rubricVersion" INTEGER NOT NULL DEFAULT 1,
    "thresholdExcellent" REAL NOT NULL DEFAULT 85.0,
    "thresholdGood" REAL NOT NULL DEFAULT 65.0,
    "thresholdImprovement" REAL NOT NULL DEFAULT 45.0,
    "duration" INTEGER NOT NULL DEFAULT 600,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "hackathonId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReviewRound_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReviewRound_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JudgingCriterion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "maxMarks" REAL NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "rubricVersion" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JudgingCriterion_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "ReviewRound" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "rubricVersion" INTEGER NOT NULL DEFAULT 1,
    "comments" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "plannedDuration" INTEGER,
    "actualDuration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "ReviewRound" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReviewScore_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "JudgingCriterion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "originalScore" REAL NOT NULL,
    "newScore" REAL NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewOverride_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewOverride_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "JudgingCriterion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewOverride_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hackathonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "internalNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Question_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Question_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Question_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionReply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionReply_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuestionReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hackathonId" TEXT NOT NULL,
    "trackId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "priority" TEXT NOT NULL DEFAULT 'INFO',
    "targetAudience" TEXT NOT NULL DEFAULT 'EVERYONE',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "publishAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireAt" DATETIME,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Announcement_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Announcement_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnnouncementReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnnouncementReceipt_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnnouncementReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "memberId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "checkedInBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "roundId" TEXT,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentFeedback_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentFeedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentFeedback_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "ReviewRound" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JuryFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "judgeId" TEXT NOT NULL,
    "roundId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "comments" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JuryFeedback_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JuryFeedback_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "ReviewRound" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "teamId" TEXT,
    "q1Organization" INTEGER NOT NULL,
    "q2ProblemRelevance" INTEGER NOT NULL,
    "q3RegistrationSupport" INTEGER NOT NULL,
    "q4FacilitiesTech" INTEGER NOT NULL,
    "q5MentoringGuidance" INTEGER NOT NULL,
    "q6FairnessTransparency" INTEGER NOT NULL,
    "q7FoodHospitality" INTEGER NOT NULL,
    "q8VolunteerSupport" INTEGER NOT NULL,
    "q9LearningNetworking" INTEGER NOT NULL,
    "q10OverallSatisfaction" INTEGER NOT NULL,
    "avgRating" REAL NOT NULL,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventFeedback_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamSubmission_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamSubmission_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL,
    "deepLink" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "previousState" TEXT,
    "newState" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_TrackToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_TrackToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Track" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_TrackToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Team_registrationId_key" ON "Team"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_teamCode_key" ON "Team"("teamCode");

-- CreateIndex
CREATE INDEX "Team_registrationId_idx" ON "Team"("registrationId");

-- CreateIndex
CREATE INDEX "Team_teamCode_idx" ON "Team"("teamCode");

-- CreateIndex
CREATE INDEX "Team_trackId_idx" ON "Team"("trackId");

-- CreateIndex
CREATE INDEX "Team_hackathonId_idx" ON "Team"("hackathonId");

-- CreateIndex
CREATE INDEX "Team_checkedIn_idx" ON "Team"("checkedIn");

-- CreateIndex
CREATE INDEX "Team_checkInStatus_idx" ON "Team"("checkInStatus");

-- CreateIndex
CREATE INDEX "Team_paymentStatusFinal_idx" ON "Team"("paymentStatusFinal");

-- CreateIndex
CREATE INDEX "Team_status_idx" ON "Team"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_userId_key" ON "TeamMember"("userId");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");

-- CreateIndex
CREATE INDEX "JudgeAssignment_judgeId_idx" ON "JudgeAssignment"("judgeId");

-- CreateIndex
CREATE INDEX "JudgeAssignment_teamId_idx" ON "JudgeAssignment"("teamId");

-- CreateIndex
CREATE INDEX "JudgeAssignment_trackId_idx" ON "JudgeAssignment"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "JudgeAssignment_judgeId_teamId_key" ON "JudgeAssignment"("judgeId", "teamId");

-- CreateIndex
CREATE INDEX "EvaluationClaim_judgeId_idx" ON "EvaluationClaim"("judgeId");

-- CreateIndex
CREATE INDEX "EvaluationClaim_teamId_idx" ON "EvaluationClaim"("teamId");

-- CreateIndex
CREATE INDEX "EvaluationClaim_roundId_idx" ON "EvaluationClaim"("roundId");

-- CreateIndex
CREATE INDEX "EvaluationClaim_status_idx" ON "EvaluationClaim"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationClaim_teamId_roundId_key" ON "EvaluationClaim"("teamId", "roundId");

-- CreateIndex
CREATE INDEX "ReviewRound_hackathonId_idx" ON "ReviewRound"("hackathonId");

-- CreateIndex
CREATE INDEX "ReviewRound_active_idx" ON "ReviewRound"("active");

-- CreateIndex
CREATE INDEX "JudgingCriterion_roundId_idx" ON "JudgingCriterion"("roundId");

-- CreateIndex
CREATE INDEX "Review_judgeId_idx" ON "Review"("judgeId");

-- CreateIndex
CREATE INDEX "Review_teamId_idx" ON "Review"("teamId");

-- CreateIndex
CREATE INDEX "Review_roundId_idx" ON "Review"("roundId");

-- CreateIndex
CREATE INDEX "Review_status_idx" ON "Review"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Review_roundId_teamId_judgeId_key" ON "Review"("roundId", "teamId", "judgeId");

-- CreateIndex
CREATE INDEX "ReviewScore_reviewId_idx" ON "ReviewScore"("reviewId");

-- CreateIndex
CREATE INDEX "ReviewScore_criterionId_idx" ON "ReviewScore"("criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewScore_reviewId_criterionId_key" ON "ReviewScore"("reviewId", "criterionId");

-- CreateIndex
CREATE INDEX "ReviewOverride_reviewId_idx" ON "ReviewOverride"("reviewId");

-- CreateIndex
CREATE INDEX "ReviewOverride_changedById_idx" ON "ReviewOverride"("changedById");

-- CreateIndex
CREATE INDEX "Question_userId_idx" ON "Question"("userId");

-- CreateIndex
CREATE INDEX "Question_assignedToId_idx" ON "Question"("assignedToId");

-- CreateIndex
CREATE INDEX "Question_status_idx" ON "Question"("status");

-- CreateIndex
CREATE INDEX "QuestionReply_questionId_idx" ON "QuestionReply"("questionId");

-- CreateIndex
CREATE INDEX "Announcement_hackathonId_idx" ON "Announcement"("hackathonId");

-- CreateIndex
CREATE INDEX "Announcement_targetAudience_idx" ON "Announcement"("targetAudience");

-- CreateIndex
CREATE INDEX "Announcement_status_idx" ON "Announcement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementReceipt_announcementId_userId_key" ON "AnnouncementReceipt"("announcementId", "userId");

-- CreateIndex
CREATE INDEX "Attendance_teamId_idx" ON "Attendance"("teamId");

-- CreateIndex
CREATE INDEX "Attendance_memberId_idx" ON "Attendance"("memberId");

-- CreateIndex
CREATE INDEX "StudentFeedback_teamId_idx" ON "StudentFeedback"("teamId");

-- CreateIndex
CREATE INDEX "StudentFeedback_studentId_idx" ON "StudentFeedback"("studentId");

-- CreateIndex
CREATE INDEX "JuryFeedback_judgeId_idx" ON "JuryFeedback"("judgeId");

-- CreateIndex
CREATE INDEX "EventFeedback_userRole_idx" ON "EventFeedback"("userRole");

-- CreateIndex
CREATE INDEX "EventFeedback_teamId_idx" ON "EventFeedback"("teamId");

-- CreateIndex
CREATE INDEX "EventFeedback_createdAt_idx" ON "EventFeedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventFeedback_userId_key" ON "EventFeedback"("userId");

-- CreateIndex
CREATE INDEX "TeamSubmission_teamId_idx" ON "TeamSubmission"("teamId");

-- CreateIndex
CREATE INDEX "TeamSubmission_domain_idx" ON "TeamSubmission"("domain");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_TrackToUser_AB_unique" ON "_TrackToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_TrackToUser_B_index" ON "_TrackToUser"("B");
