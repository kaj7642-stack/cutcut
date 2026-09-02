import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
  AnimProject, AnimCharacter, AnimEpisode, AnimScene,
  ApiSetting, StyleMode, AspectRatio,
  CameraDirection, ApiType,
} from "./types";

type SqlVal = null | number | bigint | string | NodeJS.ArrayBufferView;

const DATA_DIR = join(process.cwd(), "data");
const DB_PATH = join(DATA_DIR, "animate.db");

mkdirSync(DATA_DIR, { recursive: true });

let _db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (_db) return _db;
  _db = new DatabaseSync(DB_PATH);
  _db.exec("PRAGMA journal_mode=WAL");
  _db.exec("PRAGMA foreign_keys=ON");
  initSchema(_db);
  return _db;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS anim_projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      style_mode TEXT NOT NULL DEFAULT '2d',
      default_aspect_ratio TEXT NOT NULL DEFAULT '16:9',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS anim_characters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES anim_projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      style_prompt TEXT NOT NULL DEFAULT '',
      voice_preset TEXT NOT NULL DEFAULT '',
      seed_value INTEGER,
      reference_images TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS anim_episodes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES anim_projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      raw_script TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS anim_scenes (
      id TEXT PRIMARY KEY,
      episode_id TEXT NOT NULL REFERENCES anim_episodes(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      dialogue TEXT NOT NULL DEFAULT '',
      character_ids TEXT NOT NULL DEFAULT '[]',
      duration REAL NOT NULL DEFAULT 3.0,
      camera_direction TEXT NOT NULL DEFAULT 'static',
      generated_image_url TEXT,
      generated_video_url TEXT,
      tts_audio_url TEXT,
      subtitle_text TEXT NOT NULL DEFAULT '',
      subtitle_color TEXT NOT NULL DEFAULT '#FFFFFF',
      status TEXT NOT NULL DEFAULT 'pending',
      api_log TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS anim_api_settings (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      api_type TEXT NOT NULL,
      api_key TEXT NOT NULL DEFAULT '',
      base_url TEXT NOT NULL DEFAULT '',
      model_name TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);
}

function now() { return new Date().toISOString(); }

// ─── Projects ────────────────────────────────────────────

export function listProjects(): AnimProject[] {
  const db = getDb();
  return db.prepare("SELECT * FROM anim_projects ORDER BY updated_at DESC").all() as unknown as AnimProject[];
}

export function getProject(id: string): AnimProject | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM anim_projects WHERE id = ?").get(id) as AnimProject | undefined;
}

export function createProject(data: { name: string; description?: string; style_mode?: StyleMode; default_aspect_ratio?: AspectRatio }): AnimProject {
  const db = getDb();
  const id = randomUUID();
  const ts = now();
  db.prepare(
    "INSERT INTO anim_projects (id, name, description, style_mode, default_aspect_ratio, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, data.name, data.description ?? "", data.style_mode ?? "2d", data.default_aspect_ratio ?? "16:9", ts, ts);
  return getProject(id)!;
}

export function updateProject(id: string, data: Partial<Pick<AnimProject, "name" | "description" | "style_mode" | "default_aspect_ratio">>): AnimProject | undefined {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); }
  }
  if (fields.length === 0) return getProject(id);
  fields.push("updated_at = ?");
  values.push(now());
  values.push(id);
  db.prepare(`UPDATE anim_projects SET ${fields.join(", ")} WHERE id = ?`).run(...(values as SqlVal[]));
  return getProject(id);
}

export function deleteProject(id: string): boolean {
  const db = getDb();
  const r = db.prepare("DELETE FROM anim_projects WHERE id = ?").run(id);
  return r.changes > 0;
}

// ─── Characters ──────────────────────────────────────────

function rowToCharacter(row: Record<string, unknown>): AnimCharacter {
  return { ...row, reference_images: JSON.parse(row.reference_images as string) } as AnimCharacter;
}

export function listCharacters(projectId: string): AnimCharacter[] {
  const db = getDb();
  return (db.prepare("SELECT * FROM anim_characters WHERE project_id = ? ORDER BY created_at").all(projectId) as Record<string, unknown>[]).map(rowToCharacter);
}

export function getCharacter(id: string): AnimCharacter | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM anim_characters WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToCharacter(row) : undefined;
}

export function createCharacter(data: { project_id: string; name: string; description?: string; style_prompt?: string; voice_preset?: string; seed_value?: number | null }): AnimCharacter {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    "INSERT INTO anim_characters (id, project_id, name, description, style_prompt, voice_preset, seed_value, reference_images, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?)"
  ).run(id, data.project_id, data.name, data.description ?? "", data.style_prompt ?? "", data.voice_preset ?? "", data.seed_value ?? null, now());
  return getCharacter(id)!;
}

export function updateCharacter(id: string, data: Partial<Pick<AnimCharacter, "name" | "description" | "style_prompt" | "voice_preset" | "seed_value" | "reference_images">>): AnimCharacter | undefined {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      fields.push(`${k} = ?`);
      values.push(k === "reference_images" ? JSON.stringify(v) : v);
    }
  }
  if (fields.length === 0) return getCharacter(id);
  values.push(id);
  db.prepare(`UPDATE anim_characters SET ${fields.join(", ")} WHERE id = ?`).run(...(values as SqlVal[]));
  return getCharacter(id);
}

export function deleteCharacter(id: string): boolean {
  const db = getDb();
  return db.prepare("DELETE FROM anim_characters WHERE id = ?").run(id).changes > 0;
}

// ─── Episodes ────────────────────────────────────────────

