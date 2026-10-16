"use client";

/* Minimal typing for Razorpay Checkout (https://checkout.razorpay.com/v1/checkout.js) */
export interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (r: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (opts: RazorpayOptions) => { open: () => void; on: (ev: string, cb: (e: unknown) => void) => void };
  }
}

let loader: Promise<void> | null = null;

export function loadRazorpay() {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  loader ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => {
      loader = null;
      reject(new Error("Couldn't load the payment window. Check your connection."));
    };
    document.body.appendChild(s);
  });
  return loader;
}

export async function openCheckout(opts: Omit<RazorpayOptions, "handler" | "modal">) {
  await loadRazorpay();
  return new Promise<RazorpayResponse>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      ...opts,
      theme: { color: "#17150f" },
      handler: resolve,
      modal: { ondismiss: () => reject(new Error("dismissed")) },
    });
    rzp.on("payment.failed", () => reject(new Error("The payment failed. No money was taken. Try again or use another method.")));
    rzp.open();
  });
}
