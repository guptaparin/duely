import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { draftReminder } from "@/lib/ai";
import { refundAiCredit, spendAiCredit } from "@/lib/credits";
import { appUrl, fmtDate, money, todayISO } from "@/lib/format";
import { daysOverdue } from "@/lib/invoices";
import type { Invoice } from "@/lib/types";

const Body = z.object({ invoiceId: z.string().uuid(), tone: z.enum(["friendly", "firm", "final"]) });

export async function POST(req: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { invoiceId, tone } = parsed.data;

  const [{ data: inv }, { data: profile }, { count }] = await Promise.all([
    supabase.from("invoices").select("*, clients(name, email, company)").eq("id", invoiceId).maybeSingle(),
    supabase.from("profiles").select("full_name, business_name").eq("id", user.id).single(),
    supabase.from("reminders").select("id", { count: "exact", head: true }).eq("invoice_id", invoiceId).not("sent_at", "is", null),
  ]);
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  const invoice = inv as Invoice;
  if (invoice.status !== "sent") return NextResponse.json({ error: "This invoice is already closed" }, { status: 400 });

  const credit = await spendAiCredit(user.id);
  if (!credit.ok) return NextResponse.json({ error: credit.reason }, { status: 402 });

  try {
    const draft = await draftReminder({
      tone,
      senderName: profile?.full_name || "",
      businessName: profile?.business_name || "",
      clientName: invoice.clients?.name || "there",
      invoiceNumber: invoice.number,
      amount: money(invoice.total, invoice.currency),
      dueDate: fmtDate(invoice.due_date),
      daysOverdue: daysOverdue(invoice, todayISO()),
      payUrl: `${appUrl()}/pay/${invoice.public_token}`,
      previousReminders: count ?? 0,
      items: invoice.items.map((i) => i.description).join(", "),
    });

    const { data: row, error } = await supabase
      .from("reminders")
      .insert({ user_id: user.id, invoice_id: invoiceId, tone, subject: draft.subject, body: draft.body, channel: "draft" })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: row.id, ...draft, creditsRemaining: credit.remaining });
  } catch (e) {
    await refundAiCredit(user.id);
    console.error("reminder draft failed", e);
    return NextResponse.json({ error: "The AI is busy right now. Please try again in a moment." }, { status: 502 });
  }
}
