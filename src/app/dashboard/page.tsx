import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { money, fmtDate, todayISO, daysBetween, addDays } from "@/lib/format";
import { displayStatus, daysOverdue, suggestedTone } from "@/lib/invoices";
import type { Invoice } from "@/lib/types";
import { ButtonLink, Card, PageHeader, StatusBadge } from "@/components/ui";
import { SeedButton } from "@/components/dashboard/SeedButton";

export const metadata = { title: "Overview · Duely" };

const TONE_LABEL = { friendly: "Friendly nudge", firm: "Firm reminder", final: "Final notice" } as const;

export default async function Overview() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("invoices")
    .select("*, clients(name, email, company)")
    .order("due_date", { ascending: true });
  const invoices = (data ?? []) as Invoice[];
  const today = todayISO();

  if (invoices.length === 0) {
    return (
      <>
        <PageHeader title="Welcome to Duely" subtitle="Two minutes from now you could have your first invoice out." />
        <Card className="p-8 sm:p-12">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl">Start with a client, then send an invoice.</h2>
            <p className="mt-3 text-ink-2">
              Every invoice gets its own payment page with UPI, cards and netbanking. When it goes overdue, Duely’s AI
              writes the follow-up for you, and on Pro it sends them automatically.
            </p>
            <div className="mt-8 flex flex-wrap items-start gap-3">
              <ButtonLink href="/dashboard/invoices/new">Create your first invoice</ButtonLink>
              <SeedButton />
            </div>
          </div>
        </Card>
      </>
    );
  }

  const open = invoices.filter((i) => i.status === "sent");
  const overdue = open.filter((i) => i.due_date < today).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const paid = invoices.filter((i) => i.status === "paid" && i.paid_at);
  const outstanding = open.reduce((s, i) => s + Number(i.total), 0);
  const overdueAmt = overdue.reduce((s, i) => s + Number(i.total), 0);
  const thirtyAgo = addDays(today, -30);
  const collected30 = paid.filter((i) => i.paid_at!.slice(0, 10) >= thirtyAgo).reduce((s, i) => s + Number(i.total), 0);
  const avgDaysToPay = paid.length
    ? Math.round(paid.reduce((s, i) => s + daysBetween(i.issue_date, i.paid_at!.slice(0, 10)), 0) / paid.length)
    : null;
  const expectedNext30 = open
    .filter((i) => i.due_date >= today && i.due_date <= addDays(today, 30))
    .reduce((s, i) => s + Number(i.total), 0);

  // Collected per month, last 6 months
  const months: { key: string; label: string; amount: number }[] = [];
  const now = new Date(today + "T00:00:00Z");
  for (let k = 5; k >= 0; k--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1));
    months.push({
      key: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),
      amount: 0,
    });
  }
  for (const i of paid) {
    const m = months.find((x) => x.key === i.paid_at!.slice(0, 7));
    if (m) m.amount += Number(i.total);
  }
  const maxMonth = Math.max(1, ...months.map((m) => m.amount), expectedNext30);

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={`${fmtDate(today)} · ${open.length} unpaid ${open.length === 1 ? "invoice" : "invoices"}`}
        action={<ButtonLink href="/dashboard/invoices/new">New invoice</ButtonLink>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Outstanding" value={money(outstanding)} note={`${open.length} open`} />
        <Stat
          label="Overdue"
          value={money(overdueAmt)}
          note={`${overdue.length} ${overdue.length === 1 ? "invoice" : "invoices"} late`}
          tone={overdue.length ? "bad" : undefined}
        />
        <Stat label="Collected · 30 days" value={money(collected30)} note={`${paid.length} paid all-time`} tone="good" />
        <Stat
          label="Avg. time to get paid"
          value={avgDaysToPay === null ? "—" : `${avgDaysToPay} days`}
          note="From issue date to payment"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Needs chasing</h2>
            <Link href="/dashboard/invoices?filter=overdue" className="text-sm text-muted hover:text-ink">
              View all
            </Link>
          </div>
          {overdue.length === 0 ? (
            <p className="mt-6 text-sm text-muted">Nobody is late right now. Nice.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {overdue.slice(0, 6).map((i) => {
                const d = daysOverdue(i, today);
                return (
                  <li key={i.id}>
                    <Link
                      href={`/dashboard/invoices/${i.id}`}
                      className="-mx-3 flex items-center gap-4 rounded-xl px-3 py-3 hover:bg-paper"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{i.clients?.company || i.clients?.name}</p>
                        <p className="text-xs text-muted">
                          {i.number} · due {fmtDate(i.due_date)} · <span className="text-ink-2">{TONE_LABEL[suggestedTone(d)]}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="tabular font-mono text-sm">{money(i.total)}</p>
                        <StatusBadge status="overdue" days={d} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-2xl">Cash flow</h2>
          <p className="text-xs text-muted">Collected per month, and what’s due in the next 30 days</p>
          <div className="mt-6 flex h-48 items-end gap-3" role="img" aria-label="Monthly collections bar chart">
            {months.map((m) => (
              <Bar key={m.key} label={m.label} amount={m.amount} max={maxMonth} />
            ))}
            <Bar label="Next 30d" amount={expectedNext30} max={maxMonth} dashed />
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">Recent invoices</h2>
          <Link href="/dashboard/invoices" className="text-sm text-muted hover:text-ink">
            All invoices
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-line">
          {[...invoices]
            .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.number.localeCompare(a.number))
            .slice(0, 5)
            .map((i) => (
              <li key={i.id}>
                <Link href={`/dashboard/invoices/${i.id}`} className="-mx-3 flex items-center gap-4 rounded-xl px-3 py-3 hover:bg-paper">
                  <span className="w-20 font-mono text-xs text-muted">{i.number}</span>
                  <span className="min-w-0 flex-1 truncate">{i.clients?.company || i.clients?.name}</span>
                  <StatusBadge status={displayStatus(i, today)} days={daysOverdue(i, today)} />
                  <span className="tabular w-24 text-right font-mono text-sm">{money(i.total)}</span>
                </Link>
              </li>
            ))}
        </ul>
      </Card>
    </>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "good" | "bad" }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className={`tabular mt-3 font-mono text-2xl ${tone === "bad" ? "text-overdue" : tone === "good" ? "text-paid" : ""}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </Card>
  );
}

function Bar({ label, amount, max, dashed }: { label: string; amount: number; max: number; dashed?: boolean }) {
  const h = Math.max(2, Math.round((amount / max) * 100));
  return (
    <div className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
      <span className="tabular font-mono text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
        {amount ? money(amount) : "₹0"}
      </span>
      <div
        className={`w-full rounded-md ${dashed ? "border-2 border-dashed border-ink/40 bg-lime/30" : "bg-ink"}`}
        style={{ height: `${h}%` }}
        title={`${label}: ${money(amount)}`}
      />
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  );
}
