# SmartHorizon Data Storage & Flow Audit

> **AUDIT NOTICE**: This is an empirical codebase investigation. No code was modified, refactored, or altered during this audit.

---

## 1. Executive Summary

This empirical audit details the exact data architecture, storage locations, and data-flow pathways of the **SmartHorizon Hackathon Operations Portal** codebase. All conclusions are derived directly from source inspection of `backend/prisma/schema.prisma`, Express API route handlers (`backend/src/routes/*.ts`), and React frontend components (`frontend/src/features/*`).

### Key Findings Overview:
- **Submission & Team Metadata**: Persisted directly in the `Team` model (`projectUrl`, `demoUrl`, `presentationUrl`, `projectTitle`, `projectDesc`, `techStack`, `problemStatement`).
- **Score Storage Model**: Scorecards use a **relational child structure**. Each evaluation is represented by a `Review` header record linked to one or more `ReviewScore` child rows (one row per scored `JudgingCriterion`). No JSON/JSONB blobs or hardcoded score columns are used.
- **Round Differentiation**: Explicitly modeled via foreign keys (`Review.roundId` pointing to `ReviewRound.id`). A compound unique constraint `@@unique([roundId, teamId, judgeId])` ensures a judge can submit at most one evaluation per team per round, while allowing multiple judges to evaluate the same team in the same round.
- **Leaderboard Aggregation**: **Calculated dynamically on read** (unless administrative result freezing is activated, which serializes standings into `Track.frozenLeaderboard`). Teams are ranked by calculating the average score per round across submitted reviews and summing round averages.
- **Public Leaderboard Privacy**: Implements an anti-leak mechanism: the top 10 teams by score are selected, all score/rank fields are stripped, and the resulting list is re-sorted alphabetically/numerically by human-facing Team ID (`T001`, `T002`, etc.) to prevent reverse-engineering of standings.
- **Judge-Bias Correction**: **NO JUDGE-BIAS NORMALIZATION FOUND.** Scores are averaged directly without Z-score normalization, percentile scaling, or judge calibration adjustments.

---

## 2. Database Models Involved

Source file: `backend/prisma/schema.prisma`

### 1. Model: `Hackathon`
- **Purpose**: Represents an international hackathon event context.
- **Fields**:
  - `id`: `String` (`@id`, `@default(uuid())`) — Primary Key.
  - `name`: `String` — Event name (e.g. "Smart Horizon 2026").
  - `description`: `String?` — Optional event description.
  - `startDate`: `DateTime` — Competition start timestamp.
  - `endDate`: `DateTime` — Competition end timestamp.
  - `active`: `Boolean` (`@default(false)`) — Active event flag.
  - `feedbackEnabled`: `Boolean` (`@default(false)`) — Flag enabling participant/judge feedback.
  - `createdAt`: `DateTime` (`@default(now())`) — Creation timestamp.
  - `updatedAt`: `DateTime` (`@updatedAt`) — Modification timestamp.
- **Relations**: Has many `Track`, `Team`, `ReviewRound`, `Question`, `Announcement`.

### 2. Model: `Role`
- **Purpose**: System security role registry.
- **Fields**:
  - `id`: `String` (`@id`) — Primary Key (e.g. `"ADMINISTRATOR"`, `"JUDGE"`, `"STUDENT"`).
  - `name`: `String` — Role display name.
- **Relations**: Has many `User`.

### 3. Model: `User`
- **Purpose**: User accounts for admins, judges, and student team leaders.
- **Fields**:
  - `id`: `String` (`@id`, `@default(uuid())`) — Primary Key.
  - `email`: `String` (`@unique`) — Unique user email.
  - `passwordHash`: `String` — Bcrypt password hash.
  - `name`: `String` — Full name.
  - `phone`: `String?` — Mobile contact number.
  - `mustChangePassword`: `Boolean` (`@default(false)`) — First login credential reset flag.
  - `judgeStatus`: `String` (`@default("Available")`) — State: `"Available"`, `"Reviewing"`, `"Walking"`, `"Break"`, `"Offline"`.
  - `avgReviewTime`: `Float` (`@default(0.0)`) — Calculated average judging speed in minutes.
  - `currentTeamId`: `String?` — Team ID currently claimed/under review by judge.
  - `nextTeamId`: `String?` — Next queued team ID.
  - `roleId`: `String` (`@relation` to `Role.id`) — Foreign Key to `Role`.
  - `createdAt`, `updatedAt`: `DateTime`.
- **Relations**: Linked to `TeamMember`, `Review` (as judge), `JudgeAssignment`, `EvaluationClaim`, `ReviewOverride`, `Track` (assigned tracks).

### 4. Model: `Track`
- **Purpose**: Competition tracks/themes (e.g. "FinTech", "Healthcare", "AI & ML").
- **Fields**:
  - `id`: `String` (`@id`, `@default(uuid())`) — Primary Key.
  - `name`: `String` — Track name.
  - `hackathonId`: `String` (`@relation` to `Hackathon.id`, `onDelete: Cascade`) — Foreign Key.
  - `resultsLocked`: `Boolean` (`@default(false)`) — Lock flag for finalized results.
  - `frozenLeaderboard`: `String?` — Serialized JSON snapshot of frozen leaderboard standings.
  - `leaderboardVisibility`: `String` (`@default("ADMIN_ONLY")`) — Visibility level: `"HIDDEN"`, `"ADMIN_ONLY"`, `"ADMIN_JUDGES"`, `"STUDENTS"`, `"PUBLIC"`.
  - `exposeScoresToStudents`: `Boolean` (`@default(false)`) — Score visibility toggle.
  - `createdAt`, `updatedAt`: `DateTime`.
