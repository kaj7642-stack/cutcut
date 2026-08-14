import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "사용 가이드",
  description: "클립AI 사용 방법을 단계별로 알아보세요. 게임 영상 업로드부터 완성된 쇼츠 다운로드까지.",
};

const STEPS = [
  {
    number: "01",
    icon: "📤",
    title: "게임 영상 업로드",
    description: "게임 녹화 파일(MP4, MKV, AVI, MOV, WebM)을 드래그&드롭하거나 유튜브 URL을 붙여넣으세요.",
    details: [
      "최대 500MB까지 업로드 가능",
      "유튜브 공개 영상 URL도 지원 (최대 60분)",
      "대부분의 영상 포맷 지원",
    ],
  },
  {
    number: "02",
    icon: "🔍",
    title: "AI 편집점 감지",
    description: "AI가 영상의 음량 스파이크를 분석하여 킬, 클러치, 폭발 등 흥미로운 순간을 자동으로 찾아냅니다.",
    details: [
      "음량 기반 흥미 구간 자동 탐지",
      "각 클립의 강도를 1~10으로 표시",
      "원하는 클립만 선택/해제 가능",
    ],
  },
  {
    number: "03",
    icon: "✏️",
    title: "클립 선택 & 메모 작성",
    description: "감지된 클립 중 원하는 것을 선택하고, 각 클립에 상황 메모를 작성하세요. AI가 이를 바탕으로 나레이션을 만듭니다.",
    details: [
      "클립 시작/끝 구간을 트림으로 미세 조정",
      "상황 메모 예시: '1v3 역전 킬', '탑 솔킬 당함'",
      "STT로 원본 음성 자막도 추출 가능",
    ],
  },
  {
    number: "04",
    icon: "🎙️",
    title: "나레이션 자동 생성",
    description: "AI가 메모를 바탕으로 게임 상황에 맞는 나레이션 스크립트를 생성합니다. 5가지 톤 중 선택하세요.",
    details: [
      "재미 / 해설 / 감동 / 캐주얼 / 흥분 톤 지원",
      "생성된 나레이션은 자유롭게 수정 가능",
      "TTS 미리듣기로 음성 확인",
    ],
  },
  {
    number: "05",
    icon: "🎬",
    title: "영상 렌더링",
    description: "TTS 음성 합성 → 배경음악 추가 → 자막 삽입 → 최종 영상이 브라우저에서 바로 렌더링됩니다.",
    details: [
      "쇼츠(9:16) 또는 롱폼(16:9) 선택",
      "3단계 화질 선택 (저/중/고)",
      "5종류 배경음악 무드",
      "브라우저에서 바로 처리 — 서버 업로드 불필요",
    ],
  },
  {
    number: "06",
    icon: "📥",
    title: "다운로드 & 공유",
    description: "완성된 영상을 바로 다운로드하거나 공유하세요. 유튜브 쇼츠, 인스타 릴스, 틱톡에 바로 올릴 수 있습니다.",
    details: [
      "WebM / MP4 포맷 다운로드",
      "모바일에서 바로 공유 기능",
      "링크 복사로 SNS 공유",
    ],
  },
];

const TIPS = [
  {
    icon: "💡",
    title: "좋은 결과를 위한 팁",
    items: [
      "킬 사운드나 핑이 많은 구간이 잘 감지됩니다",
      "메모를 구체적으로 쓸수록 나레이션 품질이 올라갑니다",
      "쇼츠는 15~60초 클립이 가장 효과적입니다",
      "롱폼 모드에서는 클립 순서를 드래그로 조정하세요",
    ],
  },
  {
    icon: "⚡",
    title: "지원 게임",
    items: [
      "리그 오브 레전드, 배틀그라운드, 발로란트",
      "오버워치 2, 에이펙스 레전드, 포트나이트",
      "스타크래프트, 메이플스토리, FIFA 등",
      "음량 변화가 있는 모든 게임 영상 지원",
    ],
  },
];

export default function GuidePage() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="text-xl font-bold" style={{ color: "var(--accent)" }}>
          클립AI
        </Link>
        <Link
          href="/studio"
          className="text-sm px-4 py-2 rounded-lg"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          바로 시작하기
        </Link>
      </div>

      {/* Title */}
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          사용 <span style={{ color: "var(--accent)" }}>가이드</span>
        </h1>
        <p style={{ color: "var(--fg-muted)" }}>
          게임 영상을 올리면 AI가 쇼츠를 만들어 드립니다. 6단계를 알아보세요.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-6 mb-16">
        {STEPS.map((step) => (
          <div key={step.number} className="card flex gap-5 items-start">
            <div className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                 style={{ background: "var(--accent-glow)" }}>
              {step.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "var(--accent)", color: "#fff" }}>
                  STEP {step.number}
                </span>
                <h2 className="font-bold text-lg">{step.title}</h2>
              </div>
              <p className="text-sm mb-3" style={{ color: "var(--fg-muted)" }}>
                {step.description}
              </p>
              <ul className="space-y-1">
                {step.details.map((detail) => (
                  <li key={detail} className="flex items-start gap-2 text-sm">
                    <span style={{ color: "var(--accent)" }}>-</span>
                    <span style={{ color: "var(--fg-muted)" }}>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="grid sm:grid-cols-2 gap-6 mb-16">
        {TIPS.map((tip) => (
          <div key={tip.title} className="card">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{tip.icon}</span>
              <h3 className="font-bold">{tip.title}</h3>
            </div>
            <ul className="space-y-2">
              {tip.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <span style={{ color: "var(--success)" }}>-</span>
                  <span style={{ color: "var(--fg-muted)" }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* FAQ quick link */}
      <div className="card text-center mb-8">
        <h2 className="font-bold text-lg mb-2">더 궁금한 점이 있으신가요?</h2>
        <p className="text-sm mb-4" style={{ color: "var(--fg-muted)" }}>
          자주 묻는 질문을 확인하거나 바로 시작해보세요
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/#faq" className="btn-ghost text-sm">
            FAQ 보기
          </Link>
          <Link href="/studio" className="btn-primary text-sm">
            무료로 시작하기
          </Link>
        </div>
      </div>
    </main>
  );
}
