import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeInvoiceTotals, formatINR, amountInWords, type LineItem } from "@/lib/gst";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/invoices/new")({
  head: () => ({ meta: [{ title: "New Invoice — GST Billing" }] }),
  component: NewInvoice,
});

function NewInvoice() {
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0,10));
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<(LineItem & { product_id?: string })[]>([
    { name: "", hsn: "", quantity: 1, unit: "NOS", rate: 0, gst_rate: 18 },
  ]);
  const [saving, setSaving] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await supabase.from("customers").select("*").order("name")).data ?? [],
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("*").order("name")).data ?? [],
  });
  const { data: company } = useQuery({
    queryKey: ["company"],
    queryFn: async () => (await supabase.from("company_settings").select("*").limit(1).single()).data,
  });

  const customer = customers.find((c: any) => c.id === customerId);
  const sameState = !!customer && !!company && (customer.state || "").trim().toLowerCase() === (company.state || "").trim().toLowerCase() && !!company.state;
  const totals = useMemo(() => computeInvoiceTotals(items, discount, sameState), [items, discount, sameState]);

  function updateItem(idx: number, patch: Partial<LineItem & { product_id?: string }>) {
    setItems(items.map((it,i) => i===idx ? { ...it, ...patch } : it));
  }
  function pickProduct(idx: number, productId: string) {
    const p = products.find((x: any) => x.id === productId);
    if (!p) return;
    updateItem(idx, { product_id: p.id, name: p.name, hsn: p.hsn ?? "", rate: Number(p.unit_price), gst_rate: Number(p.gst_rate), unit: p.unit ?? "NOS" });
  }
  function addRow() { setItems([...items, { name: "", hsn: "", quantity: 1, unit: "NOS", rate: 0, gst_rate: 18 }]); }
  function removeRow(idx: number) { setItems(items.filter((_,i)=>i!==idx)); }

  async function save() {
    if (!customer) { toast.error("Select a customer"); return; }
    const valid = items.filter(it => it.name.trim() && it.quantity > 0);
    if (valid.length === 0) { toast.error("Add at least one item"); return; }
    setSaving(true);
    try {
      const { data: numData, error: numErr } = await supabase.rpc("next_invoice_number");
      if (numErr) throw numErr;
      const invoice_number = numData as string;
      const payload = {
        invoice_number,
        invoice_date: invoiceDate,
        customer_id: customer.id,
        customer_snapshot: customer,
        company_snapshot: company,
        is_igst: !sameState,
        subtotal: totals.subtotal,
        discount: totals.discount,
        taxable_amount: totals.taxable,
        cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst,
        total: totals.total,
        amount_in_words: amountInWords(totals.total),
        notes,
      };
      const { data: inv, error } = await supabase.from("invoices").insert(payload).select().single();
      if (error) throw error;
      const itemsPayload = valid.map((it, i) => ({
        invoice_id: inv.id,
        product_id: it.product_id ?? null,
        name: it.name, hsn: it.hsn, quantity: it.quantity, unit: it.unit,
        rate: it.rate, gst_rate: it.gst_rate,
        amount: +(it.quantity*it.rate).toFixed(2),
        position: i,
      }));
      const { error: itErr } = await supabase.from("invoice_items").insert(itemsPayload);
      if (itErr) throw itErr;
      toast.success(`Invoice ${invoice_number} created`);
      navigate({ to: "/invoices/$id", params: { id: inv.id } });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Invoice</h1>
        <div className="flex gap-2">
          <button onClick={()=>navigate({ to: "/invoices" })} className="px-4 py-2 border rounded-md text-sm">Cancel</button>
          <button disabled={saving} onClick={save} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-60">
            {saving ? "Saving…" : "Save Invoice"}
          </button>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4 grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Customer *</label>
          <select className="input" value={customerId} onChange={e=>setCustomerId(e.target.value)}>
            <option value="">Select customer</option>
            {customers.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {customer && (
            <div className="mt-2 text-xs text-muted-foreground">
              {customer.gstin && <div>GSTIN: <span className="font-mono">{customer.gstin}</span></div>}
              {customer.state && <div>State: {customer.state}</div>}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Invoice Date</label>
          <input type="date" className="input" value={invoiceDate} onChange={e=>setInvoiceDate(e.target.value)} />
        </div>
        <div className="flex items-end">
          <div className={`text-sm px-3 py-2 rounded-md ${sameState ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"}`}>
            Tax type: <strong>{sameState ? "CGST + SGST (intra-state)" : "IGST (inter-state)"}</strong>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">Product / Description</th>
              <th className="p-2">HSN</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2">Unit</th>
              <th className="p-2 text-right">Rate</th>
              <th className="p-2 text-right">GST %</th>
              <th className="p-2 text-right">Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} className="border-t align-top">
                <td className="p-2">
                  <select className="input mb-1" value={it.product_id ?? ""} onChange={e=>pickProduct(idx, e.target.value)}>
                    <option value="">— pick product (optional) —</option>
                    {products.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input className="input" placeholder="Description" value={it.name} onChange={e=>updateItem(idx,{name:e.target.value})} />
                </td>
                <td className="p-2"><input className="input w-24" value={it.hsn} onChange={e=>updateItem(idx,{hsn:e.target.value})} /></td>
                <td className="p-2"><input type="number" step="0.01" className="input w-20 text-right" value={it.quantity} onChange={e=>updateItem(idx,{quantity:+e.target.value})} /></td>
                <td className="p-2"><input className="input w-16" value={it.unit} onChange={e=>updateItem(idx,{unit:e.target.value})} /></td>
                <td className="p-2"><input type="number" step="0.01" className="input w-24 text-right" value={it.rate} onChange={e=>updateItem(idx,{rate:+e.target.value})} /></td>
                <td className="p-2">
                  <select className="input w-20" value={it.gst_rate} onChange={e=>updateItem(idx,{gst_rate:+e.target.value})}>
                    {[0,5,12,18,28].map(r=><option key={r} value={r}>{r}%</option>)}
                  </select>
                </td>
                <td className="p-2 text-right font-medium">{formatINR(it.quantity*it.rate)}</td>
                <td className="p-2"><button onClick={()=>removeRow(idx)} className="p-2 text-destructive hover:bg-muted rounded"><Trash2 className="size-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 border-t">
          <button onClick={addRow} className="inline-flex items-center gap-2 text-sm text-primary"><Plus className="size-4" /> Add row</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border rounded-lg p-4 space-y-2">
          <label className="block text-sm font-medium">Notes / Terms</label>
          <textarea rows={4} className="input" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Payment terms, thank-you note, etc." />
        </div>
        <div className="bg-card border rounded-lg p-4 space-y-2 text-sm">
          <Row label="Subtotal" v={totals.subtotal} />
          <div className="flex justify-between items-center">
            <span>Discount</span>
            <input type="number" step="0.01" className="input w-32 text-right" value={discount} onChange={e=>setDiscount(+e.target.value)} />
          </div>
          <Row label="Taxable Amount" v={totals.taxable} />
          {sameState ? (<>
            <Row label="CGST" v={totals.cgst} />
            <Row label="SGST" v={totals.sgst} />
          </>) : (
            <Row label="IGST" v={totals.igst} />
          )}
          <div className="flex justify-between text-base font-bold pt-2 border-t">
            <span>Grand Total</span><span>{formatINR(totals.total)}</span>
          </div>
          <div className="text-xs text-muted-foreground italic pt-1">{amountInWords(totals.total)}</div>
        </div>
      </div>
      <style>{`.input{width:100%;padding:.4rem .55rem;border:1px solid var(--border);border-radius:.375rem;background:var(--background);font-size:.875rem}`}</style>
    </div>
  );
}

function Row({ label, v }: { label: string; v: number }) {
  return <div className="flex justify-between"><span>{label}</span><span className="font-medium">{formatINR(v)}</span></div>;
}
