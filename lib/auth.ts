import crypto from "node:crypto";
import { query } from "./db";

const SCRYPT_KEYLEN = 64;
const SESSION_DAYS = 30;

export const SESSION_COOKIE_NAME = "clip_session";

export interface User {
  id: number;
  email: string;
  nickname: string | null;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  if (hashBuffer.length !== derived.length) return false;
  return crypto.timingSafeEqual(hashBuffer, derived);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)", [
    token,
    userId,
    expiresAt,
  ]);
  return token;
}

export async function getUserBySession(token: string | undefined | null): Promise<User | null> {
  if (!token) return null;
  const rows = await query<{ id: number; email: string; nickname: string | null; expires_at: string }>(
    `SELECT u.id, u.email, u.nickname, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = $1`,
    [token]
  );
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return { id: row.id, email: row.email, nickname: row.nickname };
}

export async function deleteSession(token: string): Promise<void> {
  await query("DELETE FROM sessions WHERE token = $1", [token]);
}

export async function findUserByEmail(
  email: string
): Promise<{ id: number; email: string; passwordHash: string } | undefined> {
  const rows = await query<{ id: number; email: string; password_hash: string }>(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [normalizeEmail(email)]
  );
  const row = rows[0];
  if (!row) return undefined;
  return { id: row.id, email: row.email, passwordHash: row.password_hash };
}

export async function findOrCreateKakaoUser(
  kakaoId: string,
  email: string | null,
  nickname: string | null
): Promise<User> {
  const existing = await query<{ id: number; email: string; nickname: string | null }>(
    "SELECT id, email, nickname FROM users WHERE kakao_id = $1",
    [kakaoId]
  );
  if (existing[0]) return existing[0];

  const userEmail = email || `kakao_${kakaoId}@kakao.user`;

  const emailExists = await findUserByEmail(userEmail);
  if (emailExists) {
    await query("UPDATE users SET kakao_id = $1, nickname = $2 WHERE id = $3", [
      kakaoId,
      nickname,
      emailExists.id,
    ]);
    return { id: emailExists.id, email: emailExists.email, nickname };
  }

  const rows = await query<{ id: number }>(
    "INSERT INTO users (email, password_hash, kakao_id, nickname) VALUES ($1, $2, $3, $4) RETURNING id",
    [userEmail, "", kakaoId, nickname]
  );
  return { id: rows[0].id, email: userEmail, nickname };
}

export async function findOrCreateNaverUser(
  naverId: string,
  email: string | null,
  nickname: string | null
): Promise<User> {
  const existing = await query<{ id: number; email: string; nickname: string | null }>(
    "SELECT id, email, nickname FROM users WHERE naver_id = $1",
    [naverId]
  );
  if (existing[0]) return existing[0];

  const userEmail = email || `naver_${naverId}@naver.user`;

  const emailExists = await findUserByEmail(userEmail);
  if (emailExists) {
    await query("UPDATE users SET naver_id = $1, nickname = $2 WHERE id = $3", [
      naverId,
      nickname,
      emailExists.id,
    ]);
    return { id: emailExists.id, email: emailExists.email, nickname };
  }

  const rows = await query<{ id: number }>(
    "INSERT INTO users (email, password_hash, naver_id, nickname) VALUES ($1, $2, $3, $4) RETURNING id",
    [userEmail, "", naverId, nickname]
  );
  return { id: rows[0].id, email: userEmail, nickname };
}
