import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, requireUser } from "@/lib/supabase/server";
import { verifyCheckoutSignature } from "@/lib/razorpay";
import { fulfilOrder } from "@/lib/fulfil";

const Body = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  if (!verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return NextResponse.json({ error: "Payment signature didn't match" }, { status: 400 });
  }
  // The order must belong to the signed-in user.
  const { data: payment } = await createAdminClient()
    .from("payments")
    .select("user_id")
    .eq("razorpay_order_id", razorpay_order_id)
    .maybeSingle();
  if (!payment || payment.user_id !== user.id) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const r = await fulfilOrder(razorpay_order_id, razorpay_payment_id);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
