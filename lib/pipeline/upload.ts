import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { basename } from "path";
import { artifactPath, readJsonIfExists, uploadLogPath, writeJson } from "./paths";
import type { EpisodeScript, PrivacyStatus, SeriesBible, UploadResult } from "./types";

/**
 * 6단계 — YouTube Data API v3 업로드.
 *
 * OAuth2는 최초 1회 수동 인증으로 refresh token을 받아
 * YOUTUBE_REFRESH_TOKEN에 넣어두고 이후 계속 재사용한다.
 * (발급 절차는 scripts/youtube-auth.mjs 참고)
 */

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";
const THUMBNAIL_URL = "https://www.googleapis.com/upload/youtube/v3/thumbnails/set";

export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

export function youtubeConfigured(): boolean {
  return Boolean(
    process.env.YOUTUBE_CLIENT_ID &&
      process.env.YOUTUBE_CLIENT_SECRET &&
      process.env.YOUTUBE_REFRESH_TOKEN,
  );
}

/** refresh token으로 access token을 갱신한다. */
export async function getAccessToken(): Promise<string> {
  const client_id = process.env.YOUTUBE_CLIENT_ID;
  const client_secret = process.env.YOUTUBE_CLIENT_SECRET;
  const refresh_token = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!client_id || !client_secret || !refresh_token) {
    throw new Error(
      "YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN이 필요합니다. " +
        "`node scripts/youtube-auth.mjs`로 최초 1회 인증하세요.",
    );
  }

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id,
      client_secret,
      refresh_token,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`액세스 토큰 발급 실패 (${res.status}). ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("액세스 토큰을 받지 못했습니다.");
  return data.access_token;
}

/* ── 메타데이터 조합 ────────────────────────────────────────────── */

export interface VideoMetadata {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  privacyStatus: PrivacyStatus;
}

/** 제목/설명/태그를 바이블 + 대본에서 자동 생성한다. */
export function buildVideoMetadata(args: {
  bible: SeriesBible;
  script: EpisodeScript;
  privacyStatus?: PrivacyStatus;
  extraTags?: string[];
}): VideoMetadata {
  const { bible, script } = args;

  const title = `[${bible.series_title}] ${script.episode_number}화 - ${script.episode_title}`
    .slice(0, 100);

  const description = [
    script.episode_summary_for_next,
    "",
    `▶ 다음 화 예고: ${script.cliffhanger_summary}`,
    "",
    `※ 이 영상은 창작된 가상 전쟁 이야기입니다. 등장하는 국가·세력·인물·문장은 모두 허구이며,`,
    `   실존하는 국가·단체·인물과 무관합니다.`,
    "",
    `세계관: ${bible.setting}`,
  ]
    .join("\n")
    .slice(0, 5000);

  const seriesTags = [
    bible.series_title,
    ...bible.factions.map((f) => f.name),
    "가상전쟁",
    "전쟁스토리",
    "밀리터리",
    "창작",
  ];

  const tags = [...new Set([...seriesTags, ...(args.extraTags ?? [])])]
    .map((t) => t.replace(/[<>]/g, "").trim())
    .filter(Boolean)
    .slice(0, 25);

  return {
    title,
    description,
    tags,
    categoryId: process.env.YOUTUBE_CATEGORY_ID || "24", // 24 = Entertainment
    // 검수 후 수동 공개 전환을 기본값으로 둔다.
    privacyStatus: args.privacyStatus ?? "private",
  };
}

/* ── 업로드 ─────────────────────────────────────────────────────── */

async function startResumableUpload(
  accessToken: string,
  metadata: VideoMetadata,
  fileSize: number,
): Promise<string> {
  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(fileSize),
      "X-Upload-Content-Type": "video/mp4",
    },
    body: JSON.stringify({
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: metadata.categoryId,
      },
      status: {
        privacyStatus: metadata.privacyStatus,
        selfDeclaredMadeForKids: false,
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`업로드 세션 생성 실패 (${res.status}). ${detail.slice(0, 300)}`);
  }

  const location = res.headers.get("location");
  if (!location) throw new Error("업로드 세션 URL을 받지 못했습니다.");
  return location;
}

async function uploadBody(
  sessionUrl: string,
  videoPath: string,
  fileSize: number,
): Promise<string> {
  const stream = createReadStream(videoPath);
  const res = await fetch(sessionUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(fileSize) },
    // Node의 fetch는 스트림 본문에 duplex: "half"를 요구한다.
    body: stream as unknown as BodyInit,
    duplex: "half",
    signal: AbortSignal.timeout(30 * 60_000),
  } as RequestInit & { duplex: "half" });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`영상 업로드 실패 (${res.status}). ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("업로드 응답에 video_id가 없습니다.");
  return data.id;
}

