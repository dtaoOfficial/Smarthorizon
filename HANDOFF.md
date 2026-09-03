# SmartHorizon — Handoff Notes (2026-09-03)

This document summarizes deployment and data-fix work done on the SmartHorizon hackathon platform on 2026-09-03, covering both the local development environment and the live production server. It's meant to bring a new developer (or an AI assistant helping one) fully up to speed without needing to reconstruct context from chat history.

## 1. Infrastructure overview

**Repo:** `https://github.com/dtaoOfficial/Smarthorizon.git` (branch `main`) — this is a **fresh repository**, started today from a clean single commit containing the current working state of the app. It replaces a prior connection to `tanish0320/Hackathon_Interface`, which was never modified and remains available separately if old commit history is ever needed.

**Deployment model:** Docker Compose, two services defined in `docker-compose.yml`:
- `backend` — Node/Express/Prisma API, built from `backend/Dockerfile` (multi-stage: full `npm ci` + `tsc` build stage, then a slim runtime image containing only `dist/`, `node_modules`, `prisma/`, and `package.json` — **no `src/` folder in the running container**, and **no `tsconfig.json`** in the final image either. This matters for anyone writing one-off scripts to run inside the container — see §5.)
- `frontend` — Vite/React SPA, served via nginx, built from `frontend/Dockerfile`.

**Live database:** SQLite, at `backend/database.db` (+ `-shm`/`-wal`), bind-mounted into the backend container (not baked into the image). This file, along with `backend/uploads/`, is the **only** place live event data lives — it is intentionally excluded from git via `.gitignore` and must never be overwritten by a deploy.

**Production server access:**
- SSH: root login works for a normal shell (used throughout for `docker exec`/`docker cp`/file moves).
- SFTP (FileZilla): root SFTP login is **blocked** at the server level ("unable to initialise SFTP on server"). Only the `ubuntu` user works for SFTP, and `ubuntu` does **not** have write access to the web root (`/var/www/html/newhorizonindiaedu/smarthorizon/portal/SmartHorizon/`) — uploads there fail with "permission denied."
  - **Working pattern:** upload files via FileZilla (as `ubuntu`) to `/tmp` (world-writable), then `mv` them into place from a root SSH session. This was used repeatedly today and is the reliable way to get files onto this server until/unless SFTP permissions get reconfigured.
- Backend container name on the server: `smarthorizon-backend-1`.

## 2. Data fixes made today

### 2.1 Reset script bug fix — `backend/reset.sh`
The script originally tried to `docker cp` a `.ts` file into the container at `/app/src/...` and run it via `npx tsx`, then `npx prisma generate`. This fails against the production image because there is no `src/` folder in the container. **Fixed** to instead check for and run the already-compiled `dist/reset_marks_and_assignments.js` directly via `node` (no rebuild, no `prisma generate` needed — the client is already generated in the image). Also removed the `-it` docker flag since it requires an interactive TTY not available in all invocation contexts.

Reset was run on both local and production — see `backend/src/reset_marks_and_assignments.ts` for exactly what it clears (review scores/overrides/reviews/claims/judge assignments/feedback/notifications) vs. preserves (attendance/check-in data).

### 2.2 Missing team member — Team "HackStack" (`SHIH26-TID-211`)
Was imported with only 4 of 5 registered members. Added the 5th member, **Nitin S** (`nithin.s@smarthorizon.com`, `9876543256`), as a `TeamMember` row with `userId: null` (no login account) — matching how members 2–4 of this exact team were originally imported (see `backend/src/import_strict_118.ts` lines ~230–255: only team leaders get a `User` account; other members are contact-only records). Also backfilled the flat `Team.member5Name/Email/Mobile` fields, which several parts of the app (exports, admin dashboard) read directly from the `Team` row rather than the `TeamMember` relation.

Applied via a one-off script, `backend/add_member_211.cjs` (already run and deleted from both environments — kept in git history/this repo for reference).

### 2.3 Team "Tech Bros" (`SHIH26-TID-355`) — wrong Problem Statement ID
Team name, track (Healthcare), and full 5-person roster were already correct everywhere. Only `selectedPsId` was wrong: `SH-HLT-11` instead of `SH-HLT-10`. Fixed in:
- `backend/database.db` (both environments, via `backend/fix_ps_355.cjs`)
- `backend/prisma/registrations.json`
- `registration-september-11th-118.csv`
- `Complete Registration-118 updated on 19-Aug-26 (2).xlsx`
- `Filtered_Complete_Registration_118.xlsx`

