"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveSettingsAction, type ActionResult } from "@/app/dashboard/actions";
import { Button, Field, Notice, inputClass } from "@/components/ui";

export function SettingsForm({
  fullName,
  businessName,
  autoChase,
  canAutoChase,
}: {
  fullName: string;
  businessName: string;
  autoChase: boolean;
  canAutoChase: boolean;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveSettingsAction, null);
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" hint="Used to sign follow-up emails.">
          <input name="full_name" defaultValue={fullName} className={inputClass} />
        </Field>
        <Field label="Business name" hint="Shown on invoices and payment pages.">
          <input name="business_name" defaultValue={businessName} className={inputClass} />
        </Field>
      </div>
      <label
        className={`flex items-start gap-3 rounded-xl border border-line p-4 ${canAutoChase ? "bg-paper" : "bg-paper/50 opacity-70"}`}
      >
        <input name="auto_chase" type="checkbox" defaultChecked={autoChase} disabled={!canAutoChase} className="mt-1 size-4 accent-ink" />
        <span>
          <span className="block text-sm font-medium">Auto-chase overdue invoices</span>
          <span className="block text-sm text-muted">
            Every morning Duely writes and sends a follow-up for each overdue invoice (at most one every 3 days per invoice),
            escalating from friendly to firm to final.
            {!canAutoChase && (
              <>
                {" "}
                <Link href="/dashboard/billing" className="font-medium text-ink underline underline-offset-4">
                  Available on Pro.
                </Link>
              </>
            )}
          </span>
        </span>
      </label>
      {state && !state.ok && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">Saved.</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