- **Relations**: Linked to `Team`, `Announcement`, `JudgeAssignment`, `User` (judges), `ReviewRound`.

### 5. Model: `Team`
- **Purpose**: Primary entity for student hackathon teams, repository links, and project artifacts.
- **Fields**:
  - `id`: `String` (`@id`, `@default(uuid())`) — Primary Key.
  - `registrationId`: `String?` (`@unique`) — External registration ID (e.g. `"REG-1042"`). Indexed.
  - `name`: `String` — Team name (e.g. `"WellWare"`).
  - `teamCode`: `String?` (`@unique`) — Short human code (e.g. `"SH-031"`). Indexed.
  - `qrCode`: `String?` — QR code payload/URI.
  - `college`: `String?`, `collegeName`: `String?` — Institution affiliation.
  - `domain`: `String?` — Problem domain/theme label.
  - `selectedPsId`: `String?` — Selected problem statement ID.
  - `mentorName1`: `String?`, `emergencyContact`: `String?` — Contact metadata.
  - `projectTitle`: `String?` — Title of the project submission.
  - `problemStatement`: `String?` — Text problem statement description.
  - `projectDesc`: `String?` — Detailed project description.
  - `projectUrl`: `String?` — Public GitHub repository URL (`https://github.com/...`).
  - `demoUrl`: `String?` — Live demo URL (`https://...`).
  - `presentationUrl`: `String?` — Slide deck/presentation URL.
  - `techStack`: `String?` — Comma-separated technology stack list.
  - `status`: `String` (`@default("Registered")`) — State: `"Registered"`, `"Checked In"`, `"Review Pending"`, `"Currently Reviewing"`, `"Completed"`, `"Disqualified"`, `"Withdrawn"`. Indexed.
  - `checkInStatus`: `String` (`@default("PENDING")`) — Venue status: `"PENDING"`, `"PARTIALLY_CHECKED_IN"`, `"FULLY_CHECKED_IN"`. Indexed.
  - `locked`: `Boolean` (`@default(false)`) — Workspace edit freeze flag.
  - `repoVisibility`: `String?` — `"PUBLIC"` or `"PRIVATE"`.
  - `checkedIn`: `Boolean` (`@default(false)`), `checkInTime`: `DateTime?`, `checkedInBy`: `String?` — Attendance tracking. Indexed.
  - `pdfUrl`: `String?`, `pdfFilename`: `String?`, `pdfUploadedAt`: `DateTime?` — Uploaded synopsis document.
  - `trackId`: `String` (`@relation` to `Track.id`) — Foreign Key. Indexed.
  - `hackathonId`: `String` (`@relation` to `Hackathon.id`) — Foreign Key. Indexed.
  - `leadName`, `leadEmail`, `leadMobile`, `leadUsn`: Extended lead details.
  - `member2Name`..`member5Usn`: Extended roster details (members 2 through 5).
  - `paymentStatusFinal`: `String` (`@default("PENDING")`) — Payment state. Indexed.
  - `createdAt`, `updatedAt`: `DateTime`.
- **Relations**: Linked to `TeamMember`, `Review`, `Attendance`, `JudgeAssignment`, `EvaluationClaim`, `StudentFeedback`, `EventFeedback`, `TeamSubmission`.

### 6. Model: `TeamMember`
- **Purpose**: Individual student member records linked to a team and optional user account.
- **Fields**:
  - `id`: `String` (`@id`, `@default(uuid())`).
  - `teamId`: `String` (`@relation` to `Team.id`, `onDelete: Cascade`). Indexed.
  - `userId`: `String?` (`@unique`, `@relation` to `User.id`).
  - `name`: `String`, `email`: `String`, `phone`: `String?`.
  - `role`: `String?` (`@default("MEMBER")`) — `"LEADER"` or `"MEMBER"`.
  - `createdAt`, `updatedAt`: `DateTime`.

### 7. Model: `JudgeAssignment`
- **Purpose**: Admin roster assignment mapping judges to specific teams.
- **Fields**:
  - `id`: `String` (`@id`, `@default(uuid())`).
  - `judgeId`: `String` (`@relation` to `User.id`, `onDelete: Cascade`). Indexed.
  - `teamId`: `String` (`@relation` to `Team.id`, `onDelete: Cascade`). Indexed.
  - `trackId`: `String?` (`@relation` to `Track.id`, `onDelete: SetNull`). Indexed.
  - `order`: `Int` (`@default(0)`) — Queue order sequence.
  - `createdAt`: `DateTime` (`@default(now())`).
- **Constraints**: `@@unique([judgeId, teamId])`.

