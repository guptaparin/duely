import { createAdminClient } from "./supabase/server";
import { getPlan, type PlanId } from "./plans";
import { round2 } from "./invoices";

/**
 * Applies a captured Razorpay payment. Idempotent: safe to call from both the
 * browser verification route and the webhook for the same order.
 */
export async function fulfilOrder(orderId: string, paymentId: string) {
  const admin = createAdminClient();
  const { data: payment } = await admin.from("payments").select("*").eq("razorpay_order_id", orderId).maybeSingle();
  if (!payment) return { ok: false as const, error: "Unknown order" };
  if (payment.status === "captured") return { ok: true as const, kind: payment.kind as string, alreadyDone: true };

  const { error: payErr } = await admin
    .from("payments")
    .update({ status: "captured", razorpay_payment_id: paymentId })
    .eq("id", payment.id)
    .neq("status", "captured");
  if (payErr) return { ok: false as const, error: payErr.message };

  if (payment.kind === "invoice" && payment.invoice_id) {
    const { data: owner } = await admin.from("profiles").select("plan").eq("id", payment.user_id).single();
    const fee = round2((Number(payment.amount) * getPlan(owner?.plan).platformFeePct) / 100);
    await admin
      .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        razorpay_payment_id: paymentId,
        platform_fee: fee,
      })
      .eq("id", payment.invoice_id)
      .eq("status", "sent");
  }

  if (payment.kind === "subscription" && payment.plan) {
    const plan = getPlan(payment.plan as PlanId);
    const { data: profile } = await admin.from("profiles").select("plan, plan_renews_at").eq("id", payment.user_id).single();
    // Extend from the current renewal date if they're renewing the same plan early.
    const base =
      profile?.plan === plan.id && profile.plan_renews_at && new Date(profile.plan_renews_at) > new Date()
        ? new Date(profile.plan_renews_at)
        : new Date();
    base.setDate(base.getDate() + 30);
    await admin
      .from("profiles")
      .update({
        plan: plan.id,
        plan_renews_at: base.toISOString(),
        ai_credits_used: 0,
        ai_period_start: new Date().toISOString().slice(0, 10),
      })
      .eq("id", payment.user_id);
  }

  return { ok: true as const, kind: payment.kind as string, alreadyDone: false };
}
