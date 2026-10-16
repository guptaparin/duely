import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { draftReminder } from "@/lib/ai";
import { spendAiCredit } from "@/lib/credits";
import { emailEnabled, sendEmail } from "@/lib/mailer";
import { appUrl, fmtDate, money, todayISO } from "@/lib/format";
import { daysOverdue, suggestedTone } from "@/lib/invoices";
import type { Invoice } from "@/lib/types";

export const maxDuration = 60;

/**
 * Daily auto-chase (Vercel Cron, see vercel.json).
 * 1. Downgrades paid plans whose 30 days have run out.
 * 2. For users on Pro/Agency with auto-chase on, drafts and sends a follow-up for
 *    every overdue invoice that hasn't been chased in the last 3 days.
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const today = todayISO();

  // 1. Expire lapsed plans
  const { data: expired } = await admin
    .from("profiles")
    .update({ plan: "free", auto_chase: false })
    .neq("plan", "free")
    .lt("plan_renews_at", new Date().toISOString())
    .select("id");

  // 2. Auto-chase
  const { data: users } = await admin
    .from("profiles")
    .select("id, full_name, business_name")
    .in("plan", ["pro", "agency"])
    .eq("auto_chase", true);

  const canEmail = emailEnabled();
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
  let drafted = 0;
  let sent = 0;

  for (const u of users ?? []) {
    const { data: invoices } = await admin
      .from("invoices")
      .select("*, clients(name, email, company)")
      .eq("user_id", u.id)
      .eq("status", "sent")
      .lt("due_date", today)
      .limit(25);

    for (const inv of (invoices ?? []) as Invoice[]) {
      const { data: recent } = await admin
        .from("reminders")
        .select("id")
        .eq("invoice_id", inv.id)
        .gte("created_at", threeDaysAgo)
        .limit(1);
      if (recent?.length) continue;

      const credit = await spendAiCredit(u.id);
      if (!credit.ok) break;

      const { count } = await admin
        .from("reminders")
        .select("id", { count: "exact", head: true })
        .eq("invoice_id", inv.id)
        .not("sent_at", "is", null);
      const days = daysOverdue(inv, today);
      const tone = suggestedTone(days);

      try {
        const draft = await draftReminder({
          tone,
          senderName: u.full_name || "",
          businessName: u.business_name || "",
          clientName: inv.clients?.name || "there",
          invoiceNumber: inv.number,
          amount: money(inv.total, inv.currency),
          dueDate: fmtDate(inv.due_date),
          daysOverdue: days,
          payUrl: `${appUrl()}/pay/${inv.public_token}`,
          previousReminders: count ?? 0,
          items: inv.items.map((i) => i.description).join(", "),
        });
        let sentAt: string | null = null;
        if (canEmail && inv.clients?.email) {
          await sendEmail({
            to: inv.clients.email,
            subject: draft.subject,
            text: draft.body,
            fromName: u.business_name || u.full_name || "Duely",
          });
          sentAt = new Date().toISOString();
          sent++;
        }
        await admin.from("reminders").insert({
          user_id: u.id,
          invoice_id: inv.id,
          tone,
          subject: draft.subject,
          body: draft.body,
          channel: sentAt ? "auto" : "draft",
          sent_at: sentAt,
        });
        drafted++;
      } catch (e) {
        console.error("auto-chase failed for", inv.id, e);
      }
    }
  }

  return NextResponse.json({ ok: true, expiredPlans: expired?.length ?? 0, drafted, sent });
}