### 8. Model: `EvaluationClaim`
- **Purpose**: Real-time concurrency control preventing multiple judges from simultaneously evaluating the same team in the same round.
- **Fields**:
  - `id`: `String` (`@id`, `@default(uuid())`).
  - `teamId`: `String` (`@relation` to `Team.id`). Indexed.
  - `roundId`: `String` (`@relation` to `ReviewRound.id`). Indexed.
  - `judgeId`: `String` (`@relation` to `User.id`). Indexed.
  - `status`: `String` (`@default("ACTIVE")`) — `"ACTIVE"`, `"COMPLETED"`, `"RELEASED"`. Indexed.
  - `claimedAt`: `DateTime` (`@default(now())`), `updatedAt`: `DateTime`.
- **Constraints**: `@@unique([teamId, roundId])`.

### 9. Model: `ReviewRound`
- **Purpose**: Configuration for evaluation rounds (Round 1, Round 2, Round 3).
- **Fields**:
  - `id`: `String` (`@id`, `@default(uuid())`).
  - `name`: `String` — Round name (e.g. "Review 1 - Pitch & Design").
  - `description`: `String?`.
  - `sequence`: `Int` (`@default(1)`) — Sequence index (1, 2, or 3).
  - `trackId`: `String?` (`@relation` to `Track.id`).
  - `startTime`, `endTime`: `DateTime?`.
  - `active`: `Boolean` (`@default(false)`). Indexed.
  - `locked`: `Boolean` (`@default(false)`).
  - `submissionDeadline`: `DateTime?`.
  - `rubricVersion`: `Int` (`@default(1)`).
  - `weight`: `Float` (`@default(1.0)`).
  - `hackathonId`: `String` (`@relation` to `Hackathon.id`). Indexed.
  - `createdAt`, `updatedAt`: `DateTime`.
- **Relations**: Has many `JudgingCriterion`, `Review`, `EvaluationClaim`.

### 10. Model: `JudgingCriterion`
- **Purpose**: Specific scoring criteria items contained within a ReviewRound rubric.
- **Fields**:
  - `id`: `String` (`@id`, `@default(uuid())`).
  - `roundId`: `String` (`@relation` to `ReviewRound.id`, `onDelete: Cascade`). Indexed.
  - `name`: `String` — Criterion name (e.g. "Innovation & Novelty", "Technical Implementation").
  - `description`: `String` — Scoring guidelines.
  - `maxMarks`: `Float` — Maximum point value (e.g. `10.0`, `20.0`).
  - `weight`: `Float` (`@default(1.0)`).
  - `sequence`: `Int` (`@default(1)`).
  - `required`: `Boolean` (`@default(true)`).
  - `createdAt`, `updatedAt`: `DateTime`.
- **Relations**: Linked to `ReviewScore`, `ReviewOverride`.

### 11. Model: `Review`
- **Purpose**: Evaluation header record submitted by a judge for a team in a specific round.
- **Fields**:
  - `id`: `String` (`@id`, `@default(uuid())`).
  - `roundId`: `String` (`@relation` to `ReviewRound.id`, `onDelete: Cascade`). Indexed.
  - `teamId`: `String` (`@relation` to `Team.id`, `onDelete: Cascade`). Indexed.
  - `judgeId`: `String` (`@relation` to `User.id`, `onDelete: Cascade`). Indexed.
  - `rubricVersion`: `Int` (`@default(1)`).
  - `comments`: `String?` — Qualitative feedback text from the judge.
  - `status`: `String` (`@default("DRAFT")`) — Status: `"DRAFT"` or `"SUBMITTED"`. Indexed.
  - `plannedDuration`, `actualDuration`: `Int?` — Evaluation duration metrics in seconds.
  - `createdAt`, `updatedAt`: `DateTime`.
- **Constraints**: `@@unique([roundId, teamId, judgeId])`.
- **Relations**: Has many `ReviewScore`, `ReviewOverride`.

### 12. Model: `ReviewScore`
- **Purpose**: Individual criterion score row linked to a Review header.
- **Fields**:
  - `id`: `String` (`@id`, `@default(uuid())`).
  - `reviewId`: `String` (`@relation` to `Review.id`, `onDelete: Cascade`). Indexed.
  - `criterionId`: `String` (`@relation` to `JudgingCriterion.id`, `onDelete: Cascade`). Indexed.
  - `score`: `Float` — Whole integer score value awarded.
  - `createdAt`, `updatedAt`: `DateTime`.
- **Constraints**: `@@unique([reviewId, criterionId])`.

### 13. Model: `ReviewOverride`
- **Purpose**: Admin audit record of score overrides.
- **Fields**:
  - `id`: `String` (`@id`, `@default(uuid())`).
  - `reviewId`: `String` (`@relation` to `Review.id`). Indexed.
  - `criterionId`: `String` (`@relation` to `JudgingCriterion.id`).
  - `originalScore`: `Float`, `newScore`: `Float`.
  - `changedById`: `String` (`@relation` to `User.id`). Indexed.
  - `reason`: `String` — Administrative justification.
  - `createdAt`: `DateTime` (`@default(now())`).

---

## 3. Submission Data Storage

