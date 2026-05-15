import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TodayQuickView, WeeklyCalendar } from "@/components/today-quick-view";
import {
  STRATEGIES,
  PORTFOLIO,
  PORTFOLIO_NOTE,
  GENERAL_RULES,
  LUCID_EV_CONTEXT,
  MAX_CONCURRENT_MINI_EQ,
} from "@/lib/strategies";
import { AlertTriangle, Clock, Target, Shield, TrendingUp, Layers } from "lucide-react";

export const Route = createFileRoute("/_authenticated/strategies")({
  component: StrategiesPage,
});

function StrategiesPage() {
  return (
    <div className="space-y-6">
      <TodayQuickView />
      <WeeklyCalendar />

      <div className="grid md:grid-cols-2 gap-4">
        <PortfolioCard
          title="Primary — high-EV (sis. GC)"
          variant="primary"
          sizes={PORTFOLIO.primary}
          totalMiniEq={STRATEGIES.reduce((a, s) => a + s.primaryMiniEq, 0)}
        />
        <PortfolioCard
          title="GC-free — vertailu"
          variant="gcFree"
          sizes={PORTFOLIO.gcFree}
          totalMiniEq={STRATEGIES.reduce((a, s) => a + s.gcFreeMiniEq, 0)}
        />
      </div>

      <Card>
        <CardContent className="p-4 md:p-5 text-sm text-muted-foreground">
          {PORTFOLIO_NOTE}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lucid EV-context (backtest-odotus)</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2 text-sm">
          <Row label="M18-60 median (5 tiliä)" v={LUCID_EV_CONTEXT.monthlyMedian} />
          <Row label="5Y median net" v={LUCID_EV_CONTEXT.fiveYearMedian} />
          <Row label="5Y P10 net" v={LUCID_EV_CONTEXT.fiveYearP10} />
          <Row label="First payout median" v={LUCID_EV_CONTEXT.firstPayoutDays} />
          <Row label="Breach rate" v={LUCID_EV_CONTEXT.breachRate} />
          <Row label="Worst modeled day" v={LUCID_EV_CONTEXT.worstDay} />
          <Row label="Trades / month" v={LUCID_EV_CONTEXT.tradesPerMonth} />
          <Row label="Active days / month" v={LUCID_EV_CONTEXT.activeDaysPerMonth} />
          <div className="sm:col-span-2 text-xs text-muted-foreground italic mt-1">
            {LUCID_EV_CONTEXT.disclaimer}
          </div>
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
          <div className="mt-3 flex gap-2 items-start text-xs rounded-md bg-warning/10 border border-warning/30 px-3 py-2">
            <Layers className="h-3.5 w-3.5 mt-0.5 text-warning shrink-0" />
            <span>
              Lucid max {MAX_CONCURRENT_MINI_EQ} mini-equivalent <b>samanaikaisesti avoinna</b> — ei päivän kokonaisvaihto. Aamupositio sulkeutuu = kapasiteetti vapautuu.
            </span>
          </div>
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
                <Stat icon={Clock} label="Helsinki normaali" value={s.helsinkiWindowNormal} />
                <Stat icon={Clock} label="Helsinki DST" value={s.helsinkiWindowDst} />
                <Stat icon={Clock} label="Entry ET" value={s.entryTimeEt} />
                <Stat icon={Shield} label="Stop" value={`${s.stopTicks} ticks (${s.stopPriceDistance})`} />
                <Stat icon={Target} label="Target" value={`${s.targetTicks} ticks (${s.targetPriceDistance})`} />
                <Stat icon={Clock} label="Max hold" value={`${s.maxHoldBars} baria`} />
                <Stat icon={Clock} label="Päivät" value={s.days} />
                <Stat icon={TrendingUp} label="Primary qty" value={`${s.symbol} × ${s.primaryQty} (${s.primaryMiniEq} mini-eq)`} />
                <Stat icon={TrendingUp} label="GC-free qty" value={`${s.symbol} × ${s.gcFreeQty} (${s.gcFreeMiniEq} mini-eq)`} />
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
  title, variant, sizes, totalMiniEq,
}: {
  title: string;
  variant: "primary" | "gcFree";
  sizes: { YM: number; HG: number; MES: number; GC: number };
  totalMiniEq: number;
}) {
  return (
    <Card className={variant === "primary" ? "border-primary/40" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="secondary" className="text-[10px]">{totalMiniEq} mini-eq peak</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {(["YM", "HG", "MES", "GC"] as const).map((sym) => (
            <div key={sym} className="rounded-md border bg-secondary/40 p-2 text-center">
              <div className="text-[10px] text-muted-foreground font-mono">{sym}</div>
              <div className="text-lg font-bold tabular-nums">×{sizes[sym]}</div>
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

function Row({ label, v }: { label: string; v: string }) {
  return (
    <>
      <div className="text-muted-foreground">{label}</div>
      <div className="text-right tabular-nums font-medium">{v}</div>
    </>
  );
}
