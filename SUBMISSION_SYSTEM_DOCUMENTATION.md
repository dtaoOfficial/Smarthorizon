# Smart Horizon 2026 // Project Submission System Documentation

## Overview
The Smart Horizon 2026 Project Submission System is a production-ready, full-stack submission pipeline designed for hackathon teams to submit their final project deliverables.

---

## 1. Database Architecture & Models

### `ProjectSubmission` Model
- `id`: Unique UUID identifier.
- `teamId`: Unique foreign key to `Team` (enforces 1 canonical active submission per team).
- `projectTitle`: Required string (3–150 characters).
- `projectAbstract`: Required string (strictly <= 100 words enforced both client and server-side).
- `githubUrl`: Public GitHub repository URL (`https://github.com/...`).
- `presentationUrl`: Path to uploaded PowerPoint presentation (`/uploads/submissions/...`).
- `originalFileName`: User-facing presentation filename (e.g. `SHIH26-TID-031_WellWare.pptx`).
- `fileSize`: File size in bytes.
- `mimeType`: PowerPoint MIME type.
- `status`: `SUBMITTED`, `DRAFT`, or `LOCKED`.
- `version`: Version counter incremented upon each resubmission.
- `submittedById`: Foreign key to `User` (Student Leader).
- `submittedAt` & `updatedAt`: ISO 8601 timestamps.

### `ProjectSubmissionRevision` Model
- Preserves full historical audit log of every revision/update submitted by a team.

### `Hackathon` Model Extensions
- `submissionsOpen`: Global Boolean flag (`true` = Submissions Open, `false` = Submissions Closed).
- `submissionOpenTime`: Optional scheduled start timestamp.
- `submissionCloseTime`: Optional scheduled end timestamp.

---

## 2. API Conventions & Permissions

| Method | Endpoint | Access / Role | Description |
|---|---|---|---|
| `GET` | `/api/submissions/status` | Public / Auth | Check global submission open state and schedule window. |
| `POST` | `/api/submissions/toggle` | Admin | Open/Close submissions globally and set schedule windows. |
| `GET` | `/api/submissions/my-team` | Student | Get authenticated student's team submission status and revision history. |
| `POST` | `/api/submissions/upload-presentation` | Student / Admin | Upload `.ppt` / `.pptx` presentation file (max 25 MB). |
| `POST` | `/api/submissions/submit` | Student (Leader) | Submit or update project deliverables with strict server-side validations. |
| `GET` | `/api/submissions/admin/all` | Admin | Get submission dashboard telemetry and all team submission details. |
| `GET` | `/api/submissions/export-csv` | Admin | Stream downloadable CSV report of submissions. |
| `GET` | `/api/submissions/download/:teamId` | Admin / Team | Stream individual PowerPoint file as attachment. |
| `GET` | `/api/submissions/admin/download-all-zip` | Admin | Stream bulk ZIP archive of all submitted presentations (`AdmZip`). |

---

## 3. Server-Side Security & Validation Controls

1. **Submissions Closed Enforcement**:
   Every submission API checks `getSubmissionOpenState()`. If `submissionsOpen` is `false`, the server returns HTTP 403 `SERVER REJECTED: Project submissions are currently CLOSED by hackathon administration.`

2. **Word Count Validation (Abstract <= 100 Words)**:
   Calculates exact word count: `text.trim().split(/\s+/).filter(Boolean).length`. If count > 100, server rejects with HTTP 400.

3. **Public GitHub URL Validation**:
   Validates regex format `/^https:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/)?$/i`. Non-GitHub or malformed URLs are rejected.

4. **File Security & Upload Limits**:
   PowerPoint files (`.ppt`, `.pptx`) are restricted to 25 MB. Storage files are saved in `uploads/submissions/` using normalized, sanitized unique filenames (`sub_ppt_[teamId]_[timestamp]_[hash].pptx`).

5. **Canonical Data Compatibility**:
   When a project is submitted, the transaction atomically updates both `ProjectSubmission` and the canonical fields on `Team` (`projectTitle`, `projectDesc`, `projectUrl`, `presentationUrl`), ensuring full backward compatibility with Judge Console, Leaderboards, and Admin views.

---

## 4. User Interfaces

### Participant Submission Terminal (`/submission`)
- Integrated into Student Portal / Team Control Deck.
- Live status indicator pill (`● SUBMISSIONS OPEN` / `○ SUBMISSIONS CLOSED`).
- Live Abstract word counter (`87 / 100 words`), turning RED if > 100 words.
- Drag & Drop PowerPoint file uploader with progress bar and replace option.
- Pre-submission confirmation modal.
- Submission received success state (`✓ SUBMISSION RECEIVED`) with date/time and update option.

### Admin Submissions Command Center (`/submissions`)
- Submissions Open/Close toggle banner.
- Real-time telemetry cards (Total Teams, Submitted Teams, Pending Teams, Completion Rate %).
- Filters & Search (Team Code, Name, Title, Track filter, Status tabs).
- Action buttons: `[ EXPORT CSV ]` and `[ DOWNLOAD ZIP ]`.
- Submissions table with `[ VIEW SUBMISSION ]` inspector drawer.