| Information | Model | Exact Field | Type | Write API | Read API | Write Component | Display Components | Modifiable By | Modification Trigger |
|-------------|-------|-------------|------|-----------|----------|-----------------|--------------------|---------------|----------------------|
| GitHub Repo URL | `Team` | `projectUrl` | `String?` | `PUT /api/teams/:id` | `GET /api/teams/my-team` | `StudentDashboard.tsx` | `StudentDashboard.tsx`, `TeamDetailDrawer.tsx` | Team Lead, Admin | Student updates workspace |
| Demo URL | `Team` | `demoUrl` | `String?` | `PUT /api/teams/:id` | `GET /api/teams/my-team` | `StudentDashboard.tsx` | `StudentDashboard.tsx`, `TeamDetailDrawer.tsx` | Team Lead, Admin | Student updates workspace |
| Presentation URL | `Team` | `presentationUrl` | `String?` | `PUT /api/teams/:id` | `GET /api/teams/my-team` | `StudentDashboard.tsx` | `StudentDashboard.tsx`, `TeamDetailDrawer.tsx` | Team Lead, Admin | Student updates workspace |
| Project Title | `Team` | `projectTitle` | `String?` | `PUT /api/teams/:id` | `GET /api/teams/my-team` | `StudentDashboard.tsx` | `StudentDashboard.tsx`, `TeamDetailDrawer.tsx`, `Leaderboards.tsx` | Team Lead, Admin | Student updates workspace |
| Project Description | `Team` | `projectDesc` | `String?` | `PUT /api/teams/:id` | `GET /api/teams/my-team` | `StudentDashboard.tsx` | `StudentDashboard.tsx`, `TeamDetailDrawer.tsx` | Team Lead, Admin | Student updates workspace |
| Tech Stack | `Team` | `techStack` | `String?` | `PUT /api/teams/:id` | `GET /api/teams/my-team` | `StudentDashboard.tsx` | `StudentDashboard.tsx`, `TeamDetailDrawer.tsx` | Team Lead, Admin | Student updates workspace |
| Problem Statement | `Team` | `problemStatement` | `String?` | `PUT /api/teams/:id` | `GET /api/teams/my-team` | `StudentDashboard.tsx` | `StudentDashboard.tsx`, `TeamDetailDrawer.tsx` | Team Lead, Admin | Student updates workspace |
| Track ID | `Team` | `trackId` | `String` | `POST /api/teams`, `PUT /api/teams/admin/:id` | `GET /api/teams/my-team` | `CreateTeamModal.tsx` | `StudentDashboard.tsx`, `AdminDashboard.tsx` | Admin | Team creation / Admin re-assignment |
| Synopsis Document | `Team` | `pdfUrl`, `pdfFilename` | `String?` | `POST /api/registration/upload-synopsis` | `GET /api/teams/my-team` | `StudentDashboard.tsx` | `StudentDashboard.tsx`, `TeamReviews.tsx` | Team Lead, Admin | PDF file upload |

---

## 4. Evaluation / Marks Storage

Judging evaluations use a **relational header-child architecture**:

```text
Review (Model Header)
 ├── id: String (UUID)
 ├── roundId: String (FK -> ReviewRound)
 ├── teamId: String (FK -> Team)
 ├── judgeId: String (FK -> User)
 ├── comments: String? (Judge qualitative feedback)
 ├── status: String ("DRAFT" | "SUBMITTED")
 └── ReviewScore (Child Model Rows, 1 per criterion)
      ├── id: String (UUID)
      ├── reviewId: String (FK -> Review)
      ├── criterionId: String (FK -> JudgingCriterion)
      └── score: Float (Whole integer score value awarded)
```

### Direct Field Mappings:
- **Individual Criterion Marks**: Stored as relational child rows in `ReviewScore.score` (`Float`).
- **Total Marks for a Review**: **CALCULATED DYNAMICALLY ON READ** by executing a sum query over `ReviewScore.score` rows for a specific `Review.id` (`sum(score.score)`).
- **Maximum Round Marks**: Stored in `JudgingCriterion.maxMarks` (`Float`) and summed dynamically per round.
- **Judge Comments**: Stored in `Review.comments` (`String?`).
- **Criterion-level Comments**: **NOT PRESENT IN DATABASE** (Comments are attached to the overall `Review` header record, not individual `ReviewScore` rows).
- **Review Status**: Stored in `Review.status` (`"DRAFT"` or `"SUBMITTED"`).
- **Evaluation Timestamps**: Stored in `Review.createdAt` and `Review.updatedAt`.

---

## 5. Review Round Architecture

The codebase handles 3 distinct evaluation rounds using the `ReviewRound` model:
- `ReviewRound.sequence`: Integer `1`, `2`, or `3`.
- `ReviewRound.name`: E.g. `"Review 1 - Initial Pitch"`, `"Review 2 - Mid-Way Progress"`, `"Review 3 - Final Prototype"`.

### Round Differentiation Mechanism:
When a judge evaluates a team, the score payload specifies `roundId`.
1. A `Review` record is created with foreign key `roundId`.
2. A database constraint `@@unique([roundId, teamId, judgeId])` enforces that a specific judge can create only one review per team per round.
3. Multiple judges can review the same team in the same round (producing multiple `Review` records with the same `roundId` and `teamId`, but different `judgeId` values).

---

## 6. Judge Assignment Architecture

Judges are assigned to teams via `JudgeAssignment`:

```text
User (Judge) <---> JudgeAssignment <---> Team
                         │
                         └── trackId (Optional Track Filter)
```

