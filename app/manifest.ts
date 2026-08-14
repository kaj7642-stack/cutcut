import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "클립AI — 게임 하이라이트 자동 편집",
    short_name: "클립AI",
    description: "게임 영상을 올리면 AI가 쇼츠를 만들어 드립니다.",
    start_url: "/studio",
    display: "standalone",
    background_color: "#0d0518",
    theme_color: "#6c5ce7",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
