import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, requireUser } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";
import { razorpay, toPaise } from "@/lib/razorpay";

const Body = z.object({ plan: z.enum(["pro", "agency"]) });

export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pick a plan" }, { status: 400 });
  const plan = PLANS[parsed.data.plan];

  try {
    const order = await razorpay().orders.create({
      amount: toPaise(plan.priceInr),
      currency: "INR",
      receipt: `sub_${user.id.slice(0, 8)}_${Date.now().toString(36)}`,
      notes: { user_id: user.id, plan: plan.id, kind: "subscription" },
    });
    await createAdminClient().from("payments").insert({
      user_id: user.id,
      kind: "subscription",
      plan: plan.id,
      amount: plan.priceInr,
      currency: "INR",
      razorpay_order_id: order.id,
    });
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      planName: plan.name,
      email: user.email,
    });
  } catch (e) {
    console.error("billing order failed", e);
    return NextResponse.json({ error: "Payments are temporarily unavailable" }, { status: 502 });
  }
}