### Assignment Pathways:
1. **Manual Admin Assignment**: Admin selects teams and judges in `AssignTeamsModal.tsx`, invoking `POST /api/judges/assign`.
2. **Automated Algorithmic Distribution**: Admin triggers `POST /api/judges/auto-assign`, which distributes teams among active judges in assigned tracks in round-robin sequence (`order` field).
3. **Queue Query**: When a judge opens `JudgeDashboard.tsx` or `TeamReviews.tsx`, `GET /api/reviews/open-pool` queries `JudgeAssignment` records for `judgeId` and returns the assigned team roster.

---

## 7. Evaluation Submission Flow

```text
JUDGE ACTIONS & WORKSPACE
   │
   ├─ 1. Judge opens Team Evaluation Desk (`TeamReviews.tsx`)
   ├─ 2. Frontend executes `GET /api/reviews/rounds` (Fetches rounds & `JudgingCriterion[]`)
   ├─ 3. Frontend executes `GET /api/reviews/draft/:teamId?roundId=...` (Fetches existing draft)
   ├─ 4. Judge adjusts score sliders -> State updated in `scores` React state (`useState<Record<string, number>>({})`)
   ├─ 5. Debounced auto-save (1500ms) writes draft to `localStorage` & executes `POST /api/reviews/save` (`status: "DRAFT"`)
   ├─ 6. Judge clicks "Finalize & Submit Scorecard"
   │
HTTP POST /api/reviews/save
   │
SERVER VALIDATION & LOGIC (`backend/src/routes/reviews.ts`)
   │
   ├─ 1. Validates payload via `reviewSaveSchema` (zod)
   ├─ 2. Enforces integer scoring: `Number.isInteger(score)`
   ├─ 3. Verifies all criteria are scored: `scores.length === allRoundCriteria.length`
   ├─ 4. Verifies `score <= criterion.maxMarks` & `score >= 0`
   │
DATABASE TRANSACTION (`prisma.$transaction`)
   │
   ├─ 1. Upserts `Review` row (`status: "SUBMITTED"`, `comments`, `rubricVersion`)
   ├─ 2. Deletes existing `ReviewScore` child rows for `reviewId`
   ├─ 3. Executes `prisma.reviewScore.createMany()` with new score rows
   ├─ 4. Updates `EvaluationClaim` record (`status: "COMPLETED"`)
   ├─ 5. Resets `User.judgeStatus` to `"Available"`
   └─ 6. Creates `AuditLog` entry (`action: "REVIEW_COMPLETED"`)
```

---

## 8. Leaderboard Calculation

### Storage vs Calculation:
Leaderboard values are **CALCULATED DYNAMICALLY FROM DB REVIEWS ON READ** (Option B). Standings are not stored as pre-aggregated database columns, unless an Admin explicitly clicks **"Freeze & Lock Results"**, which serializes the calculated leaderboard JSON into `Track.frozenLeaderboard`.

### Aggregation Formula (`backend/src/routes/tracks.ts` - `calculateTeamWeightedScore`):
For a given team and set of review rounds:
1. For each `ReviewRound`:
   $$\text{RoundTotalScoreSum} = \sum_{\text{Submitted Reviews}} \left( \sum \text{ReviewScore.score} \right)$$
   $$\text{RoundAverage} = \frac{\text{RoundTotalScoreSum}}{\text{Count of Submitted Reviews in Round}}$$
2. Final Team Score:
   $$\text{FinalScore} = \sum_{\text{Rounds}} \text{RoundAverage}$$
3. Ranking: Teams are sorted by `FinalScore` descending. Equal scores share the same numerical rank.

---

## 9. Normalization / Judge Bias

### Source Investigation Result:
Searched backend route files `reviews.ts`, `tracks.ts`, `reports.ts`, `judges.ts` for Z-score, standard deviation, percentile scaling, and judge calibration algorithms.

**NO JUDGE-BIAS NORMALIZATION FOUND.**

The system calculates simple mathematical averages across submitted judge scorecards in each round without adjusting for lenient or strict judges.

---

## 10. Public Leaderboard Flow

To prevent public users or participants from guessing exact scores or ranks when results are hidden/unreleased, the system enforces a strict privacy pipeline:

```text
CLIENT REQUEST: GET /api/tracks/public-leaderboard
   │
BACKEND COMPUTATION (`computePublicLeaderboard()` in `routes/tracks.ts`)
   │
   ├─ 1. Computes full internal standings ordered by score descending
   ├─ 2. Selects Top 10 teams by score
   ├─ 3. STRIPS ALL SENSITIVE FIELDS (`score`, `reviewsCount`, `rank`, `movement`)
   ├─ 4. Converts database team IDs to human-facing Team IDs (`formatHumanTeamId()`, e.g. "SH-042" or "T003")
   ├─ 5. SORTS THE SELECTED 10 TEAMS BY HUMAN-FACING TEAM ID IN ASCENDING NATURAL ORDER (`sortByHumanTeamIdAscending()`)
   │
JSON RESPONSE: `{ leaderboard: [{ teamId: "T001", teamName: "...", trackName: "..." }], isPublicPrivacyView: true }`
```

---

## 11. Permissions / Data Ownership Matrix

