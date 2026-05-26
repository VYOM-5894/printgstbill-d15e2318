import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db, type Product } from "@/lib/local-db";
import { formatINR } from "@/lib/gst";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products — GST Billing" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  const { data: items = [] } = useQuery({ queryKey: ["products"], queryFn: () => db.products.list() });

  const filtered = items.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.hsn??"").includes(search));

  async function save() {
    if (!editing?.name?.trim()) { toast.error("Name is required"); return; }
    try {
      await db.products.upsert(editing);
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    await db.products.remove(id);
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Products</h1>
        <p className="text-sm text-muted-foreground">{items.length} total</p></div>
        <button onClick={() => setEditing({ gst_rate: 18, unit: "NOS" })} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium">
          <Plus className="size-4" /> Add Product
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or HSN…" className="w-full pl-9 pr-3 py-2 border rounded-md bg-card text-sm" />
      </div>

      <div className="bg-card border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Name</th><th className="p-3">HSN</th><th className="p-3">Unit</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">GST %</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 font-mono text-xs">{p.hsn || "—"}</td>
                <td className="p-3">{p.unit}</td>
                <td className="p-3 text-right">{formatINR(p.unit_price)}</td>
                <td className="p-3 text-right">{p.gst_rate}%</td>
                <td className="p-3 text-right">
                  <button onClick={()=>setEditing(p)} className="p-2 hover:bg-muted rounded"><Pencil className="size-4" /></button>
                  <button onClick={()=>remove(p.id)} className="p-2 hover:bg-muted rounded text-destructive"><Trash2 className="size-4" /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No products found.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={()=>setEditing(null)}>
          <div className="bg-card rounded-lg max-w-lg w-full p-6 space-y-4" onClick={e=>e.stopPropagation()}>
            <h2 className="text-lg font-bold">{editing.id ? "Edit" : "Add"} Product</h2>
            <F label="Name *"><input className="input" value={editing.name??""} onChange={e=>setEditing({...editing,name:e.target.value})} /></F>
            <F label="HSN Code"><input className="input" value={editing.hsn??""} onChange={e=>setEditing({...editing,hsn:e.target.value})} /></F>
            <div className="grid grid-cols-3 gap-3">
              <F label="Unit"><input className="input" value={editing.unit??""} onChange={e=>setEditing({...editing,unit:e.target.value})} /></F>
              <F label="Unit Price"><input type="number" step="0.01" className="input" value={editing.unit_price??0} onChange={e=>setEditing({...editing,unit_price:+e.target.value})} /></F>
              <F label="GST %"><select className="input" value={editing.gst_rate??18} onChange={e=>setEditing({...editing,gst_rate:+e.target.value})}>
                {[0,5,12,18,28].map(r=><option key={r} value={r}>{r}%</option>)}
              </select></F>
            </div>
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

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium mb-1">{label}</label>{children}</div>;
}
