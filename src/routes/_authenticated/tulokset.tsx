import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, ReferenceLine,
} from "recharts";
import { TICK, STRATEGIES, LUCID_EV_CONTEXT, type Symbol } from "@/lib/strategies";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tulokset")({
  component: ResultsPage,
});

type T = {
  id: string;
  date_et: string | null;
  lucid_eod_day: string | null;
  symbol: string;
  trade_status: string | null;
  exit_reason: string | null;
  net_pnl_current: number | null;
  net_pnl_optimized: number | null;
  gross_pnl_current: number | null;
  gross_pnl_optimized: number | null;
  theoretical_pnl: number | null;
  actual_pnl: number | null;
  actual_minus_theoretical: number | null;
  entry_price_actual: number | null;
  entry_price_theoretical: number | null;
  rule_followed: boolean | null;
  entry_time_et: string | null;
  mini_equivalent: number | null;
};

const SYMBOLS: Symbol[] = ["YM", "HG", "MES", "GC"];

function ResultsPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("trades")
        .select("id,date_et,lucid_eod_day,symbol,trade_status,exit_reason,net_pnl_current,net_pnl_optimized,gross_pnl_current,gross_pnl_optimized,theoretical_pnl,actual_pnl,actual_minus_theoretical,entry_price_actual,entry_price_theoretical,rule_followed,entry_time_et,mini_equivalent")
        .order("lucid_eod_day", { ascending: true });
      setTrades((data ?? []) as T[]);
      setLoading(false);
    })();
  }, [user]);

  const primary = useMemo(() => computeStats(trades, "current"), [trades]);
  const gcFree  = useMemo(() => computeStats(trades, "optimized"), [trades]);
  const bySymbol = useMemo(() => bySym(trades), [trades]);
  const exec = useMemo(() => execQuality(trades), [trades]);
  const equityPrim = useMemo(() => equityCurve(trades, "current"), [trades]);
  const equityGcFree = useMemo(() => equityCurve(trades, "optimized"), [trades]);
  const dailyPrim = useMemo(() => dailyAgg(trades, "current"), [trades]);

  const gcWatch = useMemo(() => buildWatch(trades, "GC", -3000), [trades]);
  const mesWatch = useMemo(() => buildWatch(trades, "MES", -2000), [trades]);
  const ymWatch = useMemo(() => buildWatch(trades, "YM", -2000), [trades]);
  const hgWatch = useMemo(() => buildWatch(trades, "HG", -2000), [trades]);

  if (loading) return <div className="text-sm text-muted-foreground">Ladataan…</div>;
  if (trades.length === 0) {
    return <div className="text-sm text-muted-foreground">Ei treidejä vielä — lisää ensimmäinen Loki-sivulla.</div>;
  }

  const winningDays = dailyPrim.filter((d) => d.pnl >= 250).length;
  const cycles = Math.floor(winningDays / 5);
  const eq = equityPrim;
  const peakEq = eq.reduce((m, p) => Math.max(m, p.equity), 0);
  const ddNow = (eq.at(-1)?.equity ?? 0) - peakEq;
  const dailyValues = dailyPrim.map((d) => d.pnl);
  const worstDay = dailyValues.length ? Math.min(...dailyValues) : 0;
  const dllSoftLockDays = dailyValues.filter((v) => v <= -3000).length;
  const mllBreach = ddNow <= -5000;

  return (
    <div className="space-y-6">
      {/* Top alerts */}
      <div className="space-y-2">
        {mllBreach && <Alert tone="destructive">MLL breach estimate: drawdown {fmt$(ddNow)} ≤ −$5,000.</Alert>}
        {dllSoftLockDays > 0 && <Alert tone="warning">DLL soft-lock: {dllSoftLockDays} päivä(ä) ≤ −$3,000.</Alert>}
        {gcWatch.alert && <Alert tone="destructive">GC deterioration: rolling 10-trade {fmt$(gcWatch.rolling10)}.</Alert>}
        {gcWatch.threeStops && <Alert tone="warning">GC: 3 stop exits peräkkäin.</Alert>}
        {mesWatch.alert && <Alert tone="warning">MES rolling 10-trade {fmt$(mesWatch.rolling10)} — execution leakage.</Alert>}
        {ymWatch.alert && <Alert tone="warning">YM rolling 10-trade {fmt$(ymWatch.rolling10)}.</Alert>}
        {exec.actualMinusTheo < -200 && <Alert tone="warning">Execution leakage: actual {fmt$(exec.actualMinusTheo)} vs theoretical.</Alert>}
      </div>

      {/* Portfolio Summary */}
      <div className="grid md:grid-cols-2 gap-4">
        <PortfolioStatsCard title="Primary (high-EV, sis. GC)" stats={primary} accent="primary"
          extras={{ winningDays, cycles, ddNow, worstDay }} />
        <PortfolioStatsCard title="GC-free (vertailu)" stats={gcFree} accent="muted"
          extras={{ winningDays: dailyAgg(trades,"optimized").filter(d => d.pnl >= 250).length, cycles: 0, ddNow: 0, worstDay: 0 }} />
      </div>

      {/* Lucid EV context */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Lucid EV-context (backtest expectation, not guarantee)</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-1 text-sm">
          <Row label="Median M18-60 (5 tiliä)" v={LUCID_EV_CONTEXT.monthlyMedian} />
          <Row label="5Y median net" v={LUCID_EV_CONTEXT.fiveYearMedian} />
          <Row label="5Y P10 net" v={LUCID_EV_CONTEXT.fiveYearP10} />
          <Row label="First payout median" v={LUCID_EV_CONTEXT.firstPayoutDays} />
          <Row label="Breach rate" v={LUCID_EV_CONTEXT.breachRate} />
          <Row label="Worst modeled day" v={LUCID_EV_CONTEXT.worstDay} />
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="legs">Per-leg</TabsTrigger>
          <TabsTrigger value="payout">Payout</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="exec">Execution</TabsTrigger>
          <TabsTrigger value="watch">Watch</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Equity curve</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={mergeEquity(equityPrim, equityGcFree)}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  <Line dataKey="primary" name="Primary" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                  <Line dataKey="gcFree" name="GC-free" stroke="hsl(var(--muted-foreground))" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Drawdown</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={ddSeries(equityPrim)}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <ReferenceLine y={-5000} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: "MLL −$5,000", fontSize: 10, fill: "hsl(var(--destructive))" }} />
                  <Line dataKey="dd" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legs" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">P&amp;L by symbol</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={SYMBOLS.map((sym) => ({ sym, primary: bySymbol[sym]?.totalCur ?? 0, gcFree: bySymbol[sym]?.totalOpt ?? 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="sym" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Bar dataKey="primary" name="Primary" fill="hsl(var(--primary))" />
                  <Bar dataKey="gcFree" name="GC-free" fill="hsl(var(--muted-foreground))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-3">
            {SYMBOLS.map((sym) => {
              const v = bySymbol[sym] ?? emptySymStat();
              const spec = STRATEGIES.find((s) => s.symbol === sym)!;
              return (
                <Card key={sym}>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-mono">{sym}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">×{spec.primaryQty}</Badge>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <Row label="Trades" v={String(v.trades)} />
                    <Row label="Net P&L (Primary)" v={fmt$(v.totalCur)} />
                    <Row label="Gross P&L" v={fmt$(v.grossCur)} />
                    <Row label="Win rate" v={`${(v.winRate*100).toFixed(1)}%`} />
                    <Row label="Profit factor" v={v.profitFactor.toFixed(2)} />
                    <Row label="Avg trade" v={fmt$(v.avgTrade)} />
                    <Row label="Best / Worst" v={`${fmt$(v.best)} / ${fmt$(v.worst)}`} />
                    <Row label="Max DD" v={fmt$(v.maxDD)} />
                    <Row label="$250+ days contributed" v={String(v.days250)} />
                    <Row label="Avg slippage ticks" v={v.avgSlipTicks.toFixed(2)} />
                    <Row label="Actual − theoretical" v={fmt$(v.actualMinusTheo)} />
                    <Row label="Rule errors" v={String(v.ruleErrors)} />
                    <Row label="Missed" v={String(v.missed)} />
                    {sym === "HG" && (
                      <>
                        <Row label="HG 16:30 late entries" v={String(v.lateEntries)} />
                        <Row label="manual_flatten_before_1645" v={String(v.manualFlatten)} />
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="payout" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Lucid payout tracking</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <Row label="$250+ winning days" v={String(winningDays)} />
              <Row label="Estimated payout cycles done" v={String(cycles)} />
              <Row label="Days until next 5-day cycle" v={String(5 - (winningDays % 5))} />
              <Row label="Best Lucid EOD day" v={fmt$(Math.max(0, ...dailyValues))} />
              <Row label="Worst Lucid EOD day" v={fmt$(worstDay)} />
              <Row label="Days since last $250+" v={String(daysSince(dailyPrim))} />
              <Row label="Active days (taken)" v={String(dailyPrim.filter(d => d.trades > 0).length)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Daily P&amp;L (Primary)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyPrim}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <ReferenceLine y={250} stroke="hsl(var(--success))" strokeDasharray="3 3" />
                  <Bar dataKey="pnl" name="P&L" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Risk / breach tracking</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <Row label="Current equity" v={fmt$(eq.at(-1)?.equity ?? 0)} />
              <Row label="Peak equity" v={fmt$(peakEq)} />
              <Row label="Current drawdown" v={fmt$(ddNow)} />
              <Row label="MLL estimate (≤ −$5,000)" v={mllBreach ? "BREACH" : "OK"} />
              <Row label="Worst rolling 5-day" v={fmt$(rollingWorst(dailyValues, 5))} />
              <Row label="Worst rolling 10-day" v={fmt$(rollingWorst(dailyValues, 10))} />
              <Row label="Days ≤ −$1,000" v={String(dailyValues.filter(v => v <= -1000).length)} />
              <Row label="Days ≤ −$2,000" v={String(dailyValues.filter(v => v <= -2000).length)} />
              <Row label="Days ≤ −$3,000" v={String(dailyValues.filter(v => v <= -3000).length)} />
              <Row label="DLL soft-lock days est. (≤ −$3,000)" v={String(dllSoftLockDays)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exec" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Execution quality</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <Row label="Theoretical P&L" v={fmt$(exec.theoretical)} />
              <Row label="Actual P&L" v={fmt$(exec.actual)} />
              <Row label="Actual − theoretical" v={fmt$(exec.actualMinusTheo)} />
              <Row label="Avg slippage ticks" v={exec.avgSlipTicks.toFixed(2)} />
              <Row label="Avg slippage $" v={fmt$(exec.avgSlipDollars)} />
              <Row label="Missed trades" v={String(exec.missed)} />
              <Row label="Late entries (HG 16:30)" v={String(exec.lateEntries)} />
              <Row label="Rule errors" v={String(exec.ruleErrors)} />
              <Row label="Manual overrides (manual_flatten)" v={String(exec.manualOverrides)} />
              <Row label="Cutoff exits" v={String(exec.manualOverrides)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="watch" className="space-y-4 mt-4">
          <WatchCard sym="GC" w={gcWatch} note="Korkein EV mutta riskisin jalka. Hälytys jos rolling 10 < −3000 tai 3 stoppia peräkkäin." />
          <WatchCard sym="MES" w={mesWatch} note="Micro-strategia — validoi paper data huolella. Hälytys jos rolling 10 < −2000." />
          <WatchCard sym="YM" w={ymWatch} note="02:30 fill-laatu kriittinen. Hälytys jos rolling 10 < −2000." />
          <WatchCard sym="HG" w={hgWatch} note="16:30 entry → seuraa manual_flatten määrää." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ----- helpers -----

type Stats = {
  totalNet: number; totalGross: number; trades: number; winRate: number;
  profitFactor: number; avgWin: number; avgLoss: number;
  bestTrade: number; worstTrade: number; bestDay: number; worstDay: number;
  maxDrawdown: number; winningDays250: number;
};

function computeStats(trades: T[], side: "current" | "optimized"): Stats {
  const taken = trades.filter((t) => t.trade_status === "Taken");
  const pnls = taken.map((t) => Number(side === "current" ? t.net_pnl_current : t.net_pnl_optimized) || 0);
  const gross = taken.map((t) => Number(side === "current" ? t.gross_pnl_current : t.gross_pnl_optimized) || 0);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const totalNet = pnls.reduce((a, b) => a + b, 0);
  const totalGross = gross.reduce((a, b) => a + b, 0);
  const sumWins = wins.reduce((a, b) => a + b, 0);
  const sumLosses = Math.abs(losses.reduce((a, b) => a + b, 0));
  const profitFactor = sumLosses === 0 ? (sumWins > 0 ? Infinity : 0) : sumWins / sumLosses;
  const byDay = groupByDay(taken, side);
  const dayValues = Object.values(byDay);
  return {
    totalNet, totalGross, trades: taken.length,
    winRate: taken.length ? wins.length / taken.length : 0,
    profitFactor: Number.isFinite(profitFactor) ? profitFactor : 0,
    avgWin: wins.length ? sumWins / wins.length : 0,
    avgLoss: losses.length ? -sumLosses / losses.length : 0,
    bestTrade: pnls.length ? Math.max(...pnls) : 0,
    worstTrade: pnls.length ? Math.min(...pnls) : 0,
    bestDay: dayValues.length ? Math.max(...dayValues) : 0,
    worstDay: dayValues.length ? Math.min(...dayValues) : 0,
    maxDrawdown: drawdown(taken, side),
    winningDays250: dayValues.filter((v) => v >= 250).length,
  };
}

function drawdown(taken: T[], side: "current" | "optimized") {
  let peak = 0, eq = 0, dd = 0;
  const sorted = [...taken].sort((a, b) => (a.lucid_eod_day ?? "").localeCompare(b.lucid_eod_day ?? ""));
  for (const t of sorted) {
    eq += Number(side === "current" ? t.net_pnl_current : t.net_pnl_optimized) || 0;
    if (eq > peak) peak = eq;
    dd = Math.min(dd, eq - peak);
  }
  return dd;
}

function groupByDay(trades: T[], side: "current" | "optimized"): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of trades) {
    const k = t.lucid_eod_day ?? t.date_et ?? "—";
    out[k] = (out[k] ?? 0) + (Number(side === "current" ? t.net_pnl_current : t.net_pnl_optimized) || 0);
  }
  return out;
}

function dailyAgg(trades: T[], side: "current" | "optimized"): { day: string; pnl: number; trades: number }[] {
  const map = new Map<string, { pnl: number; trades: number }>();
  for (const t of trades.filter((x) => x.trade_status === "Taken")) {
    const k = t.lucid_eod_day ?? t.date_et ?? "—";
    const e = map.get(k) ?? { pnl: 0, trades: 0 };
    e.pnl += Number(side === "current" ? t.net_pnl_current : t.net_pnl_optimized) || 0;
    e.trades += 1;
    map.set(k, e);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, v]) => ({ day, ...v }));
}

type SymStat = ReturnType<typeof emptySymStat>;
function bySym(trades: T[]): Record<Symbol, SymStat> {
  const out: Partial<Record<Symbol, SymStat>> = {};
  for (const sym of SYMBOLS) {
    const sub = trades.filter((t) => t.symbol === sym && t.trade_status === "Taken");
    const all = trades.filter((t) => t.symbol === sym);
    const pnlsC = sub.map((t) => Number(t.net_pnl_current) || 0);
    const pnlsO = sub.map((t) => Number(t.net_pnl_optimized) || 0);
    const gross = sub.map((t) => Number(t.gross_pnl_current) || 0);
    const wins = pnlsC.filter((p) => p > 0).length;
    const sumW = pnlsC.filter((p) => p > 0).reduce((a, b) => a + b, 0);
    const sumL = Math.abs(pnlsC.filter((p) => p < 0).reduce((a, b) => a + b, 0));
    const tickSize = TICK[sym].size;
    const slipTicks = sub
      .filter((t) => t.entry_price_actual != null && t.entry_price_theoretical != null)
      .map((t) => Math.abs(Number(t.entry_price_actual) - Number(t.entry_price_theoretical)) / tickSize);
    const amt = sub
      .filter((t) => t.actual_minus_theoretical != null)
      .map((t) => Number(t.actual_minus_theoretical));
    const days = new Map<string, number>();
    for (const t of sub) {
      const k = t.lucid_eod_day ?? t.date_et ?? "—";
      days.set(k, (days.get(k) ?? 0) + (Number(t.net_pnl_current) || 0));
    }
    out[sym] = {
      totalCur: pnlsC.reduce((a, b) => a + b, 0),
      totalOpt: pnlsO.reduce((a, b) => a + b, 0),
      grossCur: gross.reduce((a, b) => a + b, 0),
      trades: sub.length,
      winRate: sub.length ? wins / sub.length : 0,
      profitFactor: sumL === 0 ? (sumW > 0 ? 99 : 0) : sumW / sumL,
      avgTrade: sub.length ? pnlsC.reduce((a, b) => a + b, 0) / sub.length : 0,
      best: pnlsC.length ? Math.max(...pnlsC) : 0,
      worst: pnlsC.length ? Math.min(...pnlsC) : 0,
      maxDD: drawdown(sub, "current"),
      days250: [...days.values()].filter((v) => v >= 250).length,
      avgSlipTicks: slipTicks.length ? slipTicks.reduce((a, b) => a + b, 0) / slipTicks.length : 0,
      actualMinusTheo: amt.length ? amt.reduce((a, b) => a + b, 0) : 0,
      ruleErrors: all.filter((t) => t.rule_followed === false).length,
      missed: all.filter((t) => t.trade_status === "Missed").length,
      lateEntries: sym === "HG" ? all.filter((t) => t.entry_time_et === "16:30").length : 0,
      manualFlatten: sym === "HG" ? all.filter((t) => t.exit_reason === "manual_flatten_before_1645").length : 0,
    };
  }
  return out as Record<Symbol, SymStat>;
}

function emptySymStat() {
  return {
    totalCur: 0, totalOpt: 0, grossCur: 0, trades: 0, winRate: 0, profitFactor: 0,
    avgTrade: 0, best: 0, worst: 0, maxDD: 0, days250: 0,
    avgSlipTicks: 0, actualMinusTheo: 0, ruleErrors: 0, missed: 0,
    lateEntries: 0, manualFlatten: 0,
  };
}

function equityCurve(trades: T[], side: "current" | "optimized") {
  const grouped = groupByDay(trades.filter((t) => t.trade_status === "Taken"), side);
  const days = Object.keys(grouped).sort();
  let eq = 0;
  return days.map((d) => {
    eq += grouped[d];
    return { day: d, equity: eq, daily: grouped[d] };
  });
}

function mergeEquity(a: { day: string; equity: number }[], b: { day: string; equity: number }[]) {
  const map = new Map<string, { day: string; primary?: number; gcFree?: number }>();
  for (const x of a) map.set(x.day, { day: x.day, primary: x.equity });
  for (const x of b) {
    const e = map.get(x.day) ?? { day: x.day };
    e.gcFree = x.equity;
    map.set(x.day, e);
  }
  return [...map.values()].sort((x, y) => x.day.localeCompare(y.day));
}

function ddSeries(eq: { day: string; equity: number }[]) {
  let peak = 0;
  return eq.map((p) => { peak = Math.max(peak, p.equity); return { day: p.day, dd: p.equity - peak }; });
}

function execQuality(trades: T[]) {
  const taken = trades.filter((t) => t.trade_status === "Taken");
  const theoretical = taken.reduce((a, t) => a + (Number(t.theoretical_pnl) || 0), 0);
  const actual = taken.reduce((a, t) => a + (Number(t.actual_pnl ?? t.net_pnl_current) || 0), 0);
  const slipTicks: number[] = [];
  const slipDollars: number[] = [];
  for (const t of taken) {
    if (t.entry_price_actual != null && t.entry_price_theoretical != null) {
      const tickSize = TICK[t.symbol as Symbol]?.size ?? 1;
      const tickValue = TICK[t.symbol as Symbol]?.value ?? 0;
      const ticks = Math.abs(Number(t.entry_price_actual) - Number(t.entry_price_theoretical)) / tickSize;
      slipTicks.push(ticks);
      slipDollars.push(ticks * tickValue);
    }
  }
  return {
    theoretical, actual,
    actualMinusTheo: actual - theoretical,
    avgSlipTicks: slipTicks.length ? slipTicks.reduce((a, b) => a + b, 0) / slipTicks.length : 0,
    avgSlipDollars: slipDollars.length ? slipDollars.reduce((a, b) => a + b, 0) / slipDollars.length : 0,
    missed: trades.filter((t) => t.trade_status === "Missed").length,
    ruleErrors: trades.filter((t) => t.rule_followed === false).length,
    lateEntries: trades.filter((t) => t.symbol === "HG" && t.entry_time_et === "16:30").length,
    manualOverrides: trades.filter((t) => t.exit_reason === "manual_flatten_before_1645").length,
  };
}

function buildWatch(trades: T[], sym: Symbol, threshold: number) {
  const sub = trades
    .filter((t) => t.symbol === sym && t.trade_status === "Taken")
    .sort((a, b) => (a.lucid_eod_day ?? "").localeCompare(b.lucid_eod_day ?? ""));
  const pnls = sub.map((t) => Number(t.net_pnl_current) || 0);
  const rolling10 = pnls.slice(-10).reduce((a, b) => a + b, 0);
  const rolling5 = pnls.slice(-5).reduce((a, b) => a + b, 0);
  const total = pnls.reduce((a, b) => a + b, 0);
  // streak of stops
  let streak = 0;
  for (let i = sub.length - 1; i >= 0; i--) {
    if (sub[i].exit_reason === "stop") streak++;
    else break;
  }
  return {
    rolling5, rolling10, total, threshold,
    threeStops: streak >= 3,
    alert: rolling10 < threshold || total < threshold,
    trades: sub.length,
    streak,
  };
}

function rollingWorst(values: number[], window: number) {
  if (values.length < 1) return 0;
  let worst = 0;
  for (let i = 0; i + window <= values.length; i++) {
    const sum = values.slice(i, i + window).reduce((a, b) => a + b, 0);
    if (sum < worst) worst = sum;
  }
  return worst;
}

function daysSince(daily: { day: string; pnl: number }[]) {
  for (let i = daily.length - 1, n = 0; i >= 0; i--, n++) {
    if (daily[i].pnl >= 250) return n;
  }
  return daily.length;
}

function PortfolioStatsCard({
  title, stats, accent, extras,
}: {
  title: string;
  stats: Stats;
  accent: "primary" | "muted";
  extras: { winningDays: number; cycles: number; ddNow: number; worstDay: number };
}) {
  return (
    <Card className={accent === "primary" ? "border-primary/40" : ""}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Badge variant={accent === "primary" ? "default" : "secondary"}>{stats.trades} treidiä</Badge>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold tabular-nums mb-3 ${stats.totalNet >= 0 ? "text-success" : "text-destructive"}`}>
          {fmt$(stats.totalNet)}
        </div>
        <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-sm">
          <Row label="Gross P&L" v={fmt$(stats.totalGross)} />
          <Row label="Win rate" v={`${(stats.winRate*100).toFixed(1)}%`} />
          <Row label="Profit factor" v={stats.profitFactor.toFixed(2)} />
          <Row label="Avg win" v={fmt$(stats.avgWin)} />
          <Row label="Avg loss" v={fmt$(stats.avgLoss)} />
          <Row label="Best trade" v={fmt$(stats.bestTrade)} />
          <Row label="Worst trade" v={fmt$(stats.worstTrade)} />
          <Row label="Best day" v={fmt$(stats.bestDay)} />
          <Row label="Worst day" v={fmt$(stats.worstDay)} />
          <Row label="Max drawdown" v={fmt$(stats.maxDrawdown)} />
          <Row label="$250+ days" v={String(extras.winningDays)} />
          <Row label="Payout cycles" v={String(extras.cycles)} />
        </div>
      </CardContent>
    </Card>
  );
}

function WatchCard({ sym, w, note }: { sym: Symbol; w: ReturnType<typeof buildWatch>; note: string }) {
  return (
    <Card className={w.alert ? "border-destructive/50" : ""}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-mono">{sym} watch</CardTitle>
        {w.alert ? <Badge variant="destructive">ALERT</Badge> : <Badge variant="secondary">OK</Badge>}
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        <div className="text-xs text-muted-foreground mb-2">{note}</div>
        <Row label="Trades" v={String(w.trades)} />
        <Row label="Total net" v={fmt$(w.total)} />
        <Row label="Rolling 5-trade" v={fmt$(w.rolling5)} />
        <Row label="Rolling 10-trade" v={fmt$(w.rolling10)} />
        <Row label="Stop streak (current)" v={String(w.streak)} />
        <Row label="Threshold" v={fmt$(w.threshold)} />
      </CardContent>
    </Card>
  );
}

function Alert({ tone, children }: { tone: "destructive" | "warning"; children: React.ReactNode }) {
  const cls = tone === "destructive"
    ? "bg-destructive/10 border-destructive/40 text-destructive"
    : "bg-warning/10 border-warning/40 text-foreground";
  return (
    <div className={`flex gap-2 items-start text-sm rounded-md border px-3 py-2 ${cls}`}>
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function Row({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-right tabular-nums font-medium">{v}</div>
    </div>
  );
}

function fmt$(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  return (n >= 0 ? "+" : "") + "$" + n.toFixed(2);
}