| Data Item | Participant / Member | Team Leader | Judge | Admin | System |
|-----------|----------------------|-------------|-------|-------|--------|
| GitHub URL (`projectUrl`) | Read Only | Read / Write (when unlocked) | Read Only | Read / Write | Read |
| Demo URL (`demoUrl`) | Read Only | Read / Write (when unlocked) | Read Only | Read / Write | Read |
| Presentation URL (`presentationUrl`) | Read Only | Read / Write (when unlocked) | Read Only | Read / Write | Read |
| Project Title / Description | Read Only | Read / Write (when unlocked) | Read Only | Read / Write | Read |
| Tech Stack | Read Only | Read / Write (when unlocked) | Read Only | Read / Write | Read |
| Review Scores (R1, R2, R3) | Read Only (if exposed) | Read Only (if exposed) | Read / Write (Assigned Teams) | Read / Write (Override) | Read |
| Judge Comments | Read Only | Read Only | Read / Write (Assigned Teams) | Read / Write | Read |
| Final Score | Read Only (if exposed) | Read Only (if exposed) | Read Only | Read / Write | Dynamic Calculation |
| Leaderboard Rank | Read Only (if exposed) | Read Only (if exposed) | Read Only | Read / Write | Dynamic Calculation |

---

## 12. API Inventory

| Method | Route | Purpose | DB Models Read | DB Models Written |
|--------|-------|---------|----------------|-------------------|
| `GET` | `/api/teams/my-team` | Fetch student's assigned team & submission workspace | `Team`, `TeamMember`, `Question`, `Review`, `ReviewScore` | None |
| `PUT` | `/api/teams/:id` | Update team project submission URLs & details | `Team` | `Team`, `AuditLog` |
| `POST` | `/api/registration/upload-synopsis` | Upload team PDF synopsis | `Team` | `Team`, `TeamSubmission`, `AuditLog` |
| `GET` | `/api/reviews/rounds` | Get active review rounds & rubric criteria | `ReviewRound`, `JudgingCriterion` | None |
| `GET` | `/api/reviews/open-pool` | Fetch judge's assigned team evaluation roster | `JudgeAssignment`, `Team`, `Review` | None |
| `POST` | `/api/reviews/claim` | Atomic claim of team evaluation slot | `Review`, `EvaluationClaim` | `EvaluationClaim`, `User`, `AuditLog` |
| `POST` | `/api/reviews/release` | Release evaluation claim | `EvaluationClaim` | `EvaluationClaim`, `User`, `AuditLog` |
| `GET` | `/api/reviews/draft/:teamId` | Fetch existing draft/submitted scorecard | `Review`, `ReviewScore` | None |
| `POST` | `/api/reviews/save` | Save draft or submit finalized evaluation | `ReviewRound`, `JudgingCriterion`, `Review` | `Review`, `ReviewScore`, `EvaluationClaim`, `User`, `AuditLog` |
| `POST` | `/api/reviews/override` | Admin score override | `Review` | `ReviewOverride`, `AuditLog` |
| `GET` | `/api/tracks/leaderboard` | Get full standings for Admin or Privacy View for non-admin | `Track`, `Team`, `Review`, `ReviewScore` | None |
| `GET` | `/api/tracks/public-leaderboard` | Public unauthenticated Top 10 privacy view | `Track`, `Team`, `Review`, `ReviewScore` | None |

---

## 13. Database Write Inventory

```text
FILE: backend/src/routes/teams.ts
  - Line 586: prisma.team.create() -> Writes Team record on registration
  - Line 686: prisma.team.update() -> Writes projectUrl, demoUrl, presentationUrl, projectTitle, projectDesc, techStack
  - Line 718: prisma.team.update() -> Writes admin update fields (locked status, status, details)

FILE: backend/src/routes/reviews.ts
  - Line 228: prisma.evaluationClaim.create() -> Writes new EvaluationClaim slot
  - Line 291: prisma.evaluationClaim.update() -> Updates claim status to RELEASED
  - Line 423: prisma.review.update() / prisma.review.create() -> Writes Review header record
  - Line 435: prisma.reviewScore.deleteMany() -> Clears previous draft scores for reviewId
  - Line 455: prisma.reviewScore.createMany() -> Writes individual ReviewScore rows
  - Line 465: prisma.evaluationClaim.updateMany() -> Updates claim status to COMPLETED
  - Line 471: prisma.user.update() -> Updates judgeStatus to Available

FILE: backend/src/routes/tracks.ts
  - Line 62:  prisma.track.create() -> Creates new competition track
  - Line 96:  prisma.track.update() -> Updates track details or locks results/frozenLeaderboard
```

---

## 14. Database Read Inventory

```text
FILE: backend/src/routes/teams.ts
  - Line 112: prisma.question.findMany() -> Reads team Q&A history
  - Line 135: team.reviews.forEach() -> Reads Review & ReviewScore rows for workspace status

FILE: backend/src/routes/reviews.ts
  - Line 29:  prisma.reviewRound.findMany() -> Reads active rounds and criteria
  - Line 83:  prisma.judgeAssignment.findMany() -> Reads assigned team roster for logged-in judge
  - Line 340: prisma.review.findFirst() -> Reads draft/submitted review for team & round
  - Line 380: prisma.judgingCriterion.findMany() -> Reads rubric criteria for validation

FILE: backend/src/routes/tracks.ts
  - Line 194: prisma.track.findUnique() -> Reads track status and frozenLeaderboard
  - Line 228: prisma.team.findMany() -> Reads teams and submitted reviews for leaderboard computation
```

---

