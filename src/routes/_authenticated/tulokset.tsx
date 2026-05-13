import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, ReferenceLine } from "recharts";
import { TICK } from "@/lib/strategies";

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
  entry_price_actual: number | null;
  entry_price_theoretical: number | null;
  rule_followed: boolean | null;
  entry_time_et: string | null;
};

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
        .select("id,date_et,lucid_eod_day,symbol,trade_status,exit_reason,net_pnl_current,net_pnl_optimized,gross_pnl_current,gross_pnl_optimized,entry_price_actual,entry_price_theoretical,rule_followed,entry_time_et")
        .order("lucid_eod_day", { ascending: true });
      setTrades((data ?? []) as T[]);
      setLoading(false);
    })();
  }, [user]);

  const cur = useMemo(() => computeStats(trades, "current"), [trades]);
  const opt = useMemo(() => computeStats(trades, "optimized"), [trades]);
  const compare = useMemo(() => buildCompare(trades), [trades]);
  const bySymbol = useMemo(() => bySym(trades), [trades]);
  const backtest = useMemo(() => backtestVsPaper(trades), [trades]);
  const equityCur = useMemo(() => equityCurve(trades, "current"), [trades]);
  const equityOpt = useMemo(() => equityCurve(trades, "optimized"), [trades]);

  if (loading) return <div className="text-sm text-muted-foreground">Ladataan…</div>;
  if (trades.length === 0) {
    return <div className="text-sm text-muted-foreground">Ei treidejä vielä — lisää ensimmäinen Loki-sivulla.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <PortfolioStatsCard title="Current V2" stats={cur} accent="muted" />
        <PortfolioStatsCard title="Optimized V2" stats={opt} accent="primary" />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Portfoliovertailu</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <CompareRow label="Total P&L" a={cur.totalNet} b={opt.totalNet} better="high" />
            <CompareRow label="Max drawdown" a={cur.maxDrawdown} b={opt.maxDrawdown} better="low" />
            <CompareRow label="Winning days ≥ $250" a={cur.winningDays250} b={opt.winningDays250} better="high" />
          </div>
          <div className="mt-3 text-sm font-medium">
            {compare.winner === "tie"
              ? "Tasapeli paper-forwardissa tähän mennessä."
              : `${compare.winner === "current" ? "Current V2" : "Optimized V2"} on parempi paper-forwardissa tähän mennessä.`}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="equity">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
          <TabsTrigger value="equity">Equity</TabsTrigger>
          <TabsTrigger value="symbol">Symbol</TabsTrigger>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="payout">Payout</TabsTrigger>
        </TabsList>

        <TabsContent value="equity" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Equity curve</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={mergeEquity(equityCur, equityOpt)}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  <Line dataKey="current" name="Current V2" stroke="hsl(var(--muted-foreground))" dot={false} strokeWidth={2} />
                  <Line dataKey="optimized" name="Optimized V2" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Drawdown — Current vs Optimized</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={mergeDD(equityCur, equityOpt)}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Line dataKey="current" stroke="hsl(var(--muted-foreground))" dot={false} strokeWidth={2} />
                  <Line dataKey="optimized" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="symbol" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">P&amp;L by symbol</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={Object.entries(bySymbol).map(([sym, v]) => ({ sym, current: v.totalCur, optimized: v.totalOpt }))}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="sym" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Bar dataKey="current" name="Current" fill="hsl(var(--muted-foreground))" />
                  <Bar dataKey="optimized" name="Optimized" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-3">
            {(["ES","YM","HG"] as const).map((sym) => {
              const v = bySymbol[sym] ?? emptySymStat();
              return (
                <Card key={sym}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-mono">{sym}</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <Row label="P&L Current" v={fmt$(v.totalCur)} />
                    <Row label="P&L Optimized" v={fmt$(v.totalOpt)} />
                    <Row label="Trades" v={String(v.trades)} />
                    <Row label="Win rate" v={`${(v.winRate*100).toFixed(1)}%`} />
                    <Row label="Profit factor" v={v.profitFactor.toFixed(2)} />
                    <Row label="Avg slippage ticks" v={v.avgSlipTicks.toFixed(2)} />
                    <Row label="Avg actual − theo" v={v.avgActualMinusTheo.toFixed(4)} />
                    {sym === "HG" && (
                      <>
                        <Row label="HG 16:30 late entries" v={String(v.lateEntries ?? 0)} />
                        <Row label="manual_flatten_before_1645" v={String(v.manualFlatten ?? 0)} />
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="daily" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">P&amp;L by day</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={equityCur.map((p, i) => ({ day: p.day, current: p.daily, optimized: equityOpt[i]?.daily ?? 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Bar dataKey="current" name="Current" fill="hsl(var(--muted-foreground))" />
                  <Bar dataKey="optimized" name="Optimized" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <DailyTable trades={trades} />
        </TabsContent>

        <TabsContent value="payout" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Lucid payout simulation</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <Row label="Current — winning days ≥ $250" v={String(cur.winningDays250)} />
              <Row label="Optimized — winning days ≥ $250" v={String(opt.winningDays250)} />
              <Row label="Current — payout cycles done" v={String(Math.floor(cur.winningDays250 / 5))} />
              <Row label="Optimized — payout cycles done" v={String(Math.floor(opt.winningDays250 / 5))} />
              <Row label="Current — days until next 5-day cycle" v={String(5 - (cur.winningDays250 % 5))} />
              <Row label="Optimized — days until next 5-day cycle" v={String(5 - (opt.winningDays250 % 5))} />
              <Row label="Current — best day" v={fmt$(cur.bestDay)} />
              <Row label="Current — worst day" v={fmt$(cur.worstDay)} />
              <Row label="Optimized — best day" v={fmt$(opt.bestDay)} />
              <Row label="Optimized — worst day" v={fmt$(opt.worstDay)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Backtest vs paper</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <Row label="Expected/theoretical P&L (Current)" v={fmt$(backtest.expectedCur)} />
              <Row label="Actual/paper P&L (Current)" v={fmt$(backtest.actualCur)} />
              <Row label="Actual − expected (Current)" v={fmt$(backtest.actualCur - backtest.expectedCur)} />
              <Row label="Average slippage ticks" v={backtest.avgSlipTicks.toFixed(2)} />
              <Row label="Number of missed trades" v={String(backtest.missed)} />
              <Row label="Number of rule errors" v={String(backtest.ruleErrors)} />
              <Row label="Number of late entries (HG 16:30)" v={String(backtest.lateEntries)} />
              <Row label="Manual overrides" v={String(backtest.manualOverrides)} />
            </CardContent>
          </Card>
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
  const bestDay = dayValues.length ? Math.max(...dayValues) : 0;
  const worstDay = dayValues.length ? Math.min(...dayValues) : 0;
  const winningDays250 = dayValues.filter((v) => v >= 250).length;

  // drawdown
  let peak = 0, eq = 0, dd = 0;
  const sorted = [...taken].sort((a, b) => (a.lucid_eod_day ?? "").localeCompare(b.lucid_eod_day ?? ""));
  for (const t of sorted) {
    eq += Number(side === "current" ? t.net_pnl_current : t.net_pnl_optimized) || 0;
    if (eq > peak) peak = eq;
    dd = Math.min(dd, eq - peak);
  }

  return {
    totalNet, totalGross, trades: taken.length,
    winRate: taken.length ? wins.length / taken.length : 0,
    profitFactor: Number.isFinite(profitFactor) ? profitFactor : 0,
    avgWin: wins.length ? sumWins / wins.length : 0,
    avgLoss: losses.length ? -sumLosses / losses.length : 0,
    bestTrade: pnls.length ? Math.max(...pnls) : 0,
    worstTrade: pnls.length ? Math.min(...pnls) : 0,
    bestDay, worstDay,
    maxDrawdown: dd,
    winningDays250,
  };
}

function groupByDay(trades: T[], side: "current" | "optimized"): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of trades) {
    const k = t.lucid_eod_day ?? t.date_et ?? "—";
    out[k] = (out[k] ?? 0) + (Number(side === "current" ? t.net_pnl_current : t.net_pnl_optimized) || 0);
  }
  return out;
}

function bySym(trades: T[]) {
  const out: Record<string, ReturnType<typeof emptySymStat>> = {};
  for (const sym of ["ES","YM","HG"] as const) {
    const sub = trades.filter((t) => t.symbol === sym && t.trade_status === "Taken");
    const pnlsC = sub.map((t) => Number(t.net_pnl_current) || 0);
    const pnlsO = sub.map((t) => Number(t.net_pnl_optimized) || 0);
    const wins = pnlsC.filter((p) => p > 0).length;
    const sumW = pnlsC.filter((p) => p > 0).reduce((a, b) => a + b, 0);
    const sumL = Math.abs(pnlsC.filter((p) => p < 0).reduce((a, b) => a + b, 0));
    const tickSize = TICK[sym].size;
    const slipTicks = sub
      .filter((t) => t.entry_price_actual != null && t.entry_price_theoretical != null)
      .map((t) => Math.abs(Number(t.entry_price_actual) - Number(t.entry_price_theoretical)) / tickSize);
    const diffs = sub
      .filter((t) => t.entry_price_actual != null && t.entry_price_theoretical != null)
      .map((t) => Number(t.entry_price_actual) - Number(t.entry_price_theoretical));
    out[sym] = {
      totalCur: pnlsC.reduce((a, b) => a + b, 0),
      totalOpt: pnlsO.reduce((a, b) => a + b, 0),
      trades: sub.length,
      winRate: sub.length ? wins / sub.length : 0,
      profitFactor: sumL === 0 ? (sumW > 0 ? 99 : 0) : sumW / sumL,
      avgSlipTicks: slipTicks.length ? slipTicks.reduce((a, b) => a + b, 0) / slipTicks.length : 0,
      avgActualMinusTheo: diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0,
      lateEntries: sym === "HG" ? trades.filter((t) => t.symbol === "HG" && t.entry_time_et === "16:30").length : 0,
      manualFlatten: sym === "HG" ? trades.filter((t) => t.symbol === "HG" && t.exit_reason === "manual_flatten_before_1645").length : 0,
    };
  }
  return out;
}

function emptySymStat() {
  return { totalCur: 0, totalOpt: 0, trades: 0, winRate: 0, profitFactor: 0, avgSlipTicks: 0, avgActualMinusTheo: 0, lateEntries: 0, manualFlatten: 0 };
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
  const map = new Map<string, { day: string; current?: number; optimized?: number }>();
  for (const x of a) map.set(x.day, { day: x.day, current: x.equity });
  for (const x of b) {
    const e = map.get(x.day) ?? { day: x.day };
    e.optimized = x.equity;
    map.set(x.day, e);
  }
  return [...map.values()].sort((x, y) => x.day.localeCompare(y.day));
}

function mergeDD(a: { day: string; equity: number }[], b: { day: string; equity: number }[]) {
  const ddSeries = (xs: { day: string; equity: number }[]) => {
    let peak = 0;
    return xs.map((p) => { peak = Math.max(peak, p.equity); return { day: p.day, dd: p.equity - peak }; });
  };
  const da = ddSeries(a), db = ddSeries(b);
  const map = new Map<string, { day: string; current?: number; optimized?: number }>();
  for (const x of da) map.set(x.day, { day: x.day, current: x.dd });
  for (const x of db) {
    const e = map.get(x.day) ?? { day: x.day };
    e.optimized = x.dd;
    map.set(x.day, e);
  }
  return [...map.values()].sort((x, y) => x.day.localeCompare(y.day));
}

function buildCompare(trades: T[]) {
  const c = computeStats(trades, "current").totalNet;
  const o = computeStats(trades, "optimized").totalNet;
  return { winner: c === o ? "tie" : c > o ? "current" : "optimized" };
}

function backtestVsPaper(trades: T[]) {
  const taken = trades.filter((t) => t.trade_status === "Taken");
  const expectedCur = taken.reduce((a, t) => a + (Number(t.gross_pnl_current) || 0), 0);
  const actualCur = taken.reduce((a, t) => a + (Number(t.net_pnl_current) || 0), 0);
  const slipTicks: number[] = [];
  for (const t of taken) {
    if (t.entry_price_actual != null && t.entry_price_theoretical != null) {
      const tickSize = TICK[t.symbol as keyof typeof TICK]?.size ?? 1;
      slipTicks.push(Math.abs(Number(t.entry_price_actual) - Number(t.entry_price_theoretical)) / tickSize);
    }
  }
  return {
    expectedCur, actualCur,
    avgSlipTicks: slipTicks.length ? slipTicks.reduce((a, b) => a + b, 0) / slipTicks.length : 0,
    missed: trades.filter((t) => t.trade_status === "Missed").length,
    ruleErrors: trades.filter((t) => t.rule_followed === false).length,
    lateEntries: trades.filter((t) => t.symbol === "HG" && t.entry_time_et === "16:30").length,
    manualOverrides: trades.filter((t) => t.exit_reason === "manual_flatten_before_1645").length,
  };
}

function CompareRow({ label, a, b, better }: { label: string; a: number; b: number; better: "high" | "low" }) {
  const aBetter = better === "high" ? a > b : a < b;
  return (
    <div className="rounded-md border bg-secondary/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="grid grid-cols-2 gap-2 mt-1 text-sm tabular-nums">
        <div className={aBetter ? "font-semibold text-success" : ""}>C: {fmt$(a)}</div>
        <div className={!aBetter && a !== b ? "font-semibold text-success" : ""}>O: {fmt$(b)}</div>
      </div>
    </div>
  );
}

function PortfolioStatsCard({ title, stats, accent }: { title: string; stats: Stats; accent: "primary" | "muted" }) {
  return (
    <Card className={accent === "primary" ? "border-primary/40" : ""}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Badge variant={accent === "primary" ? "default" : "secondary"}>{stats.trades} treidiä</Badge>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tabular-nums mb-3" style={{ color: stats.totalNet >= 0 ? "var(--success)" : "var(--destructive)" }}>
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
          <Row label="Winning days ≥ $250" v={String(stats.winningDays250)} />
          <Row label="Payout cycles done" v={String(Math.floor(stats.winningDays250 / 5))} />
        </div>
      </CardContent>
    </Card>
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

function DailyTable({ trades }: { trades: T[] }) {
  const days = useMemo(() => {
    const map = new Map<string, { current: number; optimized: number; ES: number; YM: number; HG: number }>();
    for (const t of trades.filter((x) => x.trade_status === "Taken")) {
      const k = t.lucid_eod_day ?? t.date_et ?? "—";
      const e = map.get(k) ?? { current: 0, optimized: 0, ES: 0, YM: 0, HG: 0 };
      e.current += Number(t.net_pnl_current) || 0;
      e.optimized += Number(t.net_pnl_optimized) || 0;
      const sym = t.symbol as "ES" | "YM" | "HG";
      e[sym] = (e[sym] ?? 0) + (Number(t.net_pnl_current) || 0);
      map.set(k, e);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [trades]);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Daily stats</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Lucid EOD</th>
                <th className="text-right px-3 py-2">Current</th>
                <th className="text-right px-3 py-2">Optimized</th>
                <th className="text-center px-3 py-2">≥$250 C/O</th>
                <th className="text-right px-3 py-2">ES</th>
                <th className="text-right px-3 py-2">YM</th>
                <th className="text-right px-3 py-2">HG</th>
              </tr>
            </thead>
            <tbody>
              {days.map(([day, v]) => (
                <tr key={day} className="border-t">
                  <td className="px-3 py-2">{day}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${v.current >= 0 ? "text-success" : "text-destructive"}`}>{fmt$(v.current)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${v.optimized >= 0 ? "text-success" : "text-destructive"}`}>{fmt$(v.optimized)}</td>
                  <td className="px-3 py-2 text-center">
                    {v.current >= 250 ? <Badge className="bg-success text-success-foreground hover:bg-success">C</Badge> : null}
                    {v.optimized >= 250 ? <Badge className="bg-success text-success-foreground hover:bg-success ml-1">O</Badge> : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt$(v.ES)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt$(v.YM)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt$(v.HG)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function fmt$(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  return (n >= 0 ? "+" : "") + "$" + n.toFixed(2);
}
