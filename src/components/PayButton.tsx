"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { openCheckout } from "@/lib/checkout";
import { Button, Notice } from "@/components/ui";

export function PayButton({ token, label, businessName }: { token: string; label: string; businessName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error);
      const result = await openCheckout({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: businessName,
        description: "Invoice payment",
        prefill: order.prefill,
      });
      const v = await fetch("/api/pay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      const vd = await v.json();
      if (!v.ok) throw new Error(vd.error);
      router.refresh();
    } catch (e) {
      if (e instanceof Error && e.message !== "dismissed") setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={pay} disabled={busy} className="w-full py-3.5 text-base">
        {busy ? "Opening secure checkout…" : label}
      </Button>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