## 15. Complete Data Flow Diagram

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               1. STUDENT SUBMISSION FLOW                               │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [Student Leader]
        │
        │ Enters GitHub URL, Demo URL, Title, Tech Stack in `StudentDashboard.tsx`
        ▼
 [HTTP PUT /api/teams/:id]
        │
        ▼
 [express Route Handler: backend/src/routes/teams.ts]
        │
        ├─ Validates payload via `projectUpdateSchema` (zod)
        ├─ Verifies team is not locked (`locked === false`)
        ▼
 [Prisma ORM: `prisma.team.update()`]
        │
        ▼
 [SQLite Database: `database.db` -> Table: `Team`]
        │
        └─ Fields Written: `projectUrl`, `demoUrl`, `presentationUrl`, `projectTitle`, `projectDesc`, `techStack`


┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                2. JUDGING & SCORING FLOW                               │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [Judge]
        │
        │ Opens Team Scorecard (`TeamReviews.tsx`)
        ▼
 [HTTP GET /api/reviews/rounds & GET /api/reviews/draft/:teamId]
        │
        ▼
 [Frontend State: `useState<Record<string, number>>({})`]
        │
        ├─ Debounced Auto-Save (1500ms) -> `localStorage` + `POST /api/reviews/save` (`status: "DRAFT"`)
        │
        └─ Judge clicks "Finalize & Submit Scorecard"
               │
               ▼
 [HTTP POST /api/reviews/save (`status: "SUBMITTED"`)]
        │
        ▼
 [express Route Handler: backend/src/routes/reviews.ts]
        │
        ├─ Validates integer scores & criteria maxMarks constraints
        ├─ Opens `prisma.$transaction`
        ├─ Upserts `Review` row (`status: "SUBMITTED"`)
        ├─ Deletes previous `ReviewScore` rows for `reviewId`
        ├─ Executes `prisma.reviewScore.createMany()`
        ├─ Updates `EvaluationClaim` (`status: "COMPLETED"`)
        └─ Resets `User.judgeStatus` (`"Available"`)
        │
        ▼
 [SQLite Database: `database.db` -> Tables: `Review`, `ReviewScore`, `EvaluationClaim`]


┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              3. LEADERBOARD COMPUTATION FLOW                           │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [Caller: Admin / Student / Public Page]
        │
        ▼
 [HTTP GET /api/tracks/leaderboard or /api/tracks/public-leaderboard]
        │
        ▼
 [backend/src/routes/tracks.ts: `computeLeaderboard()`]
        │
        ├─ Executes `prisma.team.findMany({ include: { reviews: { include: { scores: true } } } })`
        ├─ Computes `RoundAverage` = Sum of scores / Number of submitted reviews in round
        ├─ Computes `FinalScore` = Sum of RoundAverages across active rounds
        ├─ Sorts teams by `FinalScore` descending & assigns ranks
        │
        ├── IF ADMINISTRATOR: Returns full standings with exact scores, ranks, breakdown
        │
        └── IF PUBLIC / NON-ADMIN (`computePublicLeaderboard()`):
               │
               ├─ Takes Top 10 teams by score
               ├─ STRIPS `score`, `rank`, `reviewsCount` fields
               ├─ Formats human-facing Team ID (`formatHumanTeamId()`, e.g. "T003")
               └─ SORTS TOP 10 TEAMS BY HUMAN-FACING TEAM ID IN ASCENDING NATURAL ORDER
