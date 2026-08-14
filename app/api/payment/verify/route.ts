import { NextRequest, NextResponse } from "next/server";
import { getUserBySession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { verifyPayment, recordPayment, addCredits, getPlan } from "@/lib/payment";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserBySession(token);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { paymentId, planId } = await request.json();

  if (!paymentId || !planId) {
    return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
  }

  const plan = getPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "유효하지 않은 플랜입니다." }, { status: 400 });
  }

  try {
    const payment = await verifyPayment(paymentId);

    if (payment.status !== "PAID") {
      await recordPayment(paymentId, user.id, planId, 0, payment.status, null);
      return NextResponse.json({ error: "결제가 완료되지 않았습니다." }, { status: 400 });
    }

    if (payment.amount.total !== plan.price) {
      await recordPayment(paymentId, user.id, planId, payment.amount.total, "AMOUNT_MISMATCH", null);
      return NextResponse.json({ error: "결제 금액이 일치하지 않습니다." }, { status: 400 });
    }

    const pgProvider = payment.method?.provider ?? null;
    await recordPayment(paymentId, user.id, planId, plan.price, "PAID", pgProvider);
    await addCredits(user.id, plan.credits);

    return NextResponse.json({ ok: true, credits: plan.credits });
  } catch (err) {
    console.error("[payment] verify error:", err);
    return NextResponse.json({ error: "결제 검증에 실패했습니다." }, { status: 500 });
  }
}
