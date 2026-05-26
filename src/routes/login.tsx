import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/", replace: true });
  }, [session, loading, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch {
      toast.error("Sign in failed. Please check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
    } catch {
      toast.error("Google sign-in failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border rounded-xl p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="size-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <FileText className="size-5" />
          </div>
          <div>
            <div className="font-bold">GST Billing</div>
            <div className="text-xs text-muted-foreground">Sign in to manage your invoices</div>
          </div>
        </div>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <svg className="size-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px bg-border flex-1" /> OR <div className="h-px bg-border flex-1" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <div>
            <label className="text-xs font-medium">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background" />
          </div>
          <div>
            <label className="text-xs font-medium">Password</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background" />
          </div>
          <button type="submit" disabled={busy} className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {busy ? "Please wait…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground text-center">
          Sign-ups are disabled. Contact the workspace owner to be added as a user.
        </p>
      </div>
    </div>
  );
}
