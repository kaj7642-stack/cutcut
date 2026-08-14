import { Pool, type QueryResultRow } from "pg";

declare global {
  var __clipPool: Pool | undefined;
  var __clipSchemaReady: Promise<void> | undefined;
}

function getPool(): Pool {
  if (global.__clipPool) return global.__clipPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL 환경변수가 설정되어 있지 않습니다. Neon/Supabase 등에서 발급받은 Postgres 연결 문자열을 .env.local에 넣어주세요."
    );
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  global.__clipPool = pool;
  return pool;
}

function ensureSchema(): Promise<void> {
  if (global.__clipSchemaReady) return global.__clipSchemaReady;

  global.__clipSchemaReady = getPool().query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL DEFAULT '',
      kakao_id TEXT UNIQUE,
      naver_id TEXT,
      nickname TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS users_naver_id_uniq
      ON users (naver_id) WHERE naver_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usage_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      event TEXT NOT NULL,
      url TEXT,
      data JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS render_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      project_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'shorts',
      quality TEXT NOT NULL DEFAULT 'high',
      clips_count INTEGER NOT NULL DEFAULT 1,
      total_duration REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      category TEXT NOT NULL DEFAULT 'general',
      message TEXT NOT NULL,
      email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `).then(() => undefined);

  return global.__clipSchemaReady;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  await ensureSchema();
  const result = await getPool().query<T>(text, params);
  return result.rows;
}
