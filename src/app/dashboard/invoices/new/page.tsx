import { requireUser } from "@/lib/supabase/server";
import type { Client } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { InvoiceForm } from "@/components/dashboard/InvoiceForm";

export const metadata = { title: "New invoice · Duely" };

export default async function NewInvoicePage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("clients").select("*").order("name");
  return (
    <>
      <PageHeader title="New invoice" subtitle="Describe the work in plain words and let AI fill it in, or add lines yourself." />
      <InvoiceForm clients={(data ?? []) as Client[]} />
    </>
  );
}
