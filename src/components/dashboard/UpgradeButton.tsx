"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { openCheckout } from "@/lib/checkout";
import { Button } from "@/components/ui";

export function UpgradeButton({ plan, label, variant = "primary" }: { plan: "pro" | "agency"; label: string; variant?: "primary" | "lime" | "ghost" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error);
      const result = await openCheckout({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Duely",
        description: `${order.planName} plan — 30 days`,
        prefill: { email: order.email },
      });
      const v = await fetch("/api/billing/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      const vd = await v.json();
      if (!v.ok) throw new Error(vd.error);
      setDone(true);
      router.refresh();
    } catch (e) {
      if (e instanceof Error && e.message !== "dismissed") setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button variant={variant} onClick={go} disabled={busy} className="w-full">
        {busy ? "Opening checkout…" : done ? "Upgraded ✓" : label}
      </Button>
      {error && <p className="mt-2 text-xs text-overdue">{error}</p>}
    </div>
  );
}
