import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://clipai.kr";

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
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "클립AI",
    title: "클립AI — 게임 하이라이트 자동 편집",
    description: "게임 영상을 올리면 AI가 쇼츠를 만들어 드립니다. 편집점 감지 → 나레이션 → 자막 → 완성.",
    url: baseUrl,
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

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "클립AI",
      url: baseUrl,
      description: "게임 영상을 올리면 AI가 편집점을 찾고, 나레이션을 입히고, 자막까지 넣어 드립니다.",
      inLanguage: "ko-KR",
    },
    {
      "@type": "WebApplication",
      name: "클립AI",
      url: `${baseUrl}/studio`,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      description: "AI 기반 게임 하이라이트 자동 편집 서비스",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KRW",
        description: "무료 3회 체험, 이후 편당 198원부터",
      },
      featureList: [
        "편집점 자동 감지",
        "AI 나레이션 생성",
        "원본 음성 자막 추출",
        "저작권 안전 BGM",
        "쇼츠/롱폼 모드",
        "유튜브 URL 지원",
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="theme-color" content="#6c5ce7" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
