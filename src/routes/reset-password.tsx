import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Terminal, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Definir senha — WLC.IA" },
      { name: "description", content: "Defina uma nova senha para acessar seu ambiente WLC.IA." },
      { property: "og:title", content: "Definir senha — WLC.IA" },
      { property: "og:description", content: "Defina uma nova senha para acessar seu ambiente WLC.IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((ev, session) => {
      if ((ev === "PASSWORD_RECOVERY" || ev === "SIGNED_IN") && session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => { if (s.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast.error("As senhas não coincidem."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha definida.");
    nav({ to: "/dashboard", replace: true });
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-2 font-mono text-sm"><Terminal className="h-4 w-4 text-primary" /> WLC.IA</div>
        <h1 className="text-xl font-semibold">Definir nova senha</h1>
        {!ready ? (
          <p className="text-sm text-muted-foreground">Abra esta página pelo link enviado ao seu email. Se o link expirou, peça um novo na tela de entrada.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="pw">Nova senha</Label><Input id="pw" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" /></div>
            <div className="space-y-2"><Label htmlFor="pw2">Confirmar senha</Label><Input id="pw2" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11" /></div>
            <Button type="submit" className="h-11 w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Salvar senha</Button>
          </form>
        )}
      </div>
    </main>
  );
}
