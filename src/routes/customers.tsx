import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INDIAN_STATES } from "@/lib/gst";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — GST Billing" }] }),
  component: CustomersPage,
});

type Customer = { id: string; name: string; gstin: string | null; mobile: string | null; address: string | null; state: string | null };

function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Customer> | null>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("name");
      if (error) throw error;
      return data as Customer[];
    },
  });

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.gstin ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.mobile ?? "").includes(search));

  async function save() {
    if (!editing?.name?.trim()) { toast.error("Name is required"); return; }
    const payload = {
      name: editing.name.trim(),
      gstin: editing.gstin ?? "",
      mobile: editing.mobile ?? "",
      address: editing.address ?? "",
      state: editing.state ?? "",
    };
    const { error } = editing.id
      ? await supabase.from("customers").update(payload).eq("id", editing.id)
      : await supabase.from("customers").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["customers"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this customer?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["customers"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-sm text-muted-foreground">{customers.length} total</p></div>
        <button onClick={() => setEditing({})} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium">
          <Plus className="size-4" /> Add Customer
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, GSTIN, mobile…" className="w-full pl-9 pr-3 py-2 border rounded-md bg-card text-sm" />
      </div>

      <div className="bg-card border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Name</th><th className="p-3">GSTIN</th><th className="p-3">Mobile</th><th className="p-3">State</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 font-mono text-xs">{c.gstin || "—"}</td>
                <td className="p-3">{c.mobile || "—"}</td>
                <td className="p-3">{c.state || "—"}</td>
                <td className="p-3 text-right">
                  <button onClick={()=>setEditing(c)} className="p-2 hover:bg-muted rounded"><Pencil className="size-4" /></button>
                  <button onClick={()=>remove(c.id)} className="p-2 hover:bg-muted rounded text-destructive"><Trash2 className="size-4" /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={()=>setEditing(null)}>
          <div className="bg-card rounded-lg max-w-lg w-full p-6 space-y-4" onClick={e=>e.stopPropagation()}>
            <h2 className="text-lg font-bold">{editing.id ? "Edit" : "Add"} Customer</h2>
            <Field label="Name *"><input className="input" value={editing.name??""} onChange={e=>setEditing({...editing,name:e.target.value})} /></Field>
            <Field label="GSTIN"><input className="input" value={editing.gstin??""} onChange={e=>setEditing({...editing,gstin:e.target.value.toUpperCase()})} /></Field>
            <Field label="Mobile"><input className="input" value={editing.mobile??""} onChange={e=>setEditing({...editing,mobile:e.target.value})} /></Field>
            <Field label="Address"><textarea className="input" rows={2} value={editing.address??""} onChange={e=>setEditing({...editing,address:e.target.value})} /></Field>
            <Field label="State">
              <select className="input" value={editing.state??""} onChange={e=>setEditing({...editing,state:e.target.value})}>
                <option value="">Select state</option>
                {INDIAN_STATES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={()=>setEditing(null)} className="px-4 py-2 border rounded-md text-sm">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
      <style>{`.input{width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:.375rem;background:var(--background);font-size:.875rem}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium mb-1">{label}</label>{children}</div>;
}
