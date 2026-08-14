import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "클립AI — 게임 하이라이트 자동 편집",
    template: "%s — 클립AI",
  },
  description:
    "게임 영상을 올리면 AI가 편집점을 찾고, 나레이션을 입히고, 자막까지 넣은 쇼츠를 만들어 드립니다. 롤, 배그, 발로란트 등 모든 게임 지원.",
  keywords: [
    "게임 하이라이트",
    "쇼츠 자동 편집",
    "AI 영상 편집",
    "롤 하이라이트",
    "게임 클립",
    "나레이션 자동 생성",
    "TTS",
    "유튜브 쇼츠",
  ],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "클립AI",
    title: "클립AI — 게임 하이라이트 자동 편집",
    description: "게임 영상을 올리면 AI가 쇼츠를 만들어 드립니다. 편집점 감지 → 나레이션 → 자막 → 완성.",
  },
  twitter: {
    card: "summary_large_image",
    title: "클립AI — 게임 하이라이트 자동 편집",
    description: "게임 영상을 올리면 AI가 쇼츠를 만들어 드립니다.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="theme-color" content="#6c5ce7" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('clipai_theme');if(t&&t!=='system')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
        <Providers>
          <div id="main-content">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
