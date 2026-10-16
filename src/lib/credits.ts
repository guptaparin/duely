import { createAdminClient } from "./supabase/server";
import { getPlan } from "./plans";

/**
 * Atomically-enough checks and spends one AI credit for the month.
 * Credits reset 30 days after the period started.
 */
export async function spendAiCredit(userId: string) {
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("plan, ai_credits_used, ai_period_start")
    .eq("id", userId)
    .single();
  if (error || !profile) return { ok: false as const, reason: "Profile not found" };

  const plan = getPlan(profile.plan);
  const start = new Date(profile.ai_period_start + "T00:00:00Z");
  const expired = Date.now() - start.getTime() > 30 * 86_400_000;
  const used = expired ? 0 : profile.ai_credits_used;

  if (used >= plan.aiCreditsPerMonth) {
    return {
      ok: false as const,
      reason: `You've used all ${plan.aiCreditsPerMonth} AI drafts on the ${plan.name} plan this month. Upgrade for more.`,
    };
  }

  await admin
    .from("profiles")
    .update({
      ai_credits_used: used + 1,
      ...(expired ? { ai_period_start: new Date().toISOString().slice(0, 10) } : {}),
    })
    .eq("id", userId);

  return { ok: true as const, remaining: plan.aiCreditsPerMonth - used - 1 };
}

export async function refundAiCredit(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("ai_credits_used").eq("id", userId).single();
  if (data && data.ai_credits_used > 0) {
    await admin.from("profiles").update({ ai_credits_used: data.ai_credits_used - 1 }).eq("id", userId);
  }
}