/** 업로드 후 처리 상태를 폴링한다. */
export async function pollUploadStatus(
  accessToken: string,
  videoId: string,
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<"processing" | "complete" | "failed"> {
  const interval = options.intervalMs ?? 15_000;
  const deadline = Date.now() + (options.timeoutMs ?? 15 * 60_000);

  while (Date.now() < deadline) {
    const res = await fetch(
      `${VIDEOS_URL}?part=status,processingDetails&id=${encodeURIComponent(videoId)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (res.ok) {
      const data = (await res.json()) as {
        items?: { status?: { uploadStatus?: string }; processingDetails?: { processingStatus?: string } }[];
      };
      const item = data.items?.[0];
      const uploadStatus = item?.status?.uploadStatus;
      const processingStatus = item?.processingDetails?.processingStatus;

      if (uploadStatus === "processed" || processingStatus === "succeeded") return "complete";
      if (uploadStatus === "failed" || uploadStatus === "rejected") return "failed";
      if (processingStatus === "failed" || processingStatus === "terminated") return "failed";
    }

    await new Promise((r) => setTimeout(r, interval));
  }
  return "processing";
}

export async function setThumbnail(
  accessToken: string,
  videoId: string,
  thumbnailPath: string,
): Promise<void> {
  const { readFile } = await import("fs/promises");
  const bytes = await readFile(thumbnailPath);
  const ext = thumbnailPath.toLowerCase().endsWith(".jpg") ? "image/jpeg" : "image/png";

  const res = await fetch(`${THUMBNAIL_URL}?videoId=${encodeURIComponent(videoId)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": ext },
    body: new Uint8Array(bytes),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`썸네일 설정 실패 (${res.status}). ${detail.slice(0, 300)}`);
  }
}

export interface UploadOptions {
  videoPath: string;
  metadata: VideoMetadata;
  /** 3단계에서 생성한 특정 씬 이미지 또는 별도 썸네일 */
  thumbnailPath?: string;
  /** 최대 재시도 횟수 (기본 3) */
  maxRetries?: number;
  /** 업로드 후 처리 상태 폴링 여부 */
  poll?: boolean;
  pollTimeoutMs?: number;
  /** true면 실제 호출 없이 결과만 흉내낸다 (검증용) */
  dryRun?: boolean;
}

/** 지수 백오프 재시도를 포함한 업로드 진입점. */
export async function uploadToYouTube(options: UploadOptions): Promise<UploadResult> {
  const maxRetries = options.maxRetries ?? 3;

  if (options.dryRun) {
    const videoId = `dryrun_${basename(options.videoPath).replace(/\W+/g, "_")}`.slice(0, 40);
    return {
      video_id: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      timestamp: new Date().toISOString(),
      privacy_status: options.metadata.privacyStatus,
      upload_status: "complete",
      title: options.metadata.title,
    };
  }

  const fileSize = (await stat(options.videoPath)).size;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const accessToken = await getAccessToken();
      const sessionUrl = await startResumableUpload(accessToken, options.metadata, fileSize);
      const videoId = await uploadBody(sessionUrl, options.videoPath, fileSize);

      if (options.thumbnailPath) {
        // 썸네일 실패가 업로드 전체를 되돌리지는 않는다.
        await setThumbnail(accessToken, videoId, options.thumbnailPath).catch((err) => {
          console.warn(`[upload] 썸네일 설정 실패: ${err instanceof Error ? err.message : err}`);
        });
      }

      const upload_status = options.poll === false
        ? "processing"
        : await pollUploadStatus(accessToken, videoId, { timeoutMs: options.pollTimeoutMs });

      return {
        video_id: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        timestamp: new Date().toISOString(),
        privacy_status: options.metadata.privacyStatus,
        upload_status,
        title: options.metadata.title,
      };
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const backoff = 2000 * 2 ** (attempt - 1);
        console.warn(
          `[upload] ${attempt}회차 실패, ${backoff}ms 후 재시도합니다: ` +
            `${err instanceof Error ? err.message : err}`,
        );
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/* ── 업로드 로그 ────────────────────────────────────────────────── */

export interface UploadLogEntry extends UploadResult {
  series_id: string;
  episode_number: number;
  video_path: string;
}

export async function appendUploadLog(entry: UploadLogEntry): Promise<string> {
  const path = uploadLogPath();
  const existing = (await readJsonIfExists<UploadLogEntry[]>(path)) ?? [];
  existing.push(entry);
  await writeJson(path, existing);
  return path;
}

export async function saveUploadResult(
  seriesId: string,
  episodeNumber: number,
  result: UploadResult,
): Promise<string> {
  const path = artifactPath(seriesId, episodeNumber, "upload");
  await writeJson(path, result);
  return path;
}
