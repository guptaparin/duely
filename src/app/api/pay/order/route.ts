import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { razorpay, toPaise } from "@/lib/razorpay";

const Body = z.object({ token: z.string().uuid() });

/** Public: called from the client-facing payment page. Looks the invoice up by its unguessable token. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("invoices")
    .select("id, user_id, number, total, currency, status, clients(name, email)")
    .eq("public_token", parsed.data.token)
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (inv.status === "paid") return NextResponse.json({ error: "This invoice is already paid" }, { status: 409 });
  if (inv.status !== "sent") return NextResponse.json({ error: "This invoice is no longer payable" }, { status: 410 });

  try {
    const order = await razorpay().orders.create({
      amount: toPaise(Number(inv.total)),
      currency: inv.currency,
      receipt: inv.number.slice(0, 40),
      notes: { invoice_id: inv.id, kind: "invoice" },
    });
    await admin.from("payments").insert({
      user_id: inv.user_id,
      invoice_id: inv.id,
      kind: "invoice",
      amount: inv.total,
      currency: inv.currency,
      razorpay_order_id: order.id,
    });
    await admin.from("invoices").update({ razorpay_order_id: order.id }).eq("id", inv.id);

    const client = inv.clients as unknown as { name: string; email: string } | null;
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      prefill: { name: client?.name, email: client?.email },
    });
  } catch (e) {
    console.error("razorpay order failed", e);
    return NextResponse.json({ error: "Payments are temporarily unavailable" }, { status: 502 });
  }
}
