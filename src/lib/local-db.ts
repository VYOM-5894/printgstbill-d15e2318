// Local IndexedDB-backed data layer (Dexie). Fully offline; replaces Supabase.
import Dexie, { type Table } from "dexie";

export type Customer = { id: string; name: string; gstin: string; mobile: string; address: string; state: string; created_at: string; updated_at: string };
export type Product = { id: string; name: string; hsn: string; gst_rate: number; unit_price: number; unit: string; created_at: string; updated_at: string };
export type CompanySettings = {
  id: string; name: string; gstin: string; state: string; address: string; mobile: string; email: string;
  logo_url: string; bank_name: string; bank_account: string; bank_ifsc: string;
  invoice_prefix: string; next_invoice_number: number; created_at: string; updated_at: string;
};
export type Invoice = {
  id: string; invoice_number: string; invoice_date: string; customer_id: string | null;
  customer_snapshot: any; company_snapshot: any; is_igst: boolean;
  subtotal: number; discount: number; taxable_amount: number;
  cgst: number; sgst: number; igst: number; total: number;
  amount_in_words: string; notes: string;
  paid_amount: number; payment_status: "unpaid" | "partial" | "paid";
  created_at: string;
};
export type InvoiceItem = { id: string; invoice_id: string; product_id: string | null; name: string; hsn: string; quantity: number; unit: string; rate: number; gst_rate: number; amount: number; position: number };
export type Payment = { id: string; invoice_id: string; amount: number; method: string; reference: string; paid_on: string; notes: string; created_at: string };

class GstDB extends Dexie {
  customers!: Table<Customer, string>;
  products!: Table<Product, string>;
  company_settings!: Table<CompanySettings, string>;
  invoices!: Table<Invoice, string>;
  invoice_items!: Table<InvoiceItem, string>;
  payments!: Table<Payment, string>;
  constructor() {
    super("gst_billing");
    this.version(1).stores({
      customers: "id, name",
      products: "id, name",
      company_settings: "id",
      invoices: "id, invoice_number, invoice_date, customer_id, payment_status",
      invoice_items: "id, invoice_id, position",
      payments: "id, invoice_id, paid_on",
    });
  }
}

