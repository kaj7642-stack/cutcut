#!/usr/bin/env node
/**
 * YouTube Data API v3 최초 1회 수동 인증.
 *
 *   1) Google Cloud Console에서 OAuth 클라이언트(데스크톱 앱)를 만들고
 *      YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET을 .env.local에 넣는다.
 *   2) node scripts/youtube-auth.mjs 실행 → 출력된 URL을 브라우저에서 연다.
 *   3) 리다이렉트된 주소(http://localhost:8787/?code=...)의 code 값을 붙여넣는다.
 *   4) 출력된 refresh token을 .env.local의 YOUTUBE_REFRESH_TOKEN에 저장한다.
 *      이후로는 이 토큰으로 access token을 계속 갱신해 쓴다.
 */
import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || "http://localhost:8787";
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET 환경변수가 필요합니다.");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  });

console.log("\n아래 URL을 브라우저에서 열어 인증하세요:\n");
console.log(authUrl);
console.log("\n인증 후 리다이렉트된 주소의 code 파라미터 값을 붙여넣으세요.\n");

const rl = createInterface({ input: stdin, output: stdout });
const code = (await rl.question("code: ")).trim();
rl.close();

const res = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  }),
});

if (!res.ok) {
  console.error(`토큰 교환 실패 (${res.status}):`, await res.text());
  process.exit(1);
}

const data = await res.json();
if (!data.refresh_token) {
  console.error(
    "refresh_token이 응답에 없습니다. 이미 승인된 앱이면 Google 계정 > 보안 > 서드파티 앱에서\n" +
      "권한을 제거한 뒤 다시 시도하세요 (prompt=consent가 필요합니다).",
  );
  process.exit(1);
}

console.log("\n.env.local에 아래 줄을 추가하세요:\n");
console.log(`YOUTUBE_REFRESH_TOKEN=${data.refresh_token}\n`);
