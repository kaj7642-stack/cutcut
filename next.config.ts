import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remotion 렌더러/번들러는 플랫폼별 네이티브 바이너리를 런타임에 require 한다.
  // 번들에 넣으면 다른 OS용 optional dependency를 못 찾아 빌드가 깨지므로 외부 모듈로 둔다.
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler", "@remotion/compositor"],
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
  ],
};

export default nextConfig;
