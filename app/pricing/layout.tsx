import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "요금제",
  description: "클립AI 렌더링 크레딧을 구매하세요. 1회 결제, 구독 없음, 만료 없음. 편당 198원부터.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "클립AI 요금제 — 편당 198원부터",
    description: "무료 3회 체험 후 필요한 만큼만 구매. 구독 없음, 만료 없음.",
    url: "/pricing",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
