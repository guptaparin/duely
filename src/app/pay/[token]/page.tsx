import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { fmtDate, money, todayISO } from "@/lib/format";
import { displayStatus } from "@/lib/invoices";
import type { LineItem } from "@/lib/types";
import { Card, Logo, StatusBadge } from "@/components/ui";
import { PayButton } from "@/components/PayButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pay invoice · Duely", robots: { index: false } };

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("invoices")
    .select("number, items, subtotal, tax_rate, total, currency, issue_date, due_date, status, notes, paid_at, user_id, clients(name, company)")
    .eq("public_token", token)
    .maybeSingle();
  if (!inv) notFound();
  const { data: owner } = await admin.from("profiles").select("full_name, business_name").eq("id", inv.user_id).single();

  const business = owner?.business_name || owner?.full_name || "Your service provider";
  const client = inv.clients as unknown as { name: string; company: string | null } | null;
  const items = inv.items as LineItem[];
  const status = displayStatus(inv, todayISO());
  const testMode = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").startsWith("rzp_test");

  return (
    <main className="grain min-h-dvh px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex items-center justify-between">
          <p className="font-display text-2xl">{business}</p>
          <StatusBadge status={status} />
        </div>

        <Card className="overflow-hidden">
          <div className="bg-ink px-6 py-8 text-paper sm:px-8">
            <p className="text-sm text-paper/60">
              Invoice {inv.number} for {client?.company || client?.name}
            </p>
            <p className="tabular mt-2 font-mono text-4xl sm:text-5xl">{money(inv.total, inv.currency)}</p>
            <p className="mt-2 text-sm text-paper/60">
              {inv.status === "paid" ? `Paid on ${fmtDate(inv.paid_at)}` : `Due ${fmtDate(inv.due_date)}`}
            </p>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {items.map((it, i) => (
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
                <dd className="tabular font-mono">{money(inv.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>GST ({Number(inv.tax_rate)}%)</dt>
                <dd className="tabular font-mono">{money(Number(inv.total) - Number(inv.subtotal))}</dd>
              </div>
              <div className="flex justify-between pt-1 font-medium">
                <dt>Total</dt>
                <dd className="tabular font-mono">{money(inv.total)}</dd>
              </div>
            </dl>
            {inv.notes && <p className="mt-4 rounded-xl bg-paper p-3 text-sm text-ink-2">{inv.notes}</p>}

            <div className="mt-6">
              {inv.status === "sent" ? (
                <>
                  <PayButton token={token} businessName={business} label={`Pay ${money(inv.total, inv.currency)}`} />
                  <p className="mt-3 text-center text-xs text-muted">UPI · Cards · Netbanking · Wallets — secured by Razorpay</p>
                  {testMode && (
                    <p className="mt-3 rounded-xl border border-dashed border-line p-3 text-center text-xs text-muted">
                      Demo mode: no real money moves. Use UPI ID <span className="font-mono text-ink">success@razorpay</span> or
                      card <span className="font-mono text-ink">4100 2800 0000 1007</span>, any future expiry, any CVV.
                    </p>
                  )}
                </>
              ) : inv.status === "paid" ? (
                <div className="rounded-xl bg-paid-soft p-4 text-center text-paid">
                  <p className="font-medium">Paid in full. Thank you!</p>
                  <p className="text-sm">A record of this payment has been sent to {business}.</p>
                </div>
              ) : (
                <div className="rounded-xl bg-line p-4 text-center text-sm text-ink-2">
                  This invoice has been cancelled. Contact {business} if you think this is a mistake.
                </div>
              )}
            </div>
          </div>
        </Card>

        <p className="mt-8 text-center text-xs text-muted">
          Invoicing by{" "}
          <Link href="/" className="inline-flex align-middle">
            <Logo className="!text-base" />
          </Link>
        </p>
      </div>
    </main>
  );
}
