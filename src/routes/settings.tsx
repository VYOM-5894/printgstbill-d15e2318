import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/local-db";
import { INDIAN_STATES } from "@/lib/gst";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — GST Billing" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["company"], queryFn: () => db.company.get() });
  const [form, setForm] = useState<any>({});
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);

  async function save() {
    if (!data?.id) return;
    try {
      await db.company.update({
        name: form.name, gstin: form.gstin, state: form.state, address: form.address,
        mobile: form.mobile, email: form.email, logo_url: form.logo_url,
        bank_name: form.bank_name, bank_account: form.bank_account, bank_ifsc: form.bank_ifsc,
        invoice_prefix: form.invoice_prefix, next_invoice_number: Number(form.next_invoice_number ?? 1),
      });
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["company"] });
    } catch (e: any) { toast.error(e.message); }
  }

  async function exportData() {
    const dump = await db.exportAll();
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gst-billing-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  }

  async function importData(file: File) {
    if (!confirm("This will REPLACE all current data with the contents of this file. Continue?")) return;
    try {
      const text = await file.text();
      await db.importAll(JSON.parse(text));
      toast.success("Data imported");
      qc.invalidateQueries();
    } catch (e: any) { toast.error("Import failed: " + e.message); }
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
        <F label="Logo URL"><input className="input" value={form.logo_url??""} onChange={e=>setForm({...form,logo_url:e.target.value})} placeholder="https://… or data:image/…" /></F>
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

      <div className="border-t pt-6 space-y-3">
        <h2 className="text-lg font-bold">Backup & Restore</h2>
        <p className="text-sm text-muted-foreground">All your data is stored locally on this device. Export regularly to back it up.</p>
        <div className="flex gap-2">
          <button onClick={exportData} className="inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm"><Download className="size-4" /> Export Backup (JSON)</button>
          <button onClick={()=>fileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm"><Upload className="size-4" /> Import Backup</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={e=>{const f=e.target.files?.[0]; if (f) importData(f); e.target.value="";}} />
        </div>
      </div>
      <style>{`.input{width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:.375rem;background:var(--background);font-size:.875rem}`}</style>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium mb-1">{label}</label>{children}</div>;
}
