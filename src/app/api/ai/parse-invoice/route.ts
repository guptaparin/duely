import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { parseInvoiceText } from "@/lib/ai";
import { refundAiCredit, spendAiCredit } from "@/lib/credits";

const Body = z.object({ text: z.string().trim().min(3).max(2000) });

export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Describe the work in a few words first" }, { status: 400 });

  const credit = await spendAiCredit(user.id);
  if (!credit.ok) return NextResponse.json({ error: credit.reason }, { status: 402 });

  try {
    const result = await parseInvoiceText(parsed.data.text);
    return NextResponse.json(result);
  } catch (e) {
    await refundAiCredit(user.id);
    console.error("parse invoice failed", e);
    return NextResponse.json({ error: "Couldn't turn that into line items. Try adding amounts, e.g. “logo 15000”." }, { status: 422 });
  }
}
