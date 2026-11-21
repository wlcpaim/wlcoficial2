import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Terminal, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — WLC.IA" },
      { name: "description", content: "Acesse seu ambiente privado do WLC.IA." },
      { property: "og:title", content: "Entrar — WLC.IA" },
      { property: "og:description", content: "Acesse seu ambiente privado do WLC.IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) nav({ to: "/dashboard", replace: true }); });
    const { data } = supabase.auth.onAuthStateChange((ev, session) => {
      if (ev === "SIGNED_IN" && session) nav({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [nav]);

  function translate(err: any): string {
    const code = err?.code ?? "";
    const msg = String(err?.message ?? err);
    if (code === "email_not_confirmed" || /not confirmed/i.test(msg)) return "Seu email ainda não foi confirmado. Abra o link enviado (veja também o spam) ou reenvie abaixo.";
    if (code === "invalid_credentials" || /Invalid login/i.test(msg)) return "Email ou senha incorretos. Se você criou a conta com Google, use \"Continuar com Google\".";
    if (code === "user_already_exists" || /already registered/i.test(msg)) return "Este email já tem conta. Use Entrar.";
    if (/not allowed|Placeholder/i.test(msg)) return "Este endereço de email não é aceito. Use um email real.";
    if (code === "weak_password" || /password/i.test(msg) && /weak|short|pwned/i.test(msg)) return "Senha fraca ou já vazada. Escolha outra mais forte.";
    if (/rate limit/i.test(msg)) return "Muitas tentativas. Aguarde alguns minutos.";
    return msg;
  }

  async function resend() {
    if (!pending) return;
    const { error } = await supabase.auth.resend({ type: "signup", email: pending, options: { emailRedirectTo: `${window.location.origin}/auth` } });
    if (error) toast.error(translate(error)); else toast.success("Novo link de confirmação enviado.");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) { if ((error as any).code === "email_not_confirmed") setPending(email.trim()); throw error; }
        nav({ to: "/dashboard", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
        if (error) throw error;
        if (data.session) { nav({ to: "/dashboard", replace: true }); return; }
        if (data.user && (data.user.identities?.length ?? 0) === 0) throw new Error("Este email já tem conta. Use Entrar (ou Google, se foi assim que você criou).");
        setPending(email.trim());
        toast.success("Conta criada. Confirme pelo link enviado ao seu email.");
      }
    } catch (err) {
      toast.error(translate(err));
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    const target = email.trim();
    if (!target) { toast.error("Digite seu email acima para receber o link."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(target, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(translate(error)); else toast.success("Se houver uma conta com este email, enviamos um link para definir a senha.");
  }

  async function oauthGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) { toast.error(translate(result.error)); return; }
    if (result.redirected) return;
    nav({ to: "/dashboard", replace: true });
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-2 font-mono text-sm"><Terminal className="h-4 w-4 text-primary" /> WLC.IA</div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "in" | "up")}>
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="in">Entrar</TabsTrigger><TabsTrigger value="up">Criar conta</TabsTrigger></TabsList>
        </Tabs>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" /></div>
          <div className="space-y-2"><Label htmlFor="pw">Senha</Label><Input id="pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" /></div>
          <Button type="submit" className="h-11 w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "in" ? "Entrar" : "Criar conta"}</Button>
        </form>
        {mode === "in" && (
          <p className="text-center text-sm text-muted-foreground">
            Primeiro acesso ou esqueceu a senha?
            <Button variant="link" type="button" className="h-auto p-0 pl-1" onClick={forgot}>Definir senha por email</Button>
          </p>
        )}
        {pending && (
          <div className="rounded-md border bg-card p-3 text-sm text-muted-foreground">
            Enviamos um link para <span className="text-foreground">{pending}</span>. Confirme para entrar.
            <Button variant="link" className="h-auto p-0 pl-1" onClick={resend}>Reenviar link</Button>
          </div>
        )}
        <div className="grid gap-2">
          <Button variant="outline" className="h-11" onClick={oauthGoogle}>Continuar com Google</Button>
        </div>
      </div>
    </main>
  );
}
