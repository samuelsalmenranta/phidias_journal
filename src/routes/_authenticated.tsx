import { createFileRoute, Outlet, Link, useRouterState, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, ListChecks, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

const tabs = [
  { to: "/strategies", label: "Strategiat", icon: BookOpen },
  { to: "/loki", label: "Loki", icon: ListChecks },
  { to: "/tulokset", label: "Tulokset", icon: BarChart3 },
] as const;

function AuthLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Ladataan…</div>;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground grid place-items-center text-xs font-bold">L2</div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">LucidDirect V2</div>
              <div className="text-[10px] text-muted-foreground hidden sm:block">Paper Forward Journal</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[180px]">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Kirjaudu ulos</span>
            </Button>
          </div>
        </div>
        {/* desktop tabs */}
        <nav className="hidden md:flex max-w-6xl mx-auto px-4 gap-1 border-t">
          {tabs.map((t) => {
            const active = path.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-4 w-4 inline mr-1.5" />{t.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-4 md:py-6">
          <Outlet />
        </div>
      </main>

      {/* mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-card grid grid-cols-3">
        {tabs.map((t) => {
          const active = path.startsWith(t.to);
          return (
            <Link key={t.to} to={t.to}
              className={`flex flex-col items-center justify-center py-2.5 text-xs ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <t.icon className="h-5 w-5 mb-0.5" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
