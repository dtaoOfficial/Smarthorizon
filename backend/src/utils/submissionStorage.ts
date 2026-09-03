import path from 'path';
import fs from 'fs';

/**
 * Sanitizes folder and file names to prevent path traversal and invalid characters.
 */
export function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') return 'unnamed';
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').substring(0, 80);
}

/**
 * Generates the canonical storage folder name for a team:
 * Format: {Team ID / Registration ID}_{Sanitized Team Name}
 * Example: SHIH26-TID-031_WellWare
 */
export function getTeamFolderName(team: { id: string; registrationId?: string | null; teamCode?: string | null; name: string }): string {
  const code = team.registrationId || team.teamCode || `TID-${team.id.substring(0, 6).toUpperCase()}`;
  const sanitizedCode = sanitizeName(code);
  const sanitizedName = sanitizeName(team.name);
  return `${sanitizedCode}_${sanitizedName}`;
}

/**
 * Returns the absolute directory path for a team submission category, creating it if needed.
 * Folder Structure:
 * uploads/submissions/{TeamFolder}/{category}/
 * Example: uploads/submissions/SHIH26-TID-031_WellWare/presentation/
 */
export function getTeamSubmissionCategoryDir(
  team: { id: string; registrationId?: string | null; teamCode?: string | null; name: string },
  category: 'presentation' | 'source-code' | 'documentation' | 'other' = 'presentation'
): { absoluteDir: string; relativeDir: string; teamFolder: string } {
  const teamFolder = getTeamFolderName(team);
  const uploadsBaseDir = path.resolve(__dirname, '../../uploads/submissions');
  const relativeDir = `/uploads/submissions/${teamFolder}/${category}`;
  const absoluteDir = path.join(uploadsBaseDir, teamFolder, category);

  if (!fs.existsSync(absoluteDir)) {
    fs.mkdirSync(absoluteDir, { recursive: true });
  }

  return { absoluteDir, relativeDir, teamFolder };
}
