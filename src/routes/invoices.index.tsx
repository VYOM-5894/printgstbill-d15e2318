import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/local-db";
import { formatINR } from "@/lib/gst";
import { Plus, Search, Eye } from "lucide-react";
import { StatusBadge } from "./index";

export const Route = createFileRoute("/invoices/")({
  head: () => ({ meta: [{ title: "Invoices — GST Billing" }] }),
  component: InvoicesList,
});

function InvoicesList() {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data = [] } = useQuery({
    queryKey: ["invoices", from, to],
    queryFn: () => db.invoices.list({ from: from || undefined, to: to || undefined, limit: 500 }),
  });

  const filtered = data.filter(i =>
    !search ||
    i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    (i.customer_snapshot?.name ?? "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} results</p></div>
        <Link to="/invoices/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium">
          <Plus className="size-4" /> New Invoice
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search invoice # or customer…" className="w-full pl-9 pr-3 py-2 border rounded-md bg-card text-sm" />
        </div>
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="px-3 py-2 border rounded-md bg-card text-sm" />
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="px-3 py-2 border rounded-md bg-card text-sm" />
        {(from||to) && <button onClick={()=>{setFrom("");setTo("");}} className="px-3 py-2 text-sm border rounded-md">Clear</button>}
      </div>

      <div className="bg-card border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Invoice #</th>
              <th className="p-3">Date</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Tax</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Due</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => {
              const due = Math.max(0, Number(i.total||0) - Number(i.paid_amount||0));
              return (
              <tr key={i.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-medium font-mono">{i.invoice_number}</td>
                <td className="p-3">{i.invoice_date}</td>
                <td className="p-3">{i.customer_snapshot?.name ?? "—"}</td>
                <td className="p-3 text-xs">{i.is_igst ? "IGST" : "CGST+SGST"}</td>
                <td className="p-3"><StatusBadge status={i.payment_status} /></td>
                <td className="p-3 text-right font-medium">{formatINR(Number(i.total))}</td>
                <td className="p-3 text-right text-rose-600">{due > 0 ? formatINR(due) : "—"}</td>
                <td className="p-3 text-right">
                  <Link to="/invoices/$id" params={{ id: i.id }} className="inline-flex items-center gap-1 text-primary text-sm"><Eye className="size-4" /> View</Link>
                </td>
              </tr>
            );})}
            {filtered.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No invoices found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
