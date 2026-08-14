import { query } from "./db";
import { PLANS } from "./plans";

export { PLANS } from "./plans";
export type { PlanId } from "./plans";

const API_SECRET = process.env.PORTONE_API_SECRET;

export function getPlan(id: string) {
  return PLANS.find((p) => p.id === id) ?? null;
}

interface PortOnePayment {
  status: string;
  id: string;
  amount: { total: number };
  method?: { provider?: string };
}

export async function verifyPayment(paymentId: string): Promise<PortOnePayment> {
  if (!API_SECRET) {
    throw new Error("PORTONE_API_SECRET이 설정되어 있지 않습니다.");
  }

  const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `PortOne ${API_SECRET}` },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[payment] PortOne 검증 실패:", res.status, body);
    throw new Error("결제 검증에 실패했습니다.");
  }

  return res.json();
}

export async function recordPayment(
  paymentId: string,
  userId: number,
  planId: string,
  amount: number,
  status: string,
  pgProvider: string | null,
) {
  await query(
    `INSERT INTO usage_log (user_id, action) VALUES ($1, $2)`,
    [userId, `payment:${planId}:${status}`]
  );

  await query(
    `CREATE TABLE IF NOT EXISTS payments (
       id SERIAL PRIMARY KEY,
       payment_id TEXT UNIQUE NOT NULL,
       user_id INTEGER NOT NULL REFERENCES users(id),
       plan_id TEXT NOT NULL,
       amount INTEGER NOT NULL,
       status TEXT NOT NULL DEFAULT 'pending',
       pg_provider TEXT,
       created_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
    []
  );

  await query(
    `INSERT INTO payments (payment_id, user_id, plan_id, amount, status, pg_provider)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (payment_id) DO UPDATE SET status = $5`,
    [paymentId, userId, planId, amount, status, pgProvider]
  );
}

export async function addCredits(userId: number, count: number) {
  await query(
    `CREATE TABLE IF NOT EXISTS credits (
       id SERIAL PRIMARY KEY,
       user_id INTEGER NOT NULL REFERENCES users(id),
       remaining INTEGER NOT NULL DEFAULT 0,
       created_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
    []
  );

  await query(
    `INSERT INTO credits (user_id, remaining) VALUES ($1, $2)`,
    [userId, count]
  );
}

export async function getRemainingCredits(userId: number): Promise<number> {
  await query(
    `CREATE TABLE IF NOT EXISTS credits (
       id SERIAL PRIMARY KEY,
       user_id INTEGER NOT NULL REFERENCES users(id),
       remaining INTEGER NOT NULL DEFAULT 0,
       created_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
    []
  );

  const rows = await query<{ total: string }>(
    `SELECT COALESCE(SUM(remaining), 0) AS total FROM credits WHERE user_id = $1`,
    [userId]
  );
  return parseInt(rows[0].total, 10);
}

export async function consumeCredit(userId: number): Promise<boolean> {
  const rows = await query<{ id: number }>(
    `UPDATE credits SET remaining = remaining - 1
     WHERE id = (
       SELECT id FROM credits
       WHERE user_id = $1 AND remaining > 0
       ORDER BY created_at ASC
       LIMIT 1
     )
     RETURNING id`,
    [userId]
  );
  return rows.length > 0;
}
