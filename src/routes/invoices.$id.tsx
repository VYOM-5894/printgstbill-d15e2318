import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/local-db";
import { formatINR } from "@/lib/gst";
import { Printer, Download, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { StatusBadge } from "./index";

export const Route = createFileRoute("/invoices/$id")({
  head: () => ({ meta: [{ title: "Invoice — GST Billing" }] }),
  component: InvoiceView,
});

function InvoiceView() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => db.invoices.get(id),
  });

  if (!data?.inv) return <div className="p-8 text-muted-foreground">Loading…</div>;
  const inv = data.inv;
  const items = data.items;
  const payments = data.payments;
  const company = inv.company_snapshot || {};
  const customer = inv.customer_snapshot || {};
  const total = Number(inv.total||0);
  const paid = Number(inv.paid_amount||0);
  const due = Math.max(0, total - paid);

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link to="/invoices" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Back</Link>
        <div className="flex gap-2">
          <button onClick={()=>window.print()} className="inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm"><Download className="size-4" /> Download PDF</button>
          <button onClick={()=>window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"><Printer className="size-4" /> Print</button>
        </div>
      </div>

      <PaymentsPanel inv={inv} payments={payments} due={due} paid={paid} total={total} onChange={() => { refetch(); qc.invalidateQueries({ queryKey: ["dashboard"] }); qc.invalidateQueries({ queryKey: ["invoices"] }); }} />

      <div className="print-area bg-white text-black border rounded-lg p-8 shadow-sm max-w-4xl mx-auto" id="invoice">
        <div className="text-center border-b-2 border-black pb-2 mb-4">
          <h1 className="text-xl font-bold tracking-wide">TAX INVOICE</h1>
        </div>

        <div className="flex justify-between mb-4">
          <div>
            {company.logo_url && <img src={company.logo_url} alt="" className="h-12 mb-1" />}
            <div className="text-lg font-bold">{company.name}</div>
            {company.address && <div className="text-xs whitespace-pre-line">{company.address}</div>}
            {company.state && <div className="text-xs">State: {company.state}</div>}
            {company.gstin && <div className="text-xs">GSTIN: <span className="font-mono">{company.gstin}</span></div>}
            {company.mobile && <div className="text-xs">Mobile: {company.mobile}</div>}
            {company.email && <div className="text-xs">Email: {company.email}</div>}
          </div>
          <div className="text-right text-xs">
            <div><span className="font-semibold">Invoice #:</span> <span className="font-mono">{inv.invoice_number}</span></div>
            <div><span className="font-semibold">Date:</span> {inv.invoice_date}</div>
            <div className="mt-2 inline-block px-2 py-0.5 border border-black text-[10px]">
              {inv.is_igst ? "INTER-STATE / IGST" : "INTRA-STATE / CGST+SGST"}
            </div>
          </div>
        </div>

        <div className="border border-black mb-4">
          <div className="bg-gray-100 px-2 py-1 text-xs font-bold border-b border-black">BILL TO</div>
          <div className="p-2 text-xs">
            <div className="font-semibold text-sm">{customer.name}</div>
            {customer.address && <div className="whitespace-pre-line">{customer.address}</div>}
            {customer.state && <div>State: {customer.state}</div>}
            {customer.gstin && <div>GSTIN: <span className="font-mono">{customer.gstin}</span></div>}
            {customer.mobile && <div>Mobile: {customer.mobile}</div>}
          </div>
        </div>

        <table className="w-full text-xs border border-black border-collapse mb-4">
          <thead className="bg-gray-100">
            <tr className="border-b border-black">
              <th className="border-r border-black p-1 w-8">#</th>
              <th className="border-r border-black p-1 text-left">Description</th>
              <th className="border-r border-black p-1">HSN</th>
              <th className="border-r border-black p-1 text-right">Qty</th>
              <th className="border-r border-black p-1">Unit</th>
              <th className="border-r border-black p-1 text-right">Rate</th>
              <th className="border-r border-black p-1 text-right">GST%</th>
              <th className="p-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id} className="border-b border-black">
                <td className="border-r border-black p-1 text-center">{i+1}</td>
                <td className="border-r border-black p-1">{it.name}</td>
                <td className="border-r border-black p-1 text-center font-mono">{it.hsn}</td>
                <td className="border-r border-black p-1 text-right">{Number(it.quantity)}</td>
                <td className="border-r border-black p-1 text-center">{it.unit}</td>
                <td className="border-r border-black p-1 text-right">{formatINR(Number(it.rate))}</td>
                <td className="border-r border-black p-1 text-right">{Number(it.gst_rate)}%</td>
                <td className="p-1 text-right">{formatINR(Number(it.amount))}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 5 - items.length) }).map((_, i) => (
              <tr key={"e"+i} className="border-b border-black"><td className="border-r border-black p-1">&nbsp;</td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td></tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between gap-4">
          <div className="flex-1 text-xs">
            <div className="border border-black p-2">
              <div className="font-semibold mb-1">Amount in Words:</div>
              <div className="italic">{inv.amount_in_words}</div>
            </div>
            {(company.bank_name || company.bank_account) && (
              <div className="border border-black border-t-0 p-2">
                <div className="font-semibold mb-1">Bank Details:</div>
                {company.bank_name && <div>Bank: {company.bank_name}</div>}
                {company.bank_account && <div>A/C: <span className="font-mono">{company.bank_account}</span></div>}
                {company.bank_ifsc && <div>IFSC: <span className="font-mono">{company.bank_ifsc}</span></div>}
              </div>
            )}
            {inv.notes && (
              <div className="border border-black border-t-0 p-2">
                <div className="font-semibold mb-1">Notes:</div>
                <div className="whitespace-pre-line">{inv.notes}</div>
              </div>
            )}
          </div>
          <div className="w-64 text-xs">
            <table className="w-full border border-black border-collapse">
              <tbody>
                <Cell l="Subtotal" v={inv.subtotal} />
                {Number(inv.discount) > 0 && <Cell l="Discount" v={-inv.discount} />}
                <Cell l="Taxable Amount" v={inv.taxable_amount} />
                {inv.is_igst ? (
                  <Cell l="IGST" v={inv.igst} />
                ) : (
                  <>
                    <Cell l="CGST" v={inv.cgst} />
                    <Cell l="SGST" v={inv.sgst} />
                  </>
                )}
                <tr className="border-t border-black bg-gray-100 font-bold">
                  <td className="border-r border-black p-1.5">Grand Total</td>
                  <td className="p-1.5 text-right">{formatINR(Number(inv.total))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 flex justify-between text-xs">
          <div>
            <div className="border-t border-black pt-1 w-40 text-center">Customer Signature</div>
          </div>
          <div>
            <div className="font-semibold mb-12">For {company.name}</div>
            <div className="border-t border-black pt-1 w-40 text-center">Authorised Signatory</div>
          </div>
        </div>

        <div className="mt-4 text-center text-[10px] text-gray-500">This is a computer-generated invoice.</div>
      </div>
    </div>
  );
}

function Cell({ l, v }: { l: string; v: number | string }) {
  return (
    <tr className="border-b border-black">
      <td className="border-r border-black p-1.5">{l}</td>
      <td className="p-1.5 text-right">{formatINR(Number(v))}</td>
    </tr>
  );
}

function PaymentsPanel({ inv, payments, due, paid, total, onChange }: any) {
  const [open, setOpen] = useState(due > 0);
  const [amount, setAmount] = useState<number>(due);
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0,10));
  const [saving, setSaving] = useState(false);

  const addPayment = async () => {
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      await db.payments.add({ invoice_id: inv.id, amount, method, reference, paid_on: paidOn });
      setAmount(0); setReference("");
      onChange();
    } catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };

  const removePayment = async (id: string) => {
    if (!confirm("Delete this payment?")) return;
    await db.payments.remove(id);
    onChange();
  };

  return (
    <div className="no-print bg-card border rounded-lg p-4 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Status</div>
            <StatusBadge status={inv.payment_status} />
          </div>
          <div><div className="text-xs text-muted-foreground">Total</div><div className="font-semibold">{formatINR(total)}</div></div>
          <div><div className="text-xs text-muted-foreground">Paid</div><div className="font-semibold text-emerald-600">{formatINR(paid)}</div></div>
          <div><div className="text-xs text-muted-foreground">Due</div><div className="font-semibold text-rose-600">{formatINR(due)}</div></div>
        </div>
        <button onClick={()=>setOpen(o=>!o)} className="text-sm text-primary">{open ? "Hide" : "Record Payment"}</button>
      </div>

      {open && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          <label className="text-xs">Amount<input type="number" step="0.01" value={amount} onChange={e=>setAmount(Number(e.target.value))} className="mt-1 w-full px-2 py-1.5 border rounded bg-background text-sm" /></label>
          <label className="text-xs">Method
            <select value={method} onChange={e=>setMethod(e.target.value)} className="mt-1 w-full px-2 py-1.5 border rounded bg-background text-sm">
              <option value="cash">Cash</option><option value="upi">UPI</option><option value="bank">Bank Transfer</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="other">Other</option>
            </select>
          </label>
          <label className="text-xs">Reference<input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Txn / Cheque #" className="mt-1 w-full px-2 py-1.5 border rounded bg-background text-sm" /></label>
          <label className="text-xs">Date<input type="date" value={paidOn} onChange={e=>setPaidOn(e.target.value)} className="mt-1 w-full px-2 py-1.5 border rounded bg-background text-sm" /></label>
          <button disabled={saving} onClick={addPayment} className="inline-flex items-center justify-center gap-1 bg-primary text-primary-foreground px-3 py-2 rounded text-sm font-medium disabled:opacity-50"><Plus className="size-4" /> Add</button>
        </div>
      )}

      {payments.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-1">Date</th><th>Method</th><th>Reference</th><th className="text-right">Amount</th><th></th></tr>
            </thead>
            <tbody>
              {payments.map((p:any)=>(
                <tr key={p.id} className="border-t">
                  <td className="py-2">{p.paid_on}</td>
                  <td className="capitalize">{p.method}</td>
                  <td className="font-mono text-xs">{p.reference || "—"}</td>
                  <td className="text-right font-medium">{formatINR(Number(p.amount))}</td>
                  <td className="text-right"><button onClick={()=>removePayment(p.id)} className="text-rose-600"><Trash2 className="size-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
