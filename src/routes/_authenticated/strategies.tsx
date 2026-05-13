import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TodayQuickView } from "@/components/today-quick-view";
import {
  STRATEGIES,
  PORTFOLIO,
  PORTFOLIO_NOTE,
  GENERAL_RULES,
} from "@/lib/strategies";
import { AlertTriangle, Clock, Target, Shield, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/strategies")({
  component: StrategiesPage,
});

function StrategiesPage() {
  return (
    <div className="space-y-6">
      <TodayQuickView />

      <div className="grid md:grid-cols-2 gap-4">
        <PortfolioCard
          title="Current V2 — benchmark"
          variant="current"
          sizes={PORTFOLIO.current}
        />
        <PortfolioCard
          title="Optimized V2 — challenger"
          variant="optimized"
          sizes={PORTFOLIO.optimized}
        />
      </div>

      <Card>
        <CardContent className="p-4 md:p-5 text-sm text-muted-foreground">
          {PORTFOLIO_NOTE}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Yleiset säännöt</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm">
            {GENERAL_RULES.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="text-primary mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Strategiat</h2>
        {STRATEGIES.map((s) => (
          <Card key={s.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">{s.symbol}</Badge>
                <CardTitle className="text-base font-mono">{s.name}</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{s.logic}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <Stat icon={Clock} label="ET" value={s.etWindow} />
                <Stat icon={Clock} label="Helsinki" value={s.helsinkiWindow} />
                <Stat icon={Shield} label="Stop" value={`${s.stopTicks} ticks (${s.stopPriceDistance})`} />
                <Stat icon={Target} label="Target" value={`${s.targetTicks} ticks (${s.targetPriceDistance})`} />
                <Stat icon={TrendingUp} label="Current qty" value={`${s.symbol} × ${s.currentQty}`} />
                <Stat icon={TrendingUp} label="Optimized qty" value={`${s.symbol} × ${s.optimizedQty}`} />
                <Stat icon={Clock} label="Päivät" value={s.days} />
                <Stat icon={Clock} label="Entry" value={s.entryTimeEt} />
              </div>

              {s.warning && (
                <div className="flex gap-2 items-start text-sm rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{s.warning}</span>
                </div>
              )}

              <Separator />

              <ul className="space-y-1.5 text-sm">
                {s.notes.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-muted-foreground mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PortfolioCard({
  title, variant, sizes,
}: { title: string; variant: "current" | "optimized"; sizes: { ES: number; HG: number; YM: number } }) {
  return (
    <Card className={variant === "optimized" ? "border-primary/40" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {(["ES", "HG", "YM"] as const).map((sym) => (
            <div key={sym} className="flex-1 rounded-md border bg-secondary/40 p-3 text-center">
              <div className="text-xs text-muted-foreground font-mono">{sym}</div>
              <div className="text-xl font-bold tabular-nums">×{sizes[sym]}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon, label, value,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-secondary/30 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}
