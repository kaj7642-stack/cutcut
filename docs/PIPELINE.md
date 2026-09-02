# 가상 전쟁 스토리 유튜브 자동화 파이프라인

스토리 시드 → 대본 → 이미지 → TTS → 영상 조립 → 업로드까지 한 번에 도는 파이프라인.

## 빠른 시작

```bash
npm install
cp .env.example .env.local        # 키를 채운다

# 키 없이 전체 흐름 확인 (mock 프로바이더)
npm run verify

# 실제 생성
npm run pipeline:episode -- --series my-war --episode 1 --brief "잠수함 전역, 1930년대 대체역사"
```

`ffmpeg` / `ffprobe`가 PATH에 있어야 한다 (없으면 `FFMPEG_PATH` / `FFPROBE_PATH` 지정).

## 단계 구성

| 단계 | 모듈 | 산출물 |
|---|---|---|
| 1. 시리즈 바이블 | `lib/pipeline/bible.ts` | `data/series/{id}/series_bible.json` |
| 2. 화별 대본 | `lib/pipeline/script.ts` | `episodes/{n}/script.json` |
| 3a. 이미지 프롬프트 | `lib/pipeline/images.ts` | `episodes/{n}/image_prompts.json` |
| 3b. 이미지 생성 | `lib/pipeline/images.ts` | `output/images/{episodeId}/{sceneId}.png` |
| 4. TTS | `lib/pipeline/tts.ts` | `output/audio/{episodeId}/{sceneId}.mp3` |
| 5. 영상 조립 | `lib/pipeline/assemble.ts`, `remotion/` | `output/video/{episodeId}.mp4` |
| 6. 업로드 | `lib/pipeline/upload.ts` | `data/upload_log.json` |
| 7. 오케스트레이션 | `lib/pipeline/orchestrator.ts` | `episodes/{n}/run.log.json` |

프롬프트 템플릿은 `lib/prompts/`에 단계별로 분리되어 있다.

## 일관성 유지 장치

시리즈가 화를 거듭해도 세계관·인물·그림체가 흔들리지 않게 하는 세 가지 고정점:

1. **시리즈 바이블** — 시리즈당 1회 생성 후 매 화 컨텍스트로 주입된다.
   `characters[].appearance_keywords`는 이미지 프롬프트에 그대로 인용되어
   같은 인물이 매번 같은 외형으로 나오게 한다.
2. **스타일 고정 접두어** — `bible.art_style`이 모든 `image_prompt` 앞에 붙는다.
   모델이 빠뜨리면 `enforcePromptInvariants()`가 후처리로 채워 넣는다.
3. **직전 화 요약** — `episode_summary_for_next`가 다음 화 생성 시 주입된다.

## 실존 요소 배제

가상 전쟁물이므로 실존 국가·부대의 국기·휘장과 혼동되지 않아야 한다.

- 바이블 단계에서 각 세력에 가상의 문장(`insignia`)과 색상 체계를 부여한다.
- 모든 `negative_prompt`에 실존 국기 / 군 휘장 / 기업 로고 / 실존 인물 배제가
  강제로 들어간다 (`SAFETY_NEGATIVES`, 모델이 빠뜨려도 후처리로 보강).
- 업로드 설명문에 가상 창작물 고지가 자동으로 들어간다.

## 단계별 재실행

산출물이 이미 있으면 재사용하므로, 특정 단계만 다시 돌릴 수 있다.

```bash
# 대본만 다시 (이후 단계는 그에 맞춰 다시 돈다)
npm run pipeline:episode -- --series my-war --episode 1 --force script

# TTS까지만 확인하고 멈추기
npm run pipeline:episode -- --series my-war --episode 1 --stop-after tts

# 영상만 다시 조립
npm run pipeline:render -- --series my-war --episode 1
```

`--force`에 넣을 수 있는 단계: `bible script image_prompts images tts assemble upload`

이미지·오디오·영상은 JSON 산출물이 있어도 **실제 파일이 없으면** 자동으로 다시 만든다.

## 렌더러

기본은 `auto` — Remotion을 먼저 시도하고, 브라우저를 찾지 못하는 등의 이유로
실패하면 ffmpeg 폴백으로 넘어간다.

| | Remotion | ffmpeg 폴백 |
|---|---|---|
| Ken Burns | ✅ | ✅ (zoompan) |
| 자막 | ✅ | ✅ (drawtext) |
| 전투 씬 흔들림 | ✅ | ✅ (crop 오프셋) |
| 씬 전환 | 크로스페이드 | 페이드 인/아웃 |
| 타이틀·예고 카드 | ✅ | ✅ |
| BGM 믹싱 | ✅ | ✅ |
| 필요 조건 | Chrome/Chromium | 없음 |

Remotion이 쓸 브라우저는 `REMOTION_BROWSER_EXECUTABLE`로 지정하거나,
`PLAYWRIGHT_BROWSERS_PATH`에 설치된 Chromium을 자동으로 찾는다.

미리보기: `npm run remotion:studio`

BGM은 `output/bgm/{tense,hype,calm,bright}.mp3`를 쓴다. 없으면 절차적으로 합성하며,
`PIPELINE_BGM_DIR`에 직접 준비한 트랙을 두면 그것을 복사해 쓴다.

## API

```bash
curl -X POST localhost:3100/api/generate-episode \
  -H 'Content-Type: application/json' \
  -d '{"series_id":"my-war","episode_number":1,"stop_after":"tts"}'

curl 'localhost:3100/api/generate-episode?series_id=my-war&episode_number=1'
```

## 유튜브 업로드

```bash
npm run pipeline:auth      # 최초 1회, refresh token 발급
npm run pipeline:episode -- --series my-war --episode 1 --upload
```

`privacyStatus` 기본값은 `private`다. 검수 후 수동으로 공개 전환하는 것을 전제로 한다.
`--privacy unlisted` / `--privacy public`으로 바꿀 수 있다.
업로드 실패 시 3회까지 지수 백오프로 재시도하고, 결과는 `data/upload_log.json`에 누적된다.

## 검증 루프

```bash
npm run verify              # 전체 (E2E + typecheck + 테스트 + 린트 + 빌드)
npm run verify -- --quick   # 정적 검사 생략
npm run verify -- --only 5c # 특정 체크만
```

`PIPELINE_MOCK=1`로 돌아가므로 API 키가 없어도 전 구간이 실제로 실행된다
(LLM 픽스처, 로컬 생성 PNG, ffmpeg 무음 mp3).

각 체크는 실패하면 `repair()`로 산출물을 지우고 최대 3회까지 다시 시도한다.
검증하는 것:

- 단계별 산출물의 스키마와 상호 정합성 (씬 수, scene_id 일치, 순서)
- 이미지 파일 실재·PNG 유효성, 오디오 실측 길이와 기록값 일치
- 스타일 접두어·실존 요소 배제 가드가 실제로 걸려 있는지
- 두 렌더러 모두 재생 가능한 mp4를 만드는지, 길이가 기대치와 맞는지
- 캐시 재사용 / `--force` 재실행 / 실패 지점 기록
- API route의 400 / 200 / 404 응답
- 1화 → 2화 요약 전달
- `safeId()`의 경로 조작 차단

## 자동 수정 루프 (LLM 레벨)

`generateJson()`은 모델 응답이 파싱·스키마 검증에 실패하면 **오류 메시지를 그대로
프롬프트에 되먹여** 최대 3회까지 재생성시킨다. 씬 누락이나 유령 scene_id도
`listValidatorCovering()`이 잡아 같은 방식으로 교정한다.
