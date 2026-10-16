"use client";

import { useTransition } from "react";
import { deleteClientAction } from "@/app/dashboard/actions";

export function DeleteClientButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      className="text-xs text-muted hover:text-overdue disabled:opacity-50"
      onClick={() => {
        if (!confirm(`Remove ${name}?`)) return;
        start(async () => {
          const r = await deleteClientAction(id);
          if (!r.ok) alert(r.error);
        });
      }}
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
