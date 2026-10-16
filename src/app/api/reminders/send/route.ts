import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { emailEnabled, sendEmail } from "@/lib/mailer";

const Body = z.object({
  reminderId: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
});

export async function POST(req: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (!emailEnabled()) return NextResponse.json({ error: "Email sending isn't set up on this server" }, { status: 400 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { data: reminder } = await supabase
    .from("reminders")
    .select("id, sent_at, invoices(status, clients(email))")
    .eq("id", parsed.data.reminderId)
    .maybeSingle();
  if (!reminder) return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  if (reminder.sent_at) return NextResponse.json({ error: "Already sent" }, { status: 400 });

  const inv = reminder.invoices as unknown as { status: string; clients: { email: string } | null } | null;
  const to = inv?.clients?.email;
  if (!to) return NextResponse.json({ error: "Client has no email" }, { status: 400 });
  if (inv?.status !== "sent") return NextResponse.json({ error: "This invoice is already closed" }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("full_name, business_name").eq("id", user.id).single();

  try {
    await sendEmail({
      to,
      subject: parsed.data.subject,
      text: parsed.data.body,
      replyTo: user.email,
      fromName: profile?.business_name || profile?.full_name || "Duely",
    });
  } catch (e) {
    console.error("email send failed", e);
    return NextResponse.json({ error: "The email server rejected the message" }, { status: 502 });
  }

  await supabase
    .from("reminders")
    .update({ subject: parsed.data.subject, body: parsed.data.body, channel: "email", sent_at: new Date().toISOString() })
    .eq("id", reminder.id);
  return NextResponse.json({ ok: true });
}
