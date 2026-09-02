// ─────────────────────────────────────────
// CutCut Anime Generator – SQLite Database
// ─────────────────────────────────────────
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "anime.db");

declare global {
  var __animeDb: DatabaseSync | undefined;
}

function getDb(): DatabaseSync {
  if (global.__animeDb) return global.__animeDb;

  fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  // ── Schema ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      style_mode TEXT NOT NULL DEFAULT '2d' CHECK(style_mode IN ('2d','3d')),
      aspect_ratio TEXT NOT NULL DEFAULT '16:9' CHECK(aspect_ratio IN ('9:16','16:9')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      style_mode TEXT NOT NULL DEFAULT '2d' CHECK(style_mode IN ('2d','3d')),
      style_prompt TEXT NOT NULL DEFAULT '',
      voice_preset TEXT NOT NULL DEFAULT '{}',
      seed_value INTEGER NOT NULL DEFAULT 0,
      reference_images TEXT NOT NULL DEFAULT '[]',
      subtitle_color TEXT NOT NULL DEFAULT '#FFFFFF',
      subtitle_font TEXT NOT NULL DEFAULT 'Noto Sans KR',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      episode_number INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','generating','completed','failed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
      scene_number INTEGER NOT NULL DEFAULT 1,
      description TEXT NOT NULL DEFAULT '',
      dialogue TEXT NOT NULL DEFAULT '',
      character_ids TEXT NOT NULL DEFAULT '[]',
      camera_direction TEXT NOT NULL DEFAULT 'static',
      duration_seconds REAL NOT NULL DEFAULT 3.0,
      generated_image_url TEXT NOT NULL DEFAULT '',
      generated_video_url TEXT NOT NULL DEFAULT '',
      tts_audio_url TEXT NOT NULL DEFAULT '',
      subtitle_text TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      prompt_used TEXT NOT NULL DEFAULT '',
      api_log TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_settings (
      id TEXT PRIMARY KEY,
      provider_type TEXT NOT NULL CHECK(provider_type IN ('image_gen','video_gen','tts')),
      provider_name TEXT NOT NULL DEFAULT '',
      api_key TEXT NOT NULL DEFAULT '',
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS render_jobs (
      id TEXT PRIMARY KEY,
      episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
      aspect_ratio TEXT NOT NULL DEFAULT '16:9',
      output_path TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','rendering','completed','failed')),
      progress REAL NOT NULL DEFAULT 0,
      error TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  global.__animeDb = db;
  return db;
}

// ── Generic helpers ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params = Record<string, any>;

function convertParams(params: Params): Params {
  const out: Params = {};
  for (const [k, v] of Object.entries(params)) {
    const key = k.startsWith("$") ? k : `$${k}`;
    out[key] = v ?? null;
  }
  return out;
}

export function run(sql: string, params: Params = {}): void {
  const converted = convertParams(params);
  getDb().prepare(sql).run(converted as Record<string, import("node:sqlite").SQLInputValue>);
}

export function get<T>(sql: string, params: Params = {}): T | undefined {
  const converted = convertParams(params);
  return getDb().prepare(sql).get(converted as Record<string, import("node:sqlite").SQLInputValue>) as T | undefined;
}

export function all<T>(sql: string, params: Params = {}): T[] {
  const converted = convertParams(params);
  return getDb().prepare(sql).all(converted as Record<string, import("node:sqlite").SQLInputValue>) as T[];
}

export default getDb;
