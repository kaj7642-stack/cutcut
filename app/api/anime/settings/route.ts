import { NextRequest, NextResponse } from "next/server";
import { all, run, get } from "@/lib/anime/db";
import { v4 as uuid } from "uuid";
import type { ApiSetting } from "@/lib/anime/types";

export async function GET() {
  const settings = all<ApiSetting>("SELECT * FROM api_settings ORDER BY provider_type, updated_at DESC");
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { provider_type, provider_name, api_key, config } = body;

  if (!provider_type) return NextResponse.json({ error: "provider_type required" }, { status: 400 });

  // Upsert: check if we already have one for this type
  const existing = get<ApiSetting>(
    "SELECT * FROM api_settings WHERE provider_type = $type",
    { type: provider_type }
  );

  const now = new Date().toISOString();
  if (existing) {
    run(
      `UPDATE api_settings SET provider_name = $name, api_key = $key, config = $config, updated_at = $now WHERE id = $id`,
      {
        id: existing.id,
        name: provider_name || existing.provider_name,
        key: api_key ?? existing.api_key,
        config: config ? JSON.stringify(config) : existing.config,
        now,
      }
    );
    const updated = get<ApiSetting>("SELECT * FROM api_settings WHERE id = $id", { id: existing.id });
    return NextResponse.json(updated);
  } else {
    const id = uuid();
    run(
      `INSERT INTO api_settings (id, provider_type, provider_name, api_key, config, created_at, updated_at)
       VALUES ($id, $type, $name, $key, $config, $now, $now)`,
      {
        id,
        type: provider_type,
        name: provider_name || "mock",
        key: api_key || "",
        config: JSON.stringify(config || {}),
        now,
      }
    );
    const setting = get<ApiSetting>("SELECT * FROM api_settings WHERE id = $id", { id });
    return NextResponse.json(setting, { status: 201 });
  }
}
