"use client";

import { useTransition } from "react";
import { markInvoicePaidAction, voidInvoiceAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui";
import type { InvoiceStatus } from "@/lib/types";

export function InvoiceActions({ id, status }: { id: string; status: InvoiceStatus }) {
  const [pending, start] = useTransition();
  if (status !== "sent") return null;
  return (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            if (!confirm("Mark this invoice as paid outside Duely (cash, bank transfer)?")) return;
            const r = await markInvoicePaidAction(id);
            if (!r.ok) alert(r.error);
          })
        }
      >
        Mark as paid
      </Button>
      <Button
        variant="danger"
        disabled={pending}
        onClick={() =>
          start(async () => {
            if (!confirm("Void this invoice? The payment link will stop working.")) return;
            const r = await voidInvoiceAction(id);
            if (!r.ok) alert(r.error);
          })
        }
      >
        Void
      </Button>
    </div>
  );
}
