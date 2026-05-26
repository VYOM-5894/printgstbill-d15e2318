import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/gst";
import { Users, FileText, IndianRupee, TrendingUp, Plus } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — GST Billing" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0,0,0,0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const [cust, inv, invs] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("invoices").select("id", { count: "exact", head: true }),
        supabase.from("invoices").select("total, invoice_date, invoice_number, customer_snapshot, id").order("invoice_date", { ascending: false }).limit(50),
      ]);
      const all = invs.data ?? [];
      const todayStr = today.toISOString().slice(0,10);
      const todaySales = all.filter(i => i.invoice_date === todayStr).reduce((s,i)=>s+Number(i.total||0),0);
      const monthSales = all.filter(i => new Date(i.invoice_date) >= monthStart).reduce((s,i)=>s+Number(i.total||0),0);
      return {
        customers: cust.count ?? 0,
        invoices: inv.count ?? 0,
        todaySales, monthSales,
        recent: all.slice(0, 8),
      };
    },
  });

  const stats = [
    { label: "Total Customers", value: data?.customers ?? 0, icon: Users },
    { label: "Total Invoices", value: data?.invoices ?? 0, icon: FileText },
    { label: "Today's Sales", value: formatINR(data?.todaySales ?? 0), icon: IndianRupee },
    { label: "Monthly Sales", value: formatINR(data?.monthSales ?? 0), icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your billing activity</p>
        </div>
        <Link to="/invoices/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium">
          <Plus className="size-4" /> New Invoice
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <s.icon className="size-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mt-2">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Recent Invoices</h2>
          <Link to="/invoices" className="text-sm text-primary">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Invoice #</th>
                <th className="p-3">Date</th>
                <th className="p-3">Customer</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent ?? []).map((r: any) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3"><Link to="/invoices/$id" params={{ id: r.id }} className="text-primary font-medium">{r.invoice_number}</Link></td>
                  <td className="p-3">{r.invoice_date}</td>
                  <td className="p-3">{r.customer_snapshot?.name ?? "—"}</td>
                  <td className="p-3 text-right font-medium">{formatINR(Number(r.total))}</td>
                </tr>
              ))}
              {(!data?.recent || data.recent.length === 0) && (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No invoices yet. Create your first one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
