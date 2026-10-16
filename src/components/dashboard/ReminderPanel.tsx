"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Reminder } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { markReminderSentAction } from "@/app/dashboard/actions";
import { Button, Card, Notice, inputClass } from "@/components/ui";

type Tone = Reminder["tone"];

const TONES: { id: Tone; label: string; hint: string }[] = [
  { id: "friendly", label: "Friendly", hint: "Just a nudge" },
  { id: "firm", label: "Firm", hint: "Clear deadline" },
  { id: "final", label: "Final", hint: "Last notice" },
];

const CHANNEL_LABEL: Record<Reminder["channel"], string> = {
  draft: "Draft",
  email: "Emailed by Duely",
  manual: "Sent by you",
  auto: "Auto-chased",
};

export function ReminderPanel({
  invoiceId,
  clientEmail,
  canChase,
  defaultTone,
  daysOverdue,
  emailEnabled,
  history,
}: {
  invoiceId: string;
  clientEmail: string;
  canChase: boolean;
  defaultTone: Tone;
  daysOverdue: number;
  emailEnabled: boolean;
  history: Reminder[];
}) {
  const router = useRouter();
  const [tone, setTone] = useState<Tone>(defaultTone);
  const [draft, setDraft] = useState<{ id: string; subject: string; body: string } | null>(null);
  const [busy, setBusy] = useState<"draft" | "send" | null>(null);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [, start] = useTransition();

  async function generate() {
    setBusy("draft");
    setMsg(null);
    try {
      const res = await fetch("/api/ai/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't write the reminder");
      setDraft({ id: data.id, subject: data.subject, body: data.body });
      router.refresh();
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setBusy(null);
    }
  }

  async function sendEmail() {
    if (!draft) return;
    setBusy("send");
    setMsg(null);
    try {
      const res = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderId: draft.id, subject: draft.subject, body: draft.body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't send");
      setMsg({ tone: "success", text: `Sent to ${clientEmail}.` });
      setDraft(null);
      router.refresh();
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setBusy(null);
    }
  }

  function markSent() {
    if (!draft) return;
    const id = draft.id;
    start(async () => {
      const r = await markReminderSentAction(id);
      if (!r.ok) return setMsg({ tone: "error", text: r.error });
      setMsg({ tone: "success", text: "Logged as sent." });
      setDraft(null);
    });
  }

  const mailto = draft
    ? `mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
    : "#";

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-lime px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink">AI</span>
        <h2 className="font-display text-2xl">Follow-up</h2>
      </div>

      {!canChase ? (
        <p className="mt-3 text-sm text-muted">This invoice is closed, so there’s nothing to chase.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            {daysOverdue > 0
              ? `${daysOverdue} ${daysOverdue === 1 ? "day" : "days"} overdue. Duely suggests a ${defaultTone} tone.`
              : "Not due yet. A friendly heads-up works well a few days before the due date."}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tone">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={tone === t.id}
                onClick={() => setTone(t.id)}
                className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  tone === t.id ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink-2"
                }`}
              >
                <span className="block text-sm font-medium">{t.label}</span>
                <span className={`block text-xs ${tone === t.id ? "text-paper/60" : "text-muted"}`}>{t.hint}</span>
              </button>
            ))}
          </div>

          <Button type="button" onClick={generate} disabled={busy !== null} className="mt-4 w-full">
            {busy === "draft" ? "Writing…" : draft ? "Rewrite" : "Write follow-up with AI"}
          </Button>

          {draft && (
            <div className="mt-5 space-y-3">
              <input
                className={inputClass}
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                aria-label="Subject"
              />
              <textarea
                className={`${inputClass} leading-relaxed`}
                rows={10}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                aria-label="Email body"
              />
              <div className="flex flex-wrap gap-2">
                {emailEnabled && (
                  <Button type="button" variant="lime" onClick={sendEmail} disabled={busy !== null}>
                    {busy === "send" ? "Sending…" : `Send to ${clientEmail}`}
                  </Button>
                )}
                <a
                  href={mailto}
                  onClick={() => setTimeout(markSent, 300)}
                  className="inline-flex items-center rounded-full border border-line bg-card px-4 py-2 text-sm font-medium hover:border-ink-2"
                >
                  Open in email app
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`);
                    setMsg({ tone: "success", text: "Copied. Paste it into WhatsApp or email." });
                  }}
                >
                  Copy
                </Button>
                <Button type="button" variant="ghost" onClick={markSent}>
                  Mark as sent
                </Button>
              </div>
            </div>
          )}
          {msg && (
            <div className="mt-4">
              <Notice tone={msg.tone}>{msg.text}</Notice>
            </div>
          )}
        </>
      )}

      <div className="mt-8 border-t border-line pt-5">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted">History</h3>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No follow-ups yet.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {history.map((r) => (
              <li key={r.id} className="rounded-xl border border-line bg-paper p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium capitalize">{r.tone}</span>
                  <span className={r.sent_at ? "text-paid" : "text-muted"}>
                    {CHANNEL_LABEL[r.channel]} · {fmtDate(r.sent_at || r.created_at)}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-ink-2">{r.subject}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}
