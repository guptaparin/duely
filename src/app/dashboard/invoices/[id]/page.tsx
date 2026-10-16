import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { appUrl, fmtDate, money, todayISO } from "@/lib/format";
import { daysOverdue, displayStatus, suggestedTone } from "@/lib/invoices";
import { emailEnabled } from "@/lib/mailer";
import type { Invoice, Reminder } from "@/lib/types";
import { Card, Notice, StatusBadge } from "@/components/ui";
import { CopyLink } from "@/components/dashboard/CopyLink";
import { InvoiceActions } from "@/components/dashboard/InvoiceActions";
import { ReminderPanel } from "@/components/dashboard/ReminderPanel";

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const { supabase } = await requireUser();
  const [{ data: inv }, { data: reminders }] = await Promise.all([
    supabase.from("invoices").select("*, clients(name, email, company)").eq("id", id).maybeSingle(),
    supabase.from("reminders").select("*").eq("invoice_id", id).order("created_at", { ascending: false }),
  ]);
  if (!inv) notFound();
  const invoice = inv as Invoice;
  const today = todayISO();
  const status = displayStatus(invoice, today);
  const days = daysOverdue(invoice, today);
  const payUrl = `${appUrl()}/pay/${invoice.public_token}`;

  return (
    <>
      <Link href="/dashboard/invoices" className="text-sm text-muted hover:text-ink">
        ← All invoices
      </Link>
      <div className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted">{invoice.number}</p>
          <h1 className="font-display text-4xl leading-none tracking-tight sm:text-5xl">
            {invoice.clients?.company || invoice.clients?.name}
          </h1>
          <div className="mt-3 flex items-center gap-3">
            <StatusBadge status={status} days={days} />
            <span className="tabular font-mono text-lg">{money(invoice.total, invoice.currency)}</span>
          </div>
        </div>
        <InvoiceActions id={invoice.id} status={invoice.status} />
      </div>

      {created && (
        <div className="mb-6">
          <Notice tone="success">Invoice created. Share the payment link below with your client.</Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-2xl">Payment link</h2>
            <p className="mt-1 text-sm text-muted">Your client can pay by UPI, card or netbanking. Paid invoices update here instantly.</p>
            <div className="mt-4">
              <CopyLink url={payUrl} />
            </div>
            {invoice.status === "paid" && (
              <p className="mt-4 text-sm text-paid">
                Paid on {fmtDate(invoice.paid_at)}
                {invoice.razorpay_payment_id && <span className="font-mono text-xs text-muted"> · {invoice.razorpay_payment_id}</span>}
                {Number(invoice.platform_fee) > 0 && <span className="text-muted"> · Duely fee {money(invoice.platform_fee)}</span>}
              </p>
            )}
          </Card>

          <Card className="p-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">Billed to</p>
                <p className="mt-1 font-medium">{invoice.clients?.name}</p>
                <p className="text-muted">{invoice.clients?.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-muted">Issued · Due</p>
                <p className="mt-1">{fmtDate(invoice.issue_date)}</p>
                <p className={status === "overdue" ? "text-overdue" : "text-muted"}>{fmtDate(invoice.due_date)}</p>
              </div>
            </div>
            <table className="mt-6 w-full text-sm">
              <tbody className="divide-y divide-line">
                {invoice.items.map((it, i) => (
                  <tr key={i}>
                    <td className="py-2.5">
                      {it.description}
                      <span className="tabular block font-mono text-xs text-muted">
                        {it.quantity} × {money(it.rate)}
                      </span>
                    </td>
                    <td className="tabular py-2.5 text-right font-mono">{money(it.quantity * it.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
              <div className="flex justify-between text-muted">
                <dt>Subtotal</dt>
                <dd className="tabular font-mono">{money(invoice.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>Tax ({Number(invoice.tax_rate)}%)</dt>
                <dd className="tabular font-mono">{money(Number(invoice.total) - Number(invoice.subtotal))}</dd>
              </div>
              <div className="flex justify-between pt-1 font-medium">
                <dt>Total</dt>
                <dd className="tabular font-mono">{money(invoice.total)}</dd>
              </div>
            </dl>
            {invoice.notes && <p className="mt-4 rounded-xl bg-paper p-3 text-sm text-ink-2">{invoice.notes}</p>}
          </Card>
        </div>

        <ReminderPanel
          invoiceId={invoice.id}
          clientEmail={invoice.clients?.email ?? ""}
          canChase={invoice.status === "sent"}
          defaultTone={suggestedTone(days)}
          daysOverdue={days}
          emailEnabled={emailEnabled()}
          history={(reminders ?? []) as Reminder[]}
        />
      </div>
    </>
  );
}
