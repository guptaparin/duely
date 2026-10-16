"use client";

import { useActionState, useEffect, useRef } from "react";
import { createClientAction, type ActionResult } from "@/app/dashboard/actions";
import { Button, Field, Notice, inputClass } from "@/components/ui";

export function AddClientForm({ onCreated, compact }: { onCreated?: (id: string) => void; compact?: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createClientAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      if (state.id) onCreated?.(state.id);
    }
  }, [state, onCreated]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className={`grid gap-4 ${compact ? "sm:grid-cols-3" : ""}`}>
        <Field label="Contact name">
          <input name="name" required className={inputClass} placeholder="Aarav Mehta" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" required className={inputClass} placeholder="aarav@company.com" />
        </Field>
        <Field label="Company (optional)">
          <input name="company" className={inputClass} placeholder="BrewBox Coffee" />
        </Field>
      </div>
      {state && !state.ok && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" disabled={pending} variant={compact ? "ghost" : "primary"}>
        {pending ? "Saving…" : "Add client"}
      </Button>
    </form>
  );
}
