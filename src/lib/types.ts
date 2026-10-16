export interface LineItem {
  description: string;
  quantity: number;
  rate: number;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string;
  company: string | null;
  created_at: string;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  number: string;
  currency: string;
  items: LineItem[];
  subtotal: number;
  tax_rate: number;
  total: number;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  notes: string | null;
  public_token: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  platform_fee: number;
  paid_at: string | null;
  created_at: string;
  clients?: Pick<Client, "name" | "email" | "company"> | null;
}

export interface Reminder {
  id: string;
  invoice_id: string;
  tone: "friendly" | "firm" | "final";
  subject: string;
  body: string;
  channel: "draft" | "email" | "manual" | "auto";
  sent_at: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  business_name: string | null;
  plan: "free" | "pro" | "agency";
  plan_renews_at: string | null;
  auto_chase: boolean;
  ai_credits_used: number;
  ai_period_start: string;
}