```

---

## 16. Master Data Location Table

| Information | Database Model | Exact Field | Type | Written By | API Write Route | Read By | Final Usage |
|-------------|----------------|-------------|------|------------|-----------------|---------|-------------|
| GitHub URL | `Team` | `projectUrl` | `String?` | Team Lead / Admin | `PUT /api/teams/:id` | Judges, Admin, Public | Evaluation & Repo Verification |
| Demo URL | `Team` | `demoUrl` | `String?` | Team Lead / Admin | `PUT /api/teams/:id` | Judges, Admin, Public | Product Demonstration |
| Presentation URL | `Team` | `presentationUrl` | `String?` | Team Lead / Admin | `PUT /api/teams/:id` | Judges, Admin | Pitch Deck Review |
| Project Title | `Team` | `projectTitle` | `String?` | Team Lead / Admin | `PUT /api/teams/:id` | All Roles | Display & Leaderboard |
| Project Description | `Team` | `projectDesc` | `String?` | Team Lead / Admin | `PUT /api/teams/:id` | Judges, Admin | Project Overview |
| Technology Stack | `Team` | `techStack` | `String?` | Team Lead / Admin | `PUT /api/teams/:id` | Judges, Admin | Tech Assessment |
| Problem Statement | `Team` | `problemStatement` | `String?` | Team Lead / Admin | `PUT /api/teams/:id` | Judges, Admin | Problem Matching |
| Track | `Team` | `trackId` | `String` | Admin | `POST /api/teams` | All Roles | Track Categorization |
| Review 1 Score | `ReviewScore` / `Review` | `ReviewScore.score` where `Review.round.sequence = 1` | `Float` | Judge | `POST /api/reviews/save` | Admin, System | Round 1 Standing |
| Review 2 Score | `ReviewScore` / `Review` | `ReviewScore.score` where `Review.round.sequence = 2` | `Float` | Judge | `POST /api/reviews/save` | Admin, System | Round 2 Standing |
| Review 3 Score | `ReviewScore` / `Review` | `ReviewScore.score` where `Review.round.sequence = 3` | `Float` | Judge | `POST /api/reviews/save` | Admin, System | Round 3 Standing |
| Individual Criterion Scores | `ReviewScore` | `score` | `Float` | Judge | `POST /api/reviews/save` | Admin, Judge | Rubric Breakdown |
| Judge Comments | `Review` | `comments` | `String?` | Judge | `POST /api/reviews/save` | Admin, Student (Anonymized) | Qualitative Feedback |
| Judge Assignment | `JudgeAssignment` | `judgeId`, `teamId`, `order` | `String`, `Int` | Admin / System | `POST /api/judges/assign` | Judges, System | Judging Roster Queue |
| Final Score | CALCULATED | Sum of `RoundAverage` | `Float` | System (Dynamic) | N/A (Computed on Read) | Admin, System | Standings & Leaderboard |
| Normalized Score | N/A | NO NORMALIZATION FOUND | N/A | N/A | N/A | N/A | N/A |
| Leaderboard Rank | CALCULATED | Position index after sorting by score desc | `Int` | System (Dynamic) | N/A (Computed on Read) | Admin | Rankings Display |
| Human-Facing Team ID | `Team` | `teamCode` or `registrationId` | `String?` | System / Admin | `POST /api/teams` | Public, Students | Public Privacy Leaderboard |

---

## 17. File-Level Evidence

1. `backend/prisma/schema.prisma`
   - Lines 88–178: Definition of `Team` model containing `projectUrl`, `demoUrl`, `presentationUrl`, `projectTitle`, `projectDesc`, `techStack`.
   - Lines 290–314: Definition of `Review` model with `@@unique([roundId, teamId, judgeId])`.
   - Lines 316–329: Definition of `ReviewScore` model with `score Float` field and `@@unique([reviewId, criterionId])`.

2. `backend/src/routes/teams.ts`
   - Lines 51–59: `projectUpdateSchema` Zod validation definition for workspace updates.
   - Lines 686–694: `PUT /api/teams/:id` route handler executing `prisma.team.update()` to write submission URLs and project details.

3. `backend/src/routes/reviews.ts`
   - Lines 9–14: `scoreSchema` enforcing whole integer scores (`Number.isInteger(val)`).
   - Lines 365–480: `POST /api/reviews/save` route handler executing `prisma.$transaction` to save draft/submitted reviews and `prisma.reviewScore.createMany()`.

4. `backend/src/routes/tracks.ts`
   - Lines 162–191: `calculateTeamWeightedScore()` function computing average score per round across submitted reviews.
   - Lines 193–325: `computeLeaderboard()` function querying teams, computing final scores, sorting descending, and calculating rank movement.
   - Lines 365–400: `computePublicLeaderboard()` function selecting top 10 teams, stripping score fields, formatting human team IDs, and re-sorting by team ID ascending.

5. `frontend/src/features/dashboard/components/StudentDashboard.tsx`
   - Lines 360–440: Workspace edit form collecting `projectTitle`, `problemStatement`, `projectDesc`, `techStack`, `projectUrl` and submitting to `PUT /api/teams/:id`.

6. `frontend/src/features/reviews/pages/TeamReviews.tsx`
   - Lines 83–132: Local draft management using `localStorage.getItem()` and auto-saving via debounced `POST /api/reviews/save` (`status: "DRAFT"`).
   - Lines 542–652: Rubric criteria evaluation form with touch integer sliders submitting finalized scorecards via `POST /api/reviews/save` (`status: "SUBMITTED"`).

---

## 18. Potential Data Integrity Issues

1. **Lack of Server-Side Deadline Enforcement on Workspace Edits**:
   - While `Team.locked` exists, if an admin does not explicitly set `locked: true`, student team leaders can edit their GitHub repository URL after the hackathon clock has expired.
2. **Dynamic Un-weighted Score Calculation**:
   - `ReviewRound.weight` and `JudgingCriterion.weight` fields exist in the schema (`@default(1.0)`), but `calculateTeamWeightedScore()` in `routes/tracks.ts` performs a direct unweighted sum of criteria scores. If round weights are modified in administrative settings, the leaderboard query does not multiply round averages by `round.weight`.
3. **No Database Constraint Preventing Exceeding Max Marks on Direct Inserts**:
   - Max mark validation is performed at the Express Zod route layer (`scoreInput.score <= criterion.maxMarks`), but SQLite schema column `score Float` does not have a database check constraint (`CHECK (score <= maxMarks)`).

---

## 19. Recommendations

1. **Automatic Round Deadline Locking**:
   - Implement an automated background trigger or middleware check that automatically checks `ReviewRound.submissionDeadline` and rejects workspace/review edits if `now() > submissionDeadline`.
2. **Incorporate Round Weights in Aggregation**:
   - Update `calculateTeamWeightedScore()` in `routes/tracks.ts` to multiply round averages by `round.weight` so custom round weighting configured by admins is honored.
3. **Audit Log Persistence for Leaderboard Freezes**:
   - Ensure that whenever `Track.resultsLocked` or `Track.frozenLeaderboard` is updated, an `AuditLog` entry is explicitly created with the actor's `userId`.
