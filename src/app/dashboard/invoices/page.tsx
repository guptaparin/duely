import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { displayStatus, daysOverdue, type DisplayStatus } from "@/lib/invoices";
import { fmtDate, money, todayISO } from "@/lib/format";
import type { Invoice } from "@/lib/types";
import { ButtonLink, Card, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Invoices · Duely" };

const FILTERS: { id: "all" | DisplayStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "overdue", label: "Overdue" },
  { id: "due", label: "Awaiting" },
  { id: "paid", label: "Paid" },
  { id: "void", label: "Void" },
];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = "all" } = await searchParams;
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("invoices")
    .select("*, clients(name, email, company)")
    .order("issue_date", { ascending: false })
    .order("number", { ascending: false });
  const today = todayISO();
  const all = (data ?? []) as Invoice[];
  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, f.id === "all" ? all.length : all.filter((i) => displayStatus(i, today) === f.id).length]));
  const list = filter === "all" ? all : all.filter((i) => displayStatus(i, today) === filter);

  return (
    <>
      <PageHeader title="Invoices" action={<ButtonLink href="/dashboard/invoices/new">New invoice</ButtonLink>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id === "all" ? "/dashboard/invoices" : `/dashboard/invoices?filter=${f.id}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${
              filter === f.id ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2 hover:border-ink-2"
            }`}
          >
            {f.label} <span className="tabular ml-1 font-mono text-xs opacity-60">{counts[f.id]}</span>
          </Link>
        ))}
      </div>
      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <p className="p-8 text-sm text-muted">Nothing here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-3 font-medium">Invoice</th>
                  <th className="px-6 py-3 font-medium">Client</th>
                  <th className="px-6 py-3 font-medium">Due</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((i) => (
                  <tr key={i.id} className="relative hover:bg-paper">
                    <td className="px-6 py-4 font-mono text-xs">
                      <Link href={`/dashboard/invoices/${i.id}`} className="after:absolute after:inset-0">
                        {i.number}
                      </Link>
                    </td>
                    <td className="px-6 py-4">{i.clients?.company || i.clients?.name}</td>
                    <td className="px-6 py-4 text-ink-2">{fmtDate(i.due_date)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={displayStatus(i, today)} days={daysOverdue(i, today)} />
                    </td>
                    <td className="tabular px-6 py-4 text-right font-mono">{money(i.total, i.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
