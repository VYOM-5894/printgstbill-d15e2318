import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INDIAN_STATES } from "@/lib/gst";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — GST Billing" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const existing = await supabase.from("company_settings").select("*").limit(1).maybeSingle();
      if (existing.data) return existing.data;
      const inserted = await supabase.from("company_settings").insert({ name: "My Company" }).select("*").single();
      if (inserted.error) throw inserted.error;
      return inserted.data;
    },
  });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  async function save() {
    if (!data?.id) return;
    const { error } = await supabase.from("company_settings").update({
      name: form.name, gstin: form.gstin, state: form.state, address: form.address,
      mobile: form.mobile, email: form.email, logo_url: form.logo_url,
      bank_name: form.bank_name, bank_account: form.bank_account, bank_ifsc: form.bank_ifsc,
      invoice_prefix: form.invoice_prefix, next_invoice_number: Number(form.next_invoice_number ?? 1),
      updated_at: new Date().toISOString(),
    }).eq("id", data.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["company"] });
  }

  if (!data) return <div>Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Company Settings</h1>
        <p className="text-sm text-muted-foreground">These details appear on every invoice you print.</p>
      </div>
      <div className="bg-card border rounded-lg p-4 grid md:grid-cols-2 gap-4">
        <F label="Company Name"><input className="input" value={form.name??""} onChange={e=>setForm({...form,name:e.target.value})} /></F>
        <F label="GSTIN"><input className="input" value={form.gstin??""} onChange={e=>setForm({...form,gstin:e.target.value.toUpperCase()})} /></F>
        <F label="State">
          <select className="input" value={form.state??""} onChange={e=>setForm({...form,state:e.target.value})}>
            <option value="">Select state</option>
            {INDIAN_STATES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </F>
        <F label="Mobile"><input className="input" value={form.mobile??""} onChange={e=>setForm({...form,mobile:e.target.value})} /></F>
        <F label="Email"><input className="input" value={form.email??""} onChange={e=>setForm({...form,email:e.target.value})} /></F>
        <F label="Logo URL"><input className="input" value={form.logo_url??""} onChange={e=>setForm({...form,logo_url:e.target.value})} placeholder="https://…" /></F>
        <div className="md:col-span-2">
          <F label="Address"><textarea rows={2} className="input" value={form.address??""} onChange={e=>setForm({...form,address:e.target.value})} /></F>
        </div>
        <F label="Bank Name"><input className="input" value={form.bank_name??""} onChange={e=>setForm({...form,bank_name:e.target.value})} /></F>
        <F label="Bank A/C"><input className="input" value={form.bank_account??""} onChange={e=>setForm({...form,bank_account:e.target.value})} /></F>
        <F label="IFSC"><input className="input" value={form.bank_ifsc??""} onChange={e=>setForm({...form,bank_ifsc:e.target.value})} /></F>
        <div />
        <F label="Invoice Prefix"><input className="input" value={form.invoice_prefix??""} onChange={e=>setForm({...form,invoice_prefix:e.target.value})} /></F>
        <F label="Next Invoice Number"><input type="number" className="input" value={form.next_invoice_number??1} onChange={e=>setForm({...form,next_invoice_number:+e.target.value})} /></F>
      </div>
      <button onClick={save} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Save Settings</button>
      <style>{`.input{width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:.375rem;background:var(--background);font-size:.875rem}`}</style>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium mb-1">{label}</label>{children}</div>;
}
