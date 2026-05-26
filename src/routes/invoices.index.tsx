import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/gst";
import { Plus, Search, Eye } from "lucide-react";

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
    queryFn: async () => {
      let q = supabase.from("invoices").select("*").order("invoice_date", { ascending: false }).order("created_at", { ascending: false }).limit(500);
      if (from) q = q.gte("invoice_date", from);
      if (to) q = q.lte("invoice_date", to);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
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
              <th className="p-3 text-right">Total</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => (
              <tr key={i.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-medium font-mono">{i.invoice_number}</td>
                <td className="p-3">{i.invoice_date}</td>
                <td className="p-3">{i.customer_snapshot?.name ?? "—"}</td>
                <td className="p-3 text-xs">{i.is_igst ? "IGST" : "CGST+SGST"}</td>
                <td className="p-3 text-right font-medium">{formatINR(Number(i.total))}</td>
                <td className="p-3 text-right">
                  <Link to="/invoices/$id" params={{ id: i.id }} className="inline-flex items-center gap-1 text-primary text-sm"><Eye className="size-4" /> View</Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No invoices found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
