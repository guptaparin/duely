import Groq from "groq-sdk";
import { z } from "zod";

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

function client() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set");
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

async function jsonCompletion(system: string, user: string) {
  const res = await client().chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const text = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(text) as unknown;
}

// ---------------------------------------------------------------------------
// 1. Follow-up email drafts
// ---------------------------------------------------------------------------
const ReminderSchema = z.object({
  subject: z.string().min(3).max(140),
  body: z.string().min(20).max(3000),
});

export interface ReminderContext {
  tone: "friendly" | "firm" | "final";
  senderName: string;
  businessName: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  daysOverdue: number;
  payUrl: string;
  previousReminders: number;
  items: string;
}

const TONE_GUIDE = {
  friendly:
    "Warm and light. Assume they simply forgot. One short paragraph plus the link. No pressure, no mention of penalties.",
  firm:
    "Polite but direct. State clearly that the invoice is overdue and by how many days, ask for payment or a payment date by a specific near date (3 business days). Keep it professional, not emotional.",
  final:
    "Final notice. Calm, factual and serious. State the amount, how long it is overdue and that this is the last reminder before work is paused and the matter is escalated. Never threaten anything illegal or harassing. Still offer to talk if there is a problem.",
} as const;

export async function draftReminder(ctx: ReminderContext) {
  const system = `You write payment follow-up emails for freelancers and small agencies in India.
Rules:
- Write as the freelancer (first person), addressed to the client by first name.
- Tone: ${TONE_GUIDE[ctx.tone]}
- Always include the exact amount, the invoice number and the payment link on its own line.
- Mention they can pay by UPI, card or netbanking through the link.
- Under 140 words. Plain text, no markdown, no placeholders like [Name].
- Sign off with the sender's name and business name.
Return JSON: {"subject": string, "body": string}`;

  const user = JSON.stringify({
    sender: ctx.senderName,
    business: ctx.businessName,
    client: ctx.clientName,
    invoice_number: ctx.invoiceNumber,
    amount: ctx.amount,
    due_date: ctx.dueDate,
    days_overdue: ctx.daysOverdue,
    reminders_already_sent: ctx.previousReminders,
    work_billed: ctx.items,
    payment_link: ctx.payUrl,
  });

  const parsed = ReminderSchema.parse(await jsonCompletion(system, user));
  // Make sure the link is always present, even if the model drops it.
  if (!parsed.body.includes(ctx.payUrl)) parsed.body += `\n\nPay here: ${ctx.payUrl}`;
  return parsed;
}

// ---------------------------------------------------------------------------
// 2. Natural-language invoice -> structured line items
// ---------------------------------------------------------------------------
const ParsedInvoiceSchema = z.object({
  items: z
    .array(
      z.object({
        description: z.string().min(1).max(200),
        quantity: z.coerce.number().positive().max(100000),
        rate: z.coerce.number().nonnegative().max(100000000),
      }),
    )
    .min(1)
    .max(30),
  due_in_days: z.coerce.number().int().min(0).max(365).nullable().optional(),
  tax_rate: z.coerce.number().min(0).max(40).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type ParsedInvoice = z.infer<typeof ParsedInvoiceSchema>;

export async function parseInvoiceText(text: string) {
  const system = `You turn a freelancer's quick description of work into invoice line items.
Amounts are in Indian Rupees unless stated. "15k" = 15000, "1.2L" or "1.2 lakh" = 120000.
If a lump sum is given, use quantity 1. If hours x rate is given, use quantity = hours.
Each description is a short, capitalised name for the work (e.g. "Logo design", "Banner", "Consulting"). Never put amounts, quantities, rates or hours in the description.
Extract due_in_days if mentioned ("net 15" = 15, "due next week" = 7), else null.
Extract tax_rate if GST/tax % is mentioned, else null.
Return JSON: {"items":[{"description":string,"quantity":number,"rate":number}],"due_in_days":number|null,"tax_rate":number|null,"notes":string|null}`;
  return ParsedInvoiceSchema.parse(await jsonCompletion(system, text.slice(0, 2000)));
}
