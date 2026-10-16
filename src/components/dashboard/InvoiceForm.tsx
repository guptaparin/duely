"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Client, LineItem } from "@/lib/types";
import { computeTotals } from "@/lib/invoices";
import { addDays, money, todayISO } from "@/lib/format";
import { createInvoiceAction } from "@/app/dashboard/actions";
import { Button, Card, Field, Notice, inputClass } from "@/components/ui";
import { AddClientForm } from "./AddClientForm";

const EMPTY: LineItem = { description: "", quantity: 1, rate: 0 };

export function InvoiceForm({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const today = todayISO();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [showNewClient, setShowNewClient] = useState(clients.length === 0);
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(addDays(today, 15));
  const [taxRate, setTaxRate] = useState(18);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const totals = useMemo(() => computeTotals(items, taxRate), [items, taxRate]);

  const onClientCreated = useCallback((id: string) => {
    setClientId(id);
    setShowNewClient(false);
  }, []);

  function update(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function aiFill() {
    if (!aiText.trim()) return;
    setAiBusy(true);
    setAiMsg(null);
    try {
      const res = await fetch("/api/ai/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI couldn't read that");
      setItems(data.items);
      if (typeof data.due_in_days === "number") setDueDate(addDays(issueDate, data.due_in_days));
      if (typeof data.tax_rate === "number") setTaxRate(data.tax_rate);
      if (data.notes) setNotes(data.notes);
      setAiMsg({ tone: "success", text: `Filled ${data.items.length} line ${data.items.length === 1 ? "item" : "items"}. Check them below.` });
    } catch (e) {
      setAiMsg({ tone: "error", text: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setAiBusy(false);
    }
  }

  function submit() {
    setError(null);
    startSave(async () => {
      const r = await createInvoiceAction({
        client_id: clientId,
        issue_date: issueDate,
        due_date: dueDate,
        tax_rate: taxRate,
        notes,
        items,
      });
      if (!r.ok) return setError(r.error);
      router.push(`/dashboard/invoices/${r.id}?created=1`);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card className="relative overflow-hidden border-ink bg-ink p-6 text-paper">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-lime px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink">AI</span>
            <h2 className="font-display text-2xl">Describe the work</h2>
          </div>
          <p className="mt-1 text-sm text-paper/60">
            e.g. “Logo design 15k, 3 social banners at 2,000 each, 18% GST, due in 10 days”
          </p>
          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            rows={3}
            className="mt-4 w-full rounded-xl border border-paper/15 bg-paper/5 px-3.5 py-2.5 text-sm text-paper placeholder:text-paper/30 focus:border-lime focus:outline-none"
            placeholder="What did you do for this client?"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="button" variant="lime" onClick={aiFill} disabled={aiBusy || !aiText.trim()}>
              {aiBusy ? "Reading…" : "Fill invoice with AI"}
            </Button>
            {aiMsg && (
              <span className={`text-sm ${aiMsg.tone === "error" ? "text-[#ff9b8a]" : "text-lime"}`}>{aiMsg.text}</span>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Bill to</h2>
            {clients.length > 0 && (
              <button type="button" onClick={() => setShowNewClient((v) => !v)} className="text-sm text-muted hover:text-ink">
                {showNewClient ? "Pick existing client" : "+ New client"}
              </button>
            )}
          </div>
          <div className="mt-4">
            {showNewClient ? (
              <AddClientForm compact onCreated={onClientCreated} />
            ) : (
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputClass}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company ? `${c.company} — ${c.name}` : c.name} ({c.email})
                  </option>
                ))}
              </select>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-2xl">Line items</h2>
          <div className="mt-4 space-y-3">
            <div className="hidden grid-cols-[1fr_80px_120px_100px_28px] gap-3 text-xs font-medium uppercase tracking-wider text-muted sm:grid">
              <span>Description</span>
              <span>Qty</span>
              <span>Rate (₹)</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr] gap-3 sm:grid-cols-[1fr_80px_120px_100px_28px] sm:items-center">
                <input
                  className={`${inputClass} col-span-2 sm:col-span-1`}
                  value={it.description}
                  onChange={(e) => update(idx, { description: e.target.value })}
                  placeholder="What you delivered"
                  aria-label="Description"
                />
                <input
                  className={`${inputClass} tabular font-mono`}
                  type="number"
                  min={0}
                  step="any"
                  value={it.quantity}
                  onChange={(e) => update(idx, { quantity: Number(e.target.value) })}
                  aria-label="Quantity"
                />
                <input
                  className={`${inputClass} tabular font-mono`}
                  type="number"
                  min={0}
                  step="any"
                  value={it.rate}
                  onChange={(e) => update(idx, { rate: Number(e.target.value) })}
                  aria-label="Rate"
                />
                <span className="tabular hidden text-right font-mono text-sm sm:block">{money(it.quantity * it.rate)}</span>
                <button
                  type="button"
                  aria-label="Remove line"
                  disabled={items.length === 1}
                  onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                  className="hidden text-muted hover:text-overdue disabled:opacity-30 sm:block"
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setItems((p) => [...p, { ...EMPTY }])} className="text-sm font-medium text-ink-2 hover:text-ink">
              + Add line
            </button>
          </div>
        </Card>
      </div>

      <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
        <Card className="space-y-4 p-6">
          <Field label="Issue date">
            <input type="date" className={inputClass} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </Field>
          <Field label="Due date">
            <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="GST / tax %">
            <input
              type="number"
              min={0}
              max={40}
              step="any"
              className={`${inputClass} tabular font-mono`}
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
            />
          </Field>
          <Field label="Note to client (optional)">
            <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Thanks for the work!" />
          </Field>
          <dl className="space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-ink-2">
              <dt>Subtotal</dt>
              <dd className="tabular font-mono">{money(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-ink-2">
              <dt>Tax ({taxRate}%)</dt>
              <dd className="tabular font-mono">{money(totals.total - totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between pt-2 text-lg font-medium">
              <dt>Total</dt>
              <dd className="tabular font-mono">{money(totals.total)}</dd>
            </div>
          </dl>
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="button" onClick={submit} disabled={saving || !clientId || showNewClient} className="w-full">
            {saving ? "Creating…" : "Create invoice & payment link"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
