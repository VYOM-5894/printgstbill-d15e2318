import { Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Package, FileText, Settings, Plus, BarChart3, LogOut } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/products", label: "Products", icon: Package },
  { to: "/reports", label: "GST Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="no-print hidden md:flex flex-col w-60 bg-sidebar text-sidebar-foreground p-4">
        <div className="mb-6">
          <div className="text-lg font-bold">GST Billing</div>
          <div className="text-xs opacity-70">Fast invoices for India</div>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                  active ? "bg-white/15 font-medium" : "hover:bg-white/10"
                }`}
              >
                <n.icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <Link
          to="/invoices/new"
          className="mt-4 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="size-4" /> New Invoice
        </Link>
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs opacity-70 truncate mb-2">{user?.email}</div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-white/10">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print md:hidden border-b bg-card px-4 py-3 flex items-center justify-between">
          <div className="font-bold">GST Billing</div>
          <div className="flex items-center gap-2">
            <Link to="/invoices/new" className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground">+ Invoice</Link>
            <button onClick={handleLogout} className="text-sm p-1.5 rounded-md border" aria-label="Sign out">
              <LogOut className="size-4" />
            </button>
          </div>
        </header>
        <nav className="no-print md:hidden border-b bg-card flex overflow-x-auto">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="px-4 py-2 text-sm whitespace-nowrap" activeProps={{ className: "px-4 py-2 text-sm whitespace-nowrap text-primary border-b-2 border-primary" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
