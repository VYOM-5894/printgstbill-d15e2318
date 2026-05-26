import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { AppShell } from "@/components/AppShell";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Page not found.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">An unexpected error occurred. Please try again.</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GST Billing — Fast Invoices for India" },
      { name: "description", content: "Generate, save, search and print GST-compliant invoices in seconds." },
      { property: "og:title", content: "GST Billing — Fast Invoices for India" },
      { name: "twitter:title", content: "GST Billing — Fast Invoices for India" },
      { property: "og:description", content: "Generate, save, search and print GST-compliant invoices in seconds." },
      { name: "twitter:description", content: "Generate, save, search and print GST-compliant invoices in seconds." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c0a10d3d-7a68-46a0-bce4-1676b4419e5a/id-preview-37432cf8--49de50f7-3d28-402d-895b-22634499a5c1.lovable.app-1779791467746.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c0a10d3d-7a68-46a0-bce4-1676b4419e5a/id-preview-37432cf8--49de50f7-3d28-402d-895b-22634499a5c1.lovable.app-1779791467746.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AuthGate() {
  const { session, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries();
      router.invalidate();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  useEffect(() => {
    if (loading) return;
    if (!session && pathname !== "/login") {
      router.navigate({ to: "/login", replace: true });
    }
    if (session && pathname === "/login") {
      router.navigate({ to: "/", replace: true });
    }
  }, [session, loading, pathname, router]);

  if (pathname === "/login") return <Outlet />;

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return <AppShell />;
}
