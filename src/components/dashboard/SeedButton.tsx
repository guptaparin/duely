"use client";

import { useState, useTransition } from "react";
import { seedDemoDataAction } from "@/app/dashboard/actions";
import { Button, Notice } from "@/components/ui";

export function SeedButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <Button
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await seedDemoDataAction();
            if (!r.ok) setError(r.error);
          })
        }
      >
        {pending ? "Adding sample data…" : "Load sample clients & invoices"}
      </Button>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
