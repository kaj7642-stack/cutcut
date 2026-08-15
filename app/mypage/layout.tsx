import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "마이페이지",
  description: "내 크레딧, 렌더링 기록, 계정 설정을 관리합니다.",
  alternates: { canonical: "/mypage" },
  robots: { index: false, follow: false },
};

export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
