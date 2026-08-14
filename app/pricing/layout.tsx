import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "요금제",
  description: "클립AI 크레딧 요금제. 무료 3회 체험 후 건당 198원부터.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
