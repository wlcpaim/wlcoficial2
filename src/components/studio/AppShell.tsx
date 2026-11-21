import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut, Menu, Terminal, Play, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BOTTOM, NAV } from "./nav";

function NavList({ onPick }: { onPick?: () => void }) {
  const { pathname } = useLocation();
  return (
    <nav className="flex flex-col gap-0.5 p-2" aria-label="Navegação principal">
      {NAV.map((n) => {
        const active = pathname === n.to || pathname.startsWith(n.to + "/");
        return (
          <Link key={n.to} to={n.to} onClick={onPick}
            className={cn("flex min-h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors", active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")}>
            <n.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
            <span className="truncate">{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null)); }, []);
  useEffect(() => setOpen(false), [pathname]);
  const inDevChat = /^\/chat\/[^/]+/.test(pathname);
  const inChat = inDevChat || /^\/cognitive\/[^/]+\/c\/[^/]+/.test(pathname);
  const current = NAV.find((n) => pathname === n.to || pathname.startsWith(n.to + "/"));

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  const footer = (
    <div className="border-t p-3">
      <div className="mb-2 truncate px-1 text-xs text-muted-foreground">{email}</div>
      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}><LogOut className="h-4 w-4" /> Sair</Button>
    </div>
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4 font-mono text-sm"><Terminal className="h-4 w-4 text-primary" /> WLC.IA</div>
        <div className="flex-1 overflow-y-auto"><NavList /></div>
        {footer}
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-72 flex-col p-0">
          <SheetTitle className="flex h-14 items-center gap-2 border-b px-4 font-mono text-sm"><Terminal className="h-4 w-4 text-primary" /> WLC.IA</SheetTitle>
          <div className="flex-1 overflow-y-auto"><NavList onPick={() => setOpen(false)} /></div>
          {footer}
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="pt-safe flex h-14 shrink-0 items-center gap-2 border-b px-2 lg:hidden">
          <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Abrir menu" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
          <span className="truncate text-sm font-medium">{inChat ? "WLC.IA" : current?.label ?? "WLC.IA"}</span>
          {inDevChat && <div className="ml-auto flex gap-1.5 pr-1">
            <Link to="/live" search={{ tab: "preview" }} className="inline-flex h-9 items-center gap-1 rounded-md border px-2.5 text-xs font-medium hover:bg-accent"><Play className="h-3.5 w-3.5 text-primary" />Preview</Link>
            <Link to="/live" search={{ tab: "deploy" }} className="inline-flex h-9 items-center gap-1 rounded-md border px-2.5 text-xs font-medium hover:bg-accent"><Rocket className="h-3.5 w-3.5 text-primary" />Deploy</Link>
          </div>}
        </header>
        <main className={cn("min-w-0 flex-1 overflow-x-hidden", inChat ? "overflow-hidden" : "overflow-y-auto pb-20 lg:pb-0")}>
          <Outlet />
        </main>
        {!inChat && (
          <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 backdrop-blur lg:hidden" aria-label="Navegação rápida">
            {BOTTOM.map((to) => {
              const n = NAV.find((x) => x.to === to)!;
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <Link key={to} to={to} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
                  <n.icon className="h-5 w-5" /><span className="max-w-full truncate px-1">{n.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