// Lazy singleton — avoid touching indexedDB during SSR.
let _db: GstDB | null = null;
function dx(): GstDB {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB not available (SSR)");
  if (!_db) _db = new GstDB();
  return _db;
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const now = () => new Date().toISOString();

async function ensureCompany(): Promise<CompanySettings> {
  const all = await dx().company_settings.toArray();
  if (all[0]) return all[0];
  const c: CompanySettings = {
    id: uid(), name: "My Company", gstin: "", state: "", address: "", mobile: "", email: "",
    logo_url: "", bank_name: "", bank_account: "", bank_ifsc: "",
    invoice_prefix: "INV", next_invoice_number: 1, created_at: now(), updated_at: now(),
  };
  await dx().company_settings.add(c);
  return c;
}

async function recalcPayment(invoice_id: string) {
  const inv = await dx().invoices.get(invoice_id);
  if (!inv) return;
  const pays = await dx().payments.where("invoice_id").equals(invoice_id).toArray();
  const paid = pays.reduce((s, p) => s + Number(p.amount || 0), 0);
  const status: Invoice["payment_status"] = paid <= 0 ? "unpaid" : paid < Number(inv.total) ? "partial" : "paid";
  await dx().invoices.update(invoice_id, { paid_amount: +paid.toFixed(2), payment_status: status });
}

export const db = {
  customers: {
    async list(): Promise<Customer[]> {
      return (await dx().customers.toArray()).sort((a, b) => a.name.localeCompare(b.name));
    },
    async upsert(c: Partial<Customer>): Promise<Customer> {
      const t = now();
      if (c.id) {
        await dx().customers.update(c.id, { ...c, updated_at: t });
        return (await dx().customers.get(c.id))!;
      }
      const row: Customer = {
        id: uid(), name: c.name || "", gstin: c.gstin ?? "", mobile: c.mobile ?? "",
        address: c.address ?? "", state: c.state ?? "", created_at: t, updated_at: t,
      };
      await dx().customers.add(row);
      return row;
    },
    async remove(id: string) { await dx().customers.delete(id); },
  },
  products: {
    async list(): Promise<Product[]> {
      return (await dx().products.toArray()).sort((a, b) => a.name.localeCompare(b.name));
    },
    async upsert(p: Partial<Product>): Promise<Product> {
      const t = now();
      if (p.id) { await dx().products.update(p.id, { ...p, updated_at: t }); return (await dx().products.get(p.id))!; }
      const row: Product = {
        id: uid(), name: p.name || "", hsn: p.hsn ?? "", gst_rate: Number(p.gst_rate ?? 18),
        unit_price: Number(p.unit_price ?? 0), unit: p.unit ?? "NOS", created_at: t, updated_at: t,
      };
      await dx().products.add(row);
      return row;
    },
    async remove(id: string) { await dx().products.delete(id); },
  },
  company: {
    get: ensureCompany,
    async update(patch: Partial<CompanySettings>) {
      const c = await ensureCompany();
      await dx().company_settings.update(c.id, { ...patch, updated_at: now() });
      return (await dx().company_settings.get(c.id))!;
    },
  },
  invoices: {
    async list(opts: { from?: string; to?: string; limit?: number } = {}): Promise<Invoice[]> {
      let arr = await dx().invoices.toArray();
      if (opts.from) arr = arr.filter(i => i.invoice_date >= opts.from!);
      if (opts.to) arr = arr.filter(i => i.invoice_date <= opts.to!);
      arr.sort((a, b) => (b.invoice_date.localeCompare(a.invoice_date)) || b.created_at.localeCompare(a.created_at));
      return opts.limit ? arr.slice(0, opts.limit) : arr;
    },
    async get(id: string) {
      const inv = await dx().invoices.get(id);
      const items = (await dx().invoice_items.where("invoice_id").equals(id).toArray()).sort((a, b) => a.position - b.position);
      const payments = (await dx().payments.where("invoice_id").equals(id).toArray()).sort((a, b) => b.paid_on.localeCompare(a.paid_on));
      return { inv: inv ?? null, items, payments };
    },
    async create(data: Omit<Invoice, "id" | "invoice_number" | "paid_amount" | "payment_status" | "created_at">, items: Omit<InvoiceItem, "id" | "invoice_id">[]) {
      const c = await ensureCompany();
      const num = c.next_invoice_number;
      const invoice_number = `${c.invoice_prefix || "INV"}-${String(num).padStart(5, "0")}`;
      await dx().company_settings.update(c.id, { next_invoice_number: num + 1, updated_at: now() });
      const inv: Invoice = {
        ...data, id: uid(), invoice_number, paid_amount: 0, payment_status: "unpaid", created_at: now(),
      };
      await dx().invoices.add(inv);
      await dx().invoice_items.bulkAdd(items.map(it => ({ ...it, id: uid(), invoice_id: inv.id })));
      return inv;
    },
    async remove(id: string) {
      await dx().invoice_items.where("invoice_id").equals(id).delete();
      await dx().payments.where("invoice_id").equals(id).delete();
      await dx().invoices.delete(id);
    },
    async listWithItems(opts: { from?: string; to?: string } = {}) {
      const invs = await this.list(opts);
      const ids = invs.map(i => i.id);
      const allItems = await dx().invoice_items.where("invoice_id").anyOf(ids).toArray();
      const byInv = new Map<string, InvoiceItem[]>();
      for (const it of allItems) {
        const a = byInv.get(it.invoice_id) ?? [];
        a.push(it); byInv.set(it.invoice_id, a);
      }
      return invs.map(i => ({ ...i, invoice_items: (byInv.get(i.id) ?? []).sort((a, b) => a.position - b.position) }));
    },
    async stats() {
      const all = await dx().invoices.toArray();
      const due = all.filter(i => i.payment_status !== "paid")
        .reduce((s, i) => s + Math.max(0, Number(i.total || 0) - Number(i.paid_amount || 0)), 0);
      return { count: all.length, totalDue: due };
    },
  },
  payments: {
    async add(p: Omit<Payment, "id" | "created_at" | "notes"> & { notes?: string }) {
      const row: Payment = { ...p, notes: p.notes ?? "", id: uid(), created_at: now() };
      await dx().payments.add(row);
      await recalcPayment(p.invoice_id);
      return row;
    },
    async remove(id: string) {
      const p = await dx().payments.get(id);
      await dx().payments.delete(id);
      if (p) await recalcPayment(p.invoice_id);
    },
  },
  async exportAll() {
    const [customers, products, company_settings, invoices, invoice_items, payments] = await Promise.all([
      dx().customers.toArray(), dx().products.toArray(), dx().company_settings.toArray(),
      dx().invoices.toArray(), dx().invoice_items.toArray(), dx().payments.toArray(),
    ]);
    return { version: 1, exported_at: now(), customers, products, company_settings, invoices, invoice_items, payments };
  },
  async importAll(data: any) {
    if (!data || typeof data !== "object") throw new Error("Invalid file");
    await dx().transaction("rw", [dx().customers, dx().products, dx().company_settings, dx().invoices, dx().invoice_items, dx().payments], async () => {
      await Promise.all([dx().customers.clear(), dx().products.clear(), dx().company_settings.clear(), dx().invoices.clear(), dx().invoice_items.clear(), dx().payments.clear()]);
      if (data.customers?.length) await dx().customers.bulkAdd(data.customers);
      if (data.products?.length) await dx().products.bulkAdd(data.products);
      if (data.company_settings?.length) await dx().company_settings.bulkAdd(data.company_settings);
      if (data.invoices?.length) await dx().invoices.bulkAdd(data.invoices);
      if (data.invoice_items?.length) await dx().invoice_items.bulkAdd(data.invoice_items);
      if (data.payments?.length) await dx().payments.bulkAdd(data.payments);
    });
  },
};
