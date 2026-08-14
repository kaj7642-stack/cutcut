export const PLANS = [
  { id: "render_5", name: "5회 팩", credits: 5, price: 2900 },
  { id: "render_20", name: "20회 팩", credits: 20, price: 5900 },
  { id: "render_50", name: "50회 팩", credits: 50, price: 9900 },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];
