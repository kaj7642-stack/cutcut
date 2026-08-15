import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "요금제",
  description: "클립AI 렌더링 크레딧을 구매하세요. 1회 결제, 구독 없음, 만료 없음. 편당 198원부터.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
