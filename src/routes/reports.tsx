import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Download, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

type Tab = "summary" | "b2b" | "hsn" | "range";

function localDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function inr(n: number) {
  return "₹" + (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => {
      const s = String(c ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const today = new Date();
  const [from, setFrom] = useState(localDate(startOfMonth(today)));
  const [to, setTo] = useState(localDate(endOfMonth(today)));
  const [tab, setTab] = useState<Tab>("summary");

  const { data, isLoading } = useQuery({
    queryKey: ["reports", from, to],
    queryFn: async () => {
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, customer_snapshot, is_igst, subtotal, discount, taxable_amount, cgst, sgst, igst, total, invoice_items(name, hsn, quantity, unit, rate, gst_rate, amount)")
        .gte("invoice_date", from)
        .lte("invoice_date", to)
        .order("invoice_date", { ascending: true });
      if (error) throw error;
      return invoices ?? [];
    },
  });

  const invoices = data ?? [];

  const summary = useMemo(() => {
    const total = invoices.reduce(
      (a, i) => ({
        count: a.count + 1,
        taxable: a.taxable + Number(i.taxable_amount || 0),
        cgst: a.cgst + Number(i.cgst || 0),
        sgst: a.sgst + Number(i.sgst || 0),
        igst: a.igst + Number(i.igst || 0),
        total: a.total + Number(i.total || 0),
      }),
      { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    );
    return total;
  }, [invoices]);

  const hsnRows = useMemo(() => {
    const map = new Map<string, { hsn: string; rate: number; qty: number; taxable: number; cgst: number; sgst: number; igst: number; total: number }>();
    for (const inv of invoices) {
      const items = (inv as any).invoice_items as any[] | null;
      if (!items) continue;
      for (const it of items) {
        const hsn = it.hsn || "—";
        const rate = Number(it.gst_rate || 0);
        const key = `${hsn}|${rate}`;
        const taxable = Number(it.amount || 0);
        const tax = taxable * (rate / 100);
        const cgst = inv.is_igst ? 0 : tax / 2;
        const sgst = inv.is_igst ? 0 : tax / 2;
        const igst = inv.is_igst ? tax : 0;
        const cur = map.get(key) ?? { hsn, rate, qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
        cur.qty += Number(it.quantity || 0);
        cur.taxable += taxable;
        cur.cgst += cgst;
        cur.sgst += sgst;
        cur.igst += igst;
        cur.total += taxable + tax;
        map.set(key, cur);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.taxable - a.taxable);
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-6 text-primary" />
        <h1 className="text-2xl font-bold">GST Reports</h1>
      </div>

      <div className="bg-card border rounded-lg p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-medium block mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border px-3 py-2 text-sm bg-background" />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border px-3 py-2 text-sm bg-background" />
        </div>
        <div className="flex gap-2 ml-auto">
          {([
            { k: "thisMonth", label: "This Month", from: startOfMonth(today), to: endOfMonth(today) },
            { k: "lastMonth", label: "Last Month", from: startOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1)), to: endOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1)) },
            { k: "fy", label: "This FY", from: new Date(today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear(), 3, 1), to: new Date(today.getMonth() < 3 ? today.getFullYear() : today.getFullYear() + 1, 2, 31) },
          ] as const).map((p) => (
            <button key={p.k} onClick={() => { setFrom(localDate(p.from)); setTo(localDate(p.to)); }} className="text-xs px-3 py-2 rounded-md border hover:bg-muted">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b flex gap-1">
        {([
          { k: "summary", label: "Summary (GSTR-3B)" },
          { k: "b2b", label: "GSTR-1 (B2B)" },
          { k: "hsn", label: "HSN-wise" },
          { k: "range", label: "Invoice list" },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          {tab === "summary" && <SummaryTab summary={summary} from={from} to={to} />}
          {tab === "b2b" && <B2BTab invoices={invoices} />}
          {tab === "hsn" && <HsnTab rows={hsnRows} />}
          {tab === "range" && <RangeTab invoices={invoices} />}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <div className={`text-xs ${accent ? "opacity-80" : "text-muted-foreground"}`}>{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function SummaryTab({ summary, from, to }: { summary: any; from: string; to: string }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Invoices" value={String(summary.count)} />
        <Stat label="Taxable Value" value={inr(summary.taxable)} />
        <Stat label="CGST" value={inr(summary.cgst)} />
        <Stat label="SGST" value={inr(summary.sgst)} />
        <Stat label="IGST" value={inr(summary.igst)} />
        <Stat label="Total Sales" value={inr(summary.total)} accent />
      </div>
      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-semibold mb-3">GSTR-3B style summary</h3>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b"><td className="py-2">Outward taxable supplies (other than zero rated)</td><td className="text-right font-medium">{inr(summary.taxable)}</td></tr>
            <tr className="border-b"><td className="py-2">CGST payable</td><td className="text-right font-medium">{inr(summary.cgst)}</td></tr>
            <tr className="border-b"><td className="py-2">SGST payable</td><td className="text-right font-medium">{inr(summary.sgst)}</td></tr>
            <tr className="border-b"><td className="py-2">IGST payable</td><td className="text-right font-medium">{inr(summary.igst)}</td></tr>
            <tr className="bg-muted/50"><td className="py-2 font-semibold">Total tax payable</td><td className="text-right font-bold">{inr(summary.cgst + summary.sgst + summary.igst)}</td></tr>
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground mt-3">Period: {from} to {to}</p>
      </div>
    </div>
  );
}

function B2BTab({ invoices }: { invoices: any[] }) {
  const rows = invoices.filter((i) => (i.customer_snapshot?.gstin || "").trim().length > 0);
  const exportCsv = () => {
    const header = ["GSTIN", "Customer", "Invoice No", "Date", "Taxable", "CGST", "SGST", "IGST", "Total"];
    const body = rows.map((i) => [
      i.customer_snapshot?.gstin || "",
      i.customer_snapshot?.name || "",
      i.invoice_number,
      i.invoice_date,
      Number(i.taxable_amount).toFixed(2),
      Number(i.cgst).toFixed(2),
      Number(i.sgst).toFixed(2),
      Number(i.igst).toFixed(2),
      Number(i.total).toFixed(2),
    ]);
    downloadCsv("gstr1-b2b.csv", [header, ...body]);
  };

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">B2B Invoice-wise (GSTR-1)</h3>
          <p className="text-xs text-muted-foreground">Invoices issued to customers with a GSTIN.</p>
        </div>
        <button onClick={exportCsv} disabled={!rows.length} className="flex items-center gap-2 text-sm px-3 py-2 rounded-md border hover:bg-muted disabled:opacity-50">
          <Download className="size-4" /> Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left">GSTIN</th>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-left">Invoice</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-right">Taxable</th>
              <th className="px-4 py-2 text-right">CGST</th>
              <th className="px-4 py-2 text-right">SGST</th>
              <th className="px-4 py-2 text-right">IGST</th>
              <th className="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No B2B invoices in this period.</td></tr>
            ) : rows.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="px-4 py-2 font-mono text-xs">{i.customer_snapshot?.gstin}</td>
                <td className="px-4 py-2">{i.customer_snapshot?.name}</td>
                <td className="px-4 py-2">{i.invoice_number}</td>
                <td className="px-4 py-2">{i.invoice_date}</td>
                <td className="px-4 py-2 text-right">{inr(Number(i.taxable_amount))}</td>
                <td className="px-4 py-2 text-right">{inr(Number(i.cgst))}</td>
                <td className="px-4 py-2 text-right">{inr(Number(i.sgst))}</td>
                <td className="px-4 py-2 text-right">{inr(Number(i.igst))}</td>
                <td className="px-4 py-2 text-right font-medium">{inr(Number(i.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HsnTab({ rows }: { rows: any[] }) {
  const exportCsv = () => {
    const header = ["HSN", "GST Rate", "Quantity", "Taxable Value", "CGST", "SGST", "IGST", "Total"];
    const body = rows.map((r) => [r.hsn, r.rate + "%", r.qty, r.taxable.toFixed(2), r.cgst.toFixed(2), r.sgst.toFixed(2), r.igst.toFixed(2), r.total.toFixed(2)]);
    downloadCsv("hsn-summary.csv", [header, ...body]);
  };
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <h3 className="font-semibold">HSN-wise Summary</h3>
        <button onClick={exportCsv} disabled={!rows.length} className="flex items-center gap-2 text-sm px-3 py-2 rounded-md border hover:bg-muted disabled:opacity-50">
          <Download className="size-4" /> Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left">HSN</th>
              <th className="px-4 py-2 text-right">Rate</th>
              <th className="px-4 py-2 text-right">Qty</th>
              <th className="px-4 py-2 text-right">Taxable</th>
              <th className="px-4 py-2 text-right">CGST</th>
              <th className="px-4 py-2 text-right">SGST</th>
              <th className="px-4 py-2 text-right">IGST</th>
              <th className="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No items in this period.</td></tr>
            ) : rows.map((r, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-4 py-2 font-mono">{r.hsn}</td>
                <td className="px-4 py-2 text-right">{r.rate}%</td>
                <td className="px-4 py-2 text-right">{r.qty}</td>
                <td className="px-4 py-2 text-right">{inr(r.taxable)}</td>
                <td className="px-4 py-2 text-right">{inr(r.cgst)}</td>
                <td className="px-4 py-2 text-right">{inr(r.sgst)}</td>
                <td className="px-4 py-2 text-right">{inr(r.igst)}</td>
                <td className="px-4 py-2 text-right font-medium">{inr(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RangeTab({ invoices }: { invoices: any[] }) {
  const exportCsv = () => {
    const header = ["Invoice", "Date", "Customer", "GSTIN", "Taxable", "CGST", "SGST", "IGST", "Total"];
    const body = invoices.map((i) => [
      i.invoice_number,
      i.invoice_date,
      i.customer_snapshot?.name || "",
      i.customer_snapshot?.gstin || "",
      Number(i.taxable_amount).toFixed(2),
      Number(i.cgst).toFixed(2),
      Number(i.sgst).toFixed(2),
      Number(i.igst).toFixed(2),
      Number(i.total).toFixed(2),
    ]);
    downloadCsv("invoices.csv", [header, ...body]);
  };
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <h3 className="font-semibold">All invoices in range ({invoices.length})</h3>
        <button onClick={exportCsv} disabled={!invoices.length} className="flex items-center gap-2 text-sm px-3 py-2 rounded-md border hover:bg-muted disabled:opacity-50">
          <Download className="size-4" /> Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Invoice</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-right">Taxable</th>
              <th className="px-4 py-2 text-right">Tax</th>
              <th className="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No invoices in this period.</td></tr>
            ) : invoices.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="px-4 py-2 font-medium">{i.invoice_number}</td>
                <td className="px-4 py-2">{i.invoice_date}</td>
                <td className="px-4 py-2">{i.customer_snapshot?.name}</td>
                <td className="px-4 py-2 text-right">{inr(Number(i.taxable_amount))}</td>
                <td className="px-4 py-2 text-right">{inr(Number(i.cgst) + Number(i.sgst) + Number(i.igst))}</td>
                <td className="px-4 py-2 text-right font-semibold">{inr(Number(i.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
