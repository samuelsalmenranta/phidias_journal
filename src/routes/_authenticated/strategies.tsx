import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TodayQuickView, WeeklyCalendar } from "@/components/today-quick-view";
import {
  STRATEGIES, GENERAL_RULES, TICK,
  PORTFOLIO_NAME, PORTFOLIO_SUBTITLE, PORTFOLIO_STATUS,
} from "@/lib/strategies";
import { AlertTriangle, Clock, Target, Shield, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/strategies")({
  component: StrategiesPage,
});

function StrategiesPage() {
  return (
    <div className="space-y-6">
      <Card className="border-primary/40">
        <CardContent className="p-4 md:p-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Portfolio</div>
              <h1 className="text-xl font-semibold">{PORTFOLIO_NAME}</h1>
              <div className="text-sm text-muted-foreground">{PORTFOLIO_SUBTITLE}</div>
            </div>
            <Badge variant="secondary" className="font-mono text-xs">{PORTFOLIO_STATUS}</Badge>
          </div>
        </CardContent>
      </Card>

      <TodayQuickView />
      <WeeklyCalendar />

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
        <h2 className="text-lg font-semibold">Strategiat (8 jalkaa)</h2>
        {STRATEGIES.map((s) => {
          const tick = TICK[s.symbol];
          return (
            <Card key={s.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">{s.symbol}</Badge>
                  <Badge variant="secondary" className="font-mono text-[10px]">{s.id}</Badge>
                  <CardTitle className="text-base font-mono">{s.fullId}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Family: <span className="font-mono">{s.family}</span></p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <Stat icon={Clock} label="Timeframe" value={s.timeframe} />
                  <Stat icon={Clock} label="ET sessio" value={`${s.sessionStartEt}–${s.sessionEndEt} (${s.sessionName})`} />
                  <Stat icon={Clock} label="Helsinki normaali" value={s.helsinkiNormal} />
                  <Stat icon={Clock} label="Helsinki DST mismatch" value={s.helsinkiDst} />
                  <Stat icon={Clock} label="Mahdolliset entryt ET" value={s.possibleEntryEt} />
                  <Stat icon={TrendingUp} label="Qty" value={`${s.symbol} × ${s.qty}`} />
                  <Stat icon={Shield} label="ATR" value={`ATR(${s.atrPeriod})`} />
                  <Stat icon={Shield} label="Stop kerroin" value={`${s.stopMultiple} × ATR`} />
                  <Stat icon={Target} label="Target kerroin" value={`${s.targetMultiple} × ATR`} />
                  <Stat icon={Clock} label="Max hold" value={`${s.maxHoldMinutes} min`} />
                  <Stat icon={Shield} label="Komissio" value={`$${tick.commission} / side / contract`} />
                  <Stat icon={Shield} label="Hard flat" value="16:45 ET" />
                </div>

                {s.warning && (
                  <div className="flex gap-2 items-start text-sm rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-destructive">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{s.warning}</span>
                  </div>
                )}

                <Separator />

                <p className="text-sm leading-relaxed">{s.description}</p>

                <div className="text-xs grid grid-cols-3 gap-2 pt-2 border-t">
                  <div>
                    <div className="text-muted-foreground uppercase tracking-wide text-[10px]">Rolling 10 alert</div>
                    <div className="tabular-nums">{s.killRule.rolling10Alert}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground uppercase tracking-wide text-[10px]">Hard kill net</div>
                    <div className="tabular-nums">${s.killRule.hardKillNet}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground uppercase tracking-wide text-[10px]">Losing streak</div>
                    <div className="tabular-nums">{s.killRule.losingStreak}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string;
}) {
  return (
    <div className="rounded-md border bg-secondary/30 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}
