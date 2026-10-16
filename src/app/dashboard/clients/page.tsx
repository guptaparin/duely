import { requireUser } from "@/lib/supabase/server";
import { clientRisk } from "@/lib/invoices";
import { money } from "@/lib/format";
import { getPlan } from "@/lib/plans";
import type { Client, Invoice } from "@/lib/types";
import { Card, PageHeader } from "@/components/ui";
import { AddClientForm } from "@/components/dashboard/AddClientForm";
import { DeleteClientButton } from "@/components/dashboard/DeleteClientButton";

export const metadata = { title: "Clients · Duely" };

const RISK_STYLE = {
  Reliable: "bg-paid-soft text-paid",
  Watch: "bg-due-soft text-due",
  "High risk": "bg-overdue-soft text-overdue",
  New: "bg-line text-ink-2",
} as const;

export default async function ClientsPage() {
  const { supabase, user } = await requireUser();
  const [{ data: clients }, { data: invoices }, { data: profile }] = await Promise.all([
    supabase.from("clients").select("*").order("created_at", { ascending: false }),
    supabase.from("invoices").select("client_id, status, due_date, paid_at, total"),
    supabase.from("profiles").select("plan").eq("id", user!.id).single(),
  ]);
  const showRisk = getPlan(profile?.plan).id !== "free";

  const rows = ((clients ?? []) as Client[]).map((c) => {
    const mine = ((invoices ?? []) as Invoice[]).filter((i) => i.client_id === c.id);
    return {
      client: c,
      risk: clientRisk(mine),
      owed: mine.filter((i) => i.status === "sent").reduce((s, i) => s + Number(i.total), 0),
      billed: mine.filter((i) => i.status !== "void").reduce((s, i) => s + Number(i.total), 0),
    };
  });

  return (
    <>
      <PageHeader title="Clients" subtitle="Who you bill, what they owe, and how reliably they pay." />
      <Card className="mb-6 p-6">
        <h2 className="mb-4 font-display text-2xl">Add a client</h2>
        <AddClientForm compact />
      </Card>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-8 text-sm text-muted">No clients yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-3 font-medium">Client</th>
                  <th className="px-6 py-3 font-medium">Payment risk</th>
                  <th className="px-6 py-3 text-right font-medium">Owes you</th>
                  <th className="px-6 py-3 text-right font-medium">Billed all-time</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ client, risk, owed, billed }) => (
                  <tr key={client.id}>
                    <td className="px-6 py-4">
                      <p className="font-medium">{client.company || client.name}</p>
                      <p className="text-xs text-muted">
                        {client.company ? `${client.name} · ` : ""}
                        {client.email}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {showRisk ? (
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RISK_STYLE[risk.label]}`}>
                            {risk.label}
                            {risk.label !== "New" && <span className="tabular font-mono"> · {risk.score}</span>}
                          </span>
                          {risk.paidCount > 0 && (
                            <span className="text-xs text-muted">avg {risk.avgDaysLate}d late</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted">Available on Pro</span>
                      )}
                    </td>
                    <td className={`tabular px-6 py-4 text-right font-mono ${owed ? "" : "text-muted"}`}>{money(owed)}</td>
                    <td className="tabular px-6 py-4 text-right font-mono text-muted">{money(billed)}</td>
                    <td className="px-6 py-4 text-right">
                      <DeleteClientButton id={client.id} name={client.company || client.name} />
                    </td>
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