(`judge_mapping.xlsx` already had the correct `SH-HLT-10` for this team — that's what caught the discrepancy in the first place.)

### 2.4 Judge assignment population — all 118 teams
Before today, `JudgeAssignment` was essentially empty on both environments (cleared by the reset in §2.1, and never repopulated). Wrote **`backend/src/sync_excel_judge_assignments.ts`** to parse `judge_mapping.xlsx` (sheet `team_mapping`: columns `S.NO`, `Evaluator name`, `Team ID`, `Problem statement`, `Venue`) and populate it correctly:

- Matches all 18 evaluator names in the sheet to their `User` accounts (`roleId = 'JUDGE'`) via email, cross-referenced against the `Jury_name_list` sheet (handles name-format inconsistencies like "Mr.Nilesh" vs "Mr. Nilesh", "Dr. Jayashree" vs DB's "Dr. R. Jayashree", etc.)
- Sets `JudgeAssignment.trackId` from the team's own `trackId` (not re-derived from the sheet's domain text, which uses different naming than the `Track` table, e.g. "Health Tech" vs "Healthcare")
- Assigns sequential per-judge `order` (1-based) matching sheet row order
- Syncs each judge's `assignedTracks` (the `Track.judges`/`User.assignedTracks` many-to-many) to exactly the tracks their assignments cover, using `set` (full replace, not additive)
- Sets `currentTeamId`/`nextTeamId` on each judge to their order-1/order-2 teams, so judge terminals show a queue immediately without needing the separate `/api/judges/:id/queue` reorder call
- Handled two data-entry typos in the source sheet (stray leading commas on two Team IDs: `,SHIH26-TID-511` and `,SHIH26-TID-422`)

**Run via:** `docker exec <container> npx tsx dist/sync_excel_judge_assignments.ts`, with `judge_mapping.xlsx` copied into the container root (`/app/judge_mapping.xlsx`) and the script copied into `/app/dist/` (co-located with the compiled `db.js` so its relative `import prisma from './db'` resolves against the existing compiled output — no rebuild needed). It is **idempotent** (uses `upsert`), safe to re-run.

**Important caveat discovered on the server:** the script only adds/updates rows matching what's in the sheet — it never deletes assignments outside that set. On the server, this surfaced 6 pre-existing `JudgeAssignment` rows (Dr. R. Jayashree assigned to 6 teams — `TID-228, 267, 268, 354, 387, 427` — created earlier the same day, timestamp `08:27 UTC`, almost certainly via the live admin panel) that **contradicted** the authoritative sheet, which assigns those same 6 teams to Dr. Devendra Singh Basera. These stale rows were identified and removed manually (see git history / chat log for the diagnostic query used). **Final verified state on both environments: 118 teams, 118 `JudgeAssignment` rows, 18 distinct judges assigned, no duplicates.**

## 3. Deployment method used

Given the SFTP/root-permission constraints (§1), files were deployed to the server individually via FileZilla → `/tmp` → root `mv` into place, one file at a time with a byte-size verification (`ls -la`) after each move. Two of the seven changed/added files (`registrations.json`, the CSV) didn't need file transfer at all — they were patched directly on the server with a single-line `sed` command each, since only one field needed to change and uniqueness was verified beforehand (`git show HEAD:<file> | grep -c ...`).

**No `docker compose down`/`--build` was needed or performed** — none of today's changes touched application code (routes, `server.ts`, etc.), only data files plus one-off scripts invoked directly via `docker exec`.

## 4. Current verified state (both local and production, as of today)

```
teamCount: 118
judgeCount: 21   (18 with active assignments; 3 reserve/simulation judges intentionally have 0)
judgeAssignmentCount: 118
distinctTeamsAssigned: 118
distinctJudgesAssigned: 18
TID-355 selectedPsId: "SH-HLT-10"
TID-211 (HackStack) member count: 5/5
```

## 5. Notes for whoever picks this up next

- **Writing one-off admin/data scripts:** the production container has no `src/` and no `tsconfig.json`. Either (a) write plain `.cjs` requiring `./dist/db` directly (works with zero setup, used for most fixes above), or (b) if using TypeScript, `npx tsx` works fine without a `tsconfig.json` for simple relative-import scripts — just make sure any file it needs (like `db.js`) already exists compiled in `dist/`.
- **SFTP to the server:** don't fight the `ubuntu`-can't-write-to-webroot issue — just stage through `/tmp` and `mv` as root. Trying to `chown`/`chmod` the web root to "fix" this wasn't attempted and probably isn't worth the risk on a live server.
- **`backend/uploads/` is not in `.gitignore`** — currently only contains 4 small test fixture files, but real participant submissions live there on the server. Worth adding an ignore rule before that folder accumulates real uploads that shouldn't be in git.
- **The git history restart:** the previous `.git` folder (with full history against `tanish0320/Hackathon_Interface`) was moved to `../SmartHorizon_old_git_backup` rather than deleted, in case anything from that history is ever needed.
