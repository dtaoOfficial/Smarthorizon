import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'smarthorizon-access-secret-key-12345';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'smarthorizon-refresh-secret-key-67890';

export interface TokenPayload {
  userId: string;
  id?: string;
  role: string;
  email: string;
  name?: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export interface DownloadTokenPayload {
  userId: string;
  role: string;
  teamId: string;
  fileId: string;
  purpose: 'file_download';
  nonce: string;
}

export function generateDownloadToken(payload: { userId: string; role: string; teamId: string; fileId?: string }): string {
  const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const fileId = payload.fileId || `ppt_${payload.teamId}`;
  return jwt.sign({ ...payload, fileId, purpose: 'file_download', nonce }, ACCESS_TOKEN_SECRET, { expiresIn: '60s' });
}

export function verifyDownloadToken(token: string): DownloadTokenPayload | null {
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as DownloadTokenPayload;
    if (decoded.purpose !== 'file_download') return null;
    return decoded;
  } catch (error) {
    return null;
  }
}
