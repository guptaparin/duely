import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { fulfilOrder } from "@/lib/fulfil";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Razorpay webhook (Dashboard -> Webhooks -> URL: <app>/api/webhooks/razorpay,
 * events: payment.captured, payment.failed). Backs up the browser verification
 * so a payment is recorded even if the client closes the tab mid-checkout.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(raw) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string } } };
  };
  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id) return NextResponse.json({ ok: true, ignored: true });

  if (event.event === "payment.captured" || event.event === "order.paid") {
    await fulfilOrder(payment.order_id, payment.id);
  } else if (event.event === "payment.failed") {
    await createAdminClient()
      .from("payments")
      .update({ status: "failed" })
      .eq("razorpay_order_id", payment.order_id)
      .eq("status", "created");
  }
  return NextResponse.json({ ok: true });
}
