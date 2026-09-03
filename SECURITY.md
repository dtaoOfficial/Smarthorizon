# Security Policy & Architecture Guide — SmartHorizon Hackathon 2026

## 1. Overview
SmartHorizon 2026 is an enterprise-grade hackathon management and evaluation platform designed with strict zero-trust principles, data protection controls, and real-time operational auditing.

---

## 2. Role-Based Access Control (RBAC) & Authorization

The platform strictly enforces role segregation across all backend API endpoints via `authenticateToken` and `requireRole(['ADMINISTRATOR' | 'JUDGE' | 'STUDENT'])` middlewares.

### Access Control Matrix
| Endpoint / Resource | Admin | Judge | Student | Notes |
| :--- | :---: | :---: | :---: | :--- |
| `POST /api/auth/register-admin` | ❌ Disabled | ❌ | ❌ | Environment setup key required (`INITIAL_ADMIN_SECRET`) |
| `GET /api/registration/export-attendance` | ✅ | ❌ | ❌ | Protected exports (CSV, XLSX, PDF) |
| `GET /api/registration/teams/export-qr-pdf` | ✅ | ❌ | ❌ | Bulk A4 Printable QR PDF generator |
| `POST /api/reviews/claim` | ❌ | ✅ | ❌ | Open judge pool atomic claim (`@@unique([teamId, roundId])`) |
| `POST /api/reviews/override` | ✅ | ❌ | ❌ | Administrative score override with mandatory reason & audit log |
| `POST /api/teams/:id/submit-pdf` | ✅ | ❌ | ✅ (Team Member) | Domain PDF upload with magic bytes verification |
| `GET /api/feedback` | ✅ | ❌ | ❌ | Admin feedback inspection console |

---

## 3. CSV / XLSX Formula Injection Protection (OWASP Compliance)

All attendance export handlers filter and sanitize string cells before rendering. Any cell beginning with formula execution trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) is safely prefixed with an apostrophe (`'`).

```typescript
export const sanitizeCsvCell = (val: string | number | boolean | null | undefined): string => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
};
```

---

## 4. Secure PDF Upload Validation (Magic Bytes Inspection)

To prevent file upload vulnerabilities (unrestricted file upload, RCE, web shell upload), PDF submissions undergo multi-stage server-side validation:

1. **Extension & MIME Filtering**: Only `.pdf` extension and `application/pdf` MIME types accepted by `multer`.
2. **Magic Bytes Header Verification**: The raw buffer header must begin with `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`).
3. **Safe Storage Naming**: Saved under `uploads/submissions/` using unguessable, non-sequential filenames (`sub_[teamId]_[timestamp]_[random].pdf`).
4. **File Size Capping**: Hard limit of 20MB (`20 * 1024 * 1024` bytes).

---

## 5. QR Code Token Security & Privacy

Venue QR tokens (`teamCode` / `registrationId`) contain zero personally identifiable information (PII) or sensitive passwords. The QR payload contains only a secure identifier (e.g. `SH26-A1B2C3D4`) used for server-side lookup upon scanner verification.

---

## 6. Score Overrides & Append-Only Audit Logging

All sensitive administrative actions (score overrides, check-in state resets, team disbands, PDF uploads) generate append-only entries in the `AuditLog` table. Original judge evaluation scores are never hard deleted; overrides are recorded in the `ReviewOverride` table storing `originalScore`, `newScore`, `changedById`, `reason`, and `timestamp`.

---

## 7. PostgreSQL & Database Concurrency Readiness

SQLite is configured with `WAL` (Write-Ahead Logging) mode, `busy_timeout = 5000ms`, and `foreign_keys = ON`. The Prisma schema is engineered to seamlessly migrate to PostgreSQL for multi-region or high-scale deployments without schema modifications.