export function listEpisodes(projectId: string): AnimEpisode[] {
  const db = getDb();
  return db.prepare("SELECT * FROM anim_episodes WHERE project_id = ? ORDER BY created_at").all(projectId) as unknown as AnimEpisode[];
}

export function getEpisode(id: string): AnimEpisode | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM anim_episodes WHERE id = ?").get(id) as AnimEpisode | undefined;
}

export function createEpisode(data: { project_id: string; title: string; description?: string }): AnimEpisode {
  const db = getDb();
  const id = randomUUID();
  const ts = now();
  db.prepare(
    "INSERT INTO anim_episodes (id, project_id, title, description, status, raw_script, created_at, updated_at) VALUES (?, ?, ?, ?, 'draft', '', ?, ?)"
  ).run(id, data.project_id, data.title, data.description ?? "", ts, ts);
  return getEpisode(id)!;
}

export function updateEpisode(id: string, data: Partial<Pick<AnimEpisode, "title" | "description" | "status" | "raw_script">>): AnimEpisode | undefined {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); }
  }
  if (fields.length === 0) return getEpisode(id);
  fields.push("updated_at = ?");
  values.push(now());
  values.push(id);
  db.prepare(`UPDATE anim_episodes SET ${fields.join(", ")} WHERE id = ?`).run(...(values as SqlVal[]));
  return getEpisode(id);
}

export function deleteEpisode(id: string): boolean {
  const db = getDb();
  return db.prepare("DELETE FROM anim_episodes WHERE id = ?").run(id).changes > 0;
}

// ─── Scenes ──────────────────────────────────────────────

function rowToScene(row: Record<string, unknown>): AnimScene {
  return { ...row, character_ids: JSON.parse(row.character_ids as string) } as AnimScene;
}

export function listScenes(episodeId: string): AnimScene[] {
  const db = getDb();
  return (db.prepare("SELECT * FROM anim_scenes WHERE episode_id = ? ORDER BY order_index").all(episodeId) as Record<string, unknown>[]).map(rowToScene);
}

export function getScene(id: string): AnimScene | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM anim_scenes WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToScene(row) : undefined;
}

export function createScene(data: {
  episode_id: string; order_index: number; description?: string; dialogue?: string;
  character_ids?: string[]; duration?: number; camera_direction?: CameraDirection;
  subtitle_text?: string;
}): AnimScene {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO anim_scenes (id, episode_id, order_index, description, dialogue, character_ids, duration, camera_direction, subtitle_text, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).run(
    id, data.episode_id, data.order_index, data.description ?? "", data.dialogue ?? "",
    JSON.stringify(data.character_ids ?? []), data.duration ?? 3.0, data.camera_direction ?? "static",
    data.subtitle_text ?? data.dialogue ?? "", now()
  );
  return getScene(id)!;
}

export function updateScene(id: string, data: Partial<Omit<AnimScene, "id" | "episode_id" | "created_at">>): AnimScene | undefined {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      fields.push(`${k} = ?`);
      values.push(k === "character_ids" ? JSON.stringify(v) : v);
    }
  }
  if (fields.length === 0) return getScene(id);
  values.push(id);
  db.prepare(`UPDATE anim_scenes SET ${fields.join(", ")} WHERE id = ?`).run(...(values as SqlVal[]));
  return getScene(id);
}

export function deleteScene(id: string): boolean {
  const db = getDb();
  return db.prepare("DELETE FROM anim_scenes WHERE id = ?").run(id).changes > 0;
}

export function deleteScenesForEpisode(episodeId: string): number {
  const db = getDb();
  return Number(db.prepare("DELETE FROM anim_scenes WHERE episode_id = ?").run(episodeId).changes);
}

// ─── API Settings ────────────────────────────────────────

export function listSettings(): ApiSetting[] {
  const db = getDb();
  return (db.prepare("SELECT * FROM anim_api_settings ORDER BY api_type, provider").all() as Record<string, unknown>[]).map(r => ({
    ...r, is_active: !!(r.is_active as number),
  })) as ApiSetting[];
}

export function getSetting(id: string): ApiSetting | undefined {
  const db = getDb();
  const r = db.prepare("SELECT * FROM anim_api_settings WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!r) return undefined;
  return { ...r, is_active: !!(r.is_active as number) } as ApiSetting;
}

export function getActiveSetting(apiType: ApiType): ApiSetting | undefined {
  const db = getDb();
  const r = db.prepare("SELECT * FROM anim_api_settings WHERE api_type = ? AND is_active = 1 LIMIT 1").get(apiType) as Record<string, unknown> | undefined;
  if (!r) return undefined;
  return { ...r, is_active: true } as ApiSetting;
}

export function upsertSetting(data: { id?: string; provider: string; api_type: ApiType; api_key: string; base_url?: string; model_name?: string; is_active?: boolean }): ApiSetting {
  const db = getDb();
  const id = data.id ?? randomUUID();
  db.prepare(
    `INSERT INTO anim_api_settings (id, provider, api_type, api_key, base_url, model_name, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET provider=excluded.provider, api_key=excluded.api_key, base_url=excluded.base_url, model_name=excluded.model_name, is_active=excluded.is_active`
  ).run(id, data.provider, data.api_type, data.api_key, data.base_url ?? "", data.model_name ?? "", data.is_active !== false ? 1 : 0, now());
  return getSetting(id)!;
}

export function deleteSetting(id: string): boolean {
  const db = getDb();
  return db.prepare("DELETE FROM anim_api_settings WHERE id = ?").run(id).changes > 0;
}
