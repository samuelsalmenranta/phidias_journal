import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, ReferenceLine,
} from "recharts";
import {
  STRATEGIES, ACCOUNT_STRUCTURES, DEFAULT_ACCOUNT_STRUCTURE,
  EXPECTED_RETURNS, PHIDIAS_RULES, runPhidiasTests,
  type AccountStructure,
} from "@/lib/strategies";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tulokset")({
  component: ResultsPage,
});

type T = {
  id: string;
  date_et: string | null;
  leg_id: string | null;
  phase: string | null;
  symbol: string;
  family: string | null;
  trade_status: string | null;
  direction: string | null;
  exit_reason: string | null;
  qty: number | null;
  entry_time_et: string | null;
  exit_time_et: string | null;
  signal_time_et: string | null;
  net_pnl_current: number | null;
  gross_pnl_current: number | null;
  theoretical_pnl: number | null;
  actual_pnl: number | null;
  actual_minus_theoretical: number | null;
  commissions_current: number | null;
  slippage_est: number | null;
  rule_followed: boolean | null;
  rule_error_type: string | null;
  entry_price_actual: number | null;
  entry_price_theoretical: number | null;
};

const VOL_REGIMES = ["unknown", "low", "mid", "high"] as const;

function ResultsPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [accStruct, setAccStruct] = useState<AccountStructure>(DEFAULT_ACCOUNT_STRUCTURE);
  const [volRegime, setVolRegime] = useState<string>("unknown");
  const [paperStart, setPaperStart] = useState<string>(() =>
    typeof localStorage !== "undefined" && localStorage.getItem("phidias_paper_start") || "");

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("phidias_paper_start", paperStart);
    }
  }, [paperStart]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("trades")
        .select("id,date_et,leg_id,phase,symbol,family,trade_status,direction,exit_reason,qty,entry_time_et,exit_time_et,signal_time_et,net_pnl_current,gross_pnl_current,theoretical_pnl,actual_pnl,actual_minus_theoretical,commissions_current,slippage_est,rule_followed,rule_error_type,entry_price_actual,entry_price_theoretical")
        .order("date_et", { ascending: true });
      setTrades((data ?? []) as unknown as T[]);
      setLoading(false);
    })();
  }, [user]);

  const struct = ACCOUNT_STRUCTURES.find((s) => s.id === accStruct)!;
  const taken = useMemo(() => trades.filter((t) => t.trade_status === "taken"), [trades]);

  const portfolio = useMemo(() => computePortfolio(taken), [taken]);
  const equity = useMemo(() => equityCurve(taken), [taken]);
  const dailyAgg = useMemo(() => dailyPnl(taken), [taken]);
  const perLeg = useMemo(() => perLegStats(trades), [trades]);
  const execStats = useMemo(() => executionStats(trades), [trades]);

  const calendarDays = paperStart
    ? Math.max(0, Math.floor((Date.now() - new Date(paperStart + "T00:00:00Z").getTime()) / 86400000))
    : 0;

  const dailyValues = dailyAgg.map((d) => d.pnl);
  const worstDay = dailyValues.length ? Math.min(...dailyValues) : 0;
  const eodTrailingDD = computeEodTrailingDD(equity);

  // Pause-rule evaluation
  const portfolioPF = portfolio.profitFactor;
  const pauses: { level: "info" | "warn" | "fatal"; msg: string }[] = [];
  if (portfolio.totalNet <= -struct.totalDrawdown) {
    pauses.push({ level: "fatal", msg: `Cumulative net ${fmt$(portfolio.totalNet)} ≤ −${fmt$(struct.totalDrawdown)} → PAUSE koko sleeve.` });
  }
  if (worstDay <= -struct.totalDrawdown) {
    pauses.push({ level: "fatal", msg: `Yksittäinen päivä ${fmt$(worstDay)} ≤ −${fmt$(struct.totalDrawdown)} → PAUSE.` });
  }
  if (taken.length >= 10 && portfolioPF < 0.90) {
    pauses.push({ level: "warn", msg: `Portfolion PF ${portfolioPF.toFixed(2)} < 0.90 → tutki ja paussi.` });
  }
  const hardFlatViolations = trades.filter((t) => t.exit_time_et && t.exit_time_et > "16:45").length;
  if (hardFlatViolations > 0) {
    pauses.push({ level: "warn", msg: `${hardFlatViolations} treidiä → exit > 16:45 ET.` });
  }

  // Funded eligibility
  let eligibility: "not_enough" | "review" | "pause" | "kill_review" = "not_enough";
  if (calendarDays >= 60 && taken.length >= 30) eligibility = "review";
  if (pauses.some((p) => p.level === "warn")) eligibility = "pause";
  if (pauses.some((p) => p.level === "fatal")) eligibility = "kill_review";

  if (loading) return <div className="text-sm text-muted-foreground">Ladataan…</div>;

  return (
    <div className="space-y-6">
      {/* Phidias context header */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Phidias Risk Bounded — paper-shadow konteksti</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Account structure</Label>
            <Select value={accStruct} onValueChange={(v) => setAccStruct(v as AccountStructure)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_STRUCTURES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="text-[11px] text-muted-foreground mt-1">
              Yht. DD ${struct.totalDrawdown.toLocaleString()} · Eval target ${struct.totalEvalTarget.toLocaleString()}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Volatility regime</Label>
            <Select value={volRegime} onValueChange={setVolRegime}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VOL_REGIMES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="text-[11px] text-muted-foreground mt-1">
              Mediaani: low {EXPECTED_RETURNS.volRegime.low} · mid {EXPECTED_RETURNS.volRegime.mid} · high {EXPECTED_RETURNS.volRegime.high}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Paper-shadow alku (pvm)</Label>
            <input type="date" value={paperStart} onChange={(e) => setPaperStart(e.target.value)}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm" />
            <div className="text-[11px] text-muted-foreground mt-1">
              {calendarDays} kalenteripäivää · {taken.length}/30 treidiä tarvitaan ennen funded-review
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {pauses.length > 0 && (
        <div className="space-y-2">
          {pauses.map((p, i) => <Alert key={i} tone={p.level === "fatal" ? "destructive" : "warning"}>{p.msg}</Alert>)}
        </div>
      )}

      {/* Top summary cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Paper-shadow summary</span>
              <EligibilityBadge value={eligibility} />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <Row label="Total trades (taken)" v={String(taken.length)} />
            <Row label="Calendar days" v={String(calendarDays)} />
            <Row label="Funded-review portti" v={"≥ 60–90 päivää AND ≥ 30 treidiä"} />
            <Row label="Status" v={
              eligibility === "not_enough" ? "Not enough data"
                : eligibility === "review" ? "Eligible for review"
                  : eligibility === "pause" ? "Pause"
                    : "Kill review"
            } />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Portfolio PnL</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div className={`text-2xl font-bold tabular-nums mb-2 ${portfolio.totalNet >= 0 ? "text-success" : "text-destructive"}`}>
              {fmt$(portfolio.totalNet)}
            </div>
            <div className="grid grid-cols-2 gap-y-1 gap-x-4">
              <Row label="Gross" v={fmt$(portfolio.totalGross)} />
              <Row label="Profit factor" v={portfolio.profitFactor.toFixed(2)} />
              <Row label="Win rate" v={`${(portfolio.winRate * 100).toFixed(1)}%`} />
              <Row label="Avg win" v={fmt$(portfolio.avgWin)} />
              <Row label="Avg loss" v={fmt$(portfolio.avgLoss)} />
              <Row label="Best trade" v={fmt$(portfolio.bestTrade)} />
              <Row label="Worst trade" v={fmt$(portfolio.worstTrade)} />
              <Row label="Best day" v={fmt$(portfolio.bestDay)} />
              <Row label="Worst day" v={fmt$(portfolio.worstDay)} />
              <Row label="Max drawdown" v={fmt$(portfolio.maxDrawdown)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Account / Risk</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <Row label="Selected structure" v={struct.label} />
            <Row label="100K drawdown" v={`$${PHIDIAS_RULES.drawdown["100K"].toLocaleString()}`} />
            <Row label="150K drawdown" v={`$${PHIDIAS_RULES.drawdown["150K"].toLocaleString()}`} />
            <Row label="Worst day vs sleeve DD" v={`${fmt$(worstDay)} / −$${struct.totalDrawdown.toLocaleString()}`} />
            <Row label="EOD trailing DD (current)" v={fmt$(eodTrailingDD)} />
            <Row label="Hard flat 16:45 violations" v={String(hardFlatViolations)} />
            <Row label="DLL" v="ei (Phidias)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Phidias evaluation / funded</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <Row label="100K eval target" v={`$${PHIDIAS_RULES.evalTarget["100K"].toLocaleString()}`} />
            <Row label="150K eval target" v={`$${PHIDIAS_RULES.evalTarget["150K"].toLocaleString()}`} />
            <Row label="Eval consistency" v={`${PHIDIAS_RULES.evaluationConsistency * 100}%`} />
            <Row label="Funded consistency" v={`${PHIDIAS_RULES.fundedConsistency * 100}%`} />
            <Row label="Payout interval" v={`${PHIDIAS_RULES.payoutIntervalDays} päivää`} />
            <Row label="Progressive splits" v={PHIDIAS_RULES.payoutSplits.map((s) => `${s * 100}%`).join(" → ")} />
            <Row label="Funded note" v={PHIDIAS_RULES.fundedDrawdownNote} />
            <Row label="Sleeve eval target" v={`$${struct.totalEvalTarget.toLocaleString()}`} />
            <Row label="Sleeve net progress" v={fmt$(portfolio.totalNet)} />
          </CardContent>
        </Card>
      </div>

      {/* Volatility */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Volatility regime context</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <Row label="Realistic monthly" v={EXPECTED_RETURNS.realisticMonthly} />
          <Row label="Full-history median" v={EXPECTED_RETURNS.fullHistoryMedian} />
          <Row label="p10 / p90" v={`${EXPECTED_RETURNS.p10} / ${EXPECTED_RETURNS.p90}`} />
          <Row label="Holdout median" v={EXPECTED_RETURNS.holdout} />
          <div className="text-xs italic text-warning mt-2">{EXPECTED_RETURNS.warning}</div>
          <div className="text-xs italic text-muted-foreground mt-1">{EXPECTED_RETURNS.volatilityMessage}</div>
          <div className="text-[11px] text-muted-foreground italic mt-1">{EXPECTED_RETURNS.disclaimer}</div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="legs">Per-leg & Kill rules</TabsTrigger>
          <TabsTrigger value="exec">Execution & QA</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Equity curve</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={equity}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  <ReferenceLine y={-struct.totalDrawdown} stroke="hsl(var(--destructive))" strokeDasharray="3 3"
                    label={{ value: `Sleeve DD −$${struct.totalDrawdown.toLocaleString()}`, fontSize: 10, fill: "hsl(var(--destructive))" }} />
                  <Line dataKey="equity" name="Net" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Daily P&amp;L</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyAgg}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  <Bar dataKey="pnl" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legs" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-3">
            {STRATEGIES.map((s) => {
              const v = perLeg[s.id] ?? emptyLegStat();
              const rolling10Avg = v.trades > 0 ? v.rolling10Sum / Math.min(v.trades, 10) : 0;
              const rolling10Pf = v.rolling10PF;
              const hardKill = v.netTotal <= s.killRule.hardKillNet;
              const streakKill = v.currentLosingStreak >= s.killRule.losingStreak;
              const alert = rolling10Avg <= 0 || hardKill || streakKill;
              return (
                <Card key={s.id} className={alert ? "border-destructive/50" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-mono">{s.id}</CardTitle>
                        <div className="text-[11px] text-muted-foreground font-mono">{s.symbol} · {s.family}</div>
                      </div>
                      {alert ? <Badge variant="destructive">ALERT</Badge> : <Badge variant="secondary">OK</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <Row label="Trades" v={String(v.trades)} />
                    <Row label="Net total" v={fmt$(v.netTotal)} />
                    <Row label="Profit factor" v={v.pf.toFixed(2)} />
                    <Row label="Win rate" v={`${(v.winRate * 100).toFixed(1)}%`} />
                    <Row label="Avg trade" v={fmt$(v.avgTrade)} />
                    <Row label="Rolling-10 avg" v={fmt$(rolling10Avg)} />
                    <Row label="Rolling-10 PF" v={rolling10Pf.toFixed(2)} />
                    <Row label="Current losing streak" v={String(v.currentLosingStreak)} />
                    <div className="border-t mt-2 pt-2 text-[11px] text-muted-foreground space-y-0.5">
                      <Row label="Alert threshold (rolling10 avg)" v={s.killRule.rolling10Alert.toString()} />
                      <Row label="Hard-kill net" v={`$${s.killRule.hardKillNet}`} />
                      <Row label="Losing-streak kill" v={String(s.killRule.losingStreak)} />
                      <div className="pt-1">
                        Status:{" "}
                        {hardKill && <span className="text-destructive">hard-kill breach · </span>}
                        {streakKill && <span className="text-destructive">streak breach · </span>}
                        {rolling10Avg < s.killRule.rolling10Alert && v.trades >= 10 && <span className="text-warning">rolling alert</span>}
                        {!hardKill && !streakKill && v.trades < 10 && <span>collecting data</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="exec" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Execution dashboard</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <Row label="Theoretical PnL (sum)" v={fmt$(execStats.theoretical)} />
              <Row label="Actual PnL (sum)" v={fmt$(execStats.actual)} />
              <Row label="Δ Actual − theoretical" v={fmt$(execStats.actualMinusTheo)} />
              <Row label="Slippage est. total" v={fmt$(execStats.slippage)} />
              <Row label="Commissions total" v={fmt$(execStats.commissions)} />
              <Row label="Rule errors" v={String(execStats.ruleErrors)} />
              <Row label="Late entries" v={String(execStats.lateEntries)} />
              <Row label="Wrong side" v={String(execStats.wrongSide)} />
              <Row label="Wrong size" v={String(execStats.wrongSize)} />
              <Row label="Entry at signal close warnings" v={String(execStats.entryAtSignalClose)} />
              <Row label="Exits after 16:45 ET" v={String(execStats.exitAfter1645)} />
              <Row label="Hard flat compliance" v={`${execStats.totalExits === 0 ? "—" : `${((1 - execStats.exitAfter1645 / Math.max(1, execStats.totalExits)) * 100).toFixed(1)}%`}`} />
            </CardContent>
          </Card>

          <TestRunner />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===== helpers =====

function computePortfolio(taken: T[]) {
  const pnls = taken.map((t) => Number(t.net_pnl_current ?? t.actual_pnl) || 0);
  const gross = taken.map((t) => Number(t.gross_pnl_current) || 0);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const totalNet = pnls.reduce((a, b) => a + b, 0);
  const totalGross = gross.reduce((a, b) => a + b, 0);
  const sumW = wins.reduce((a, b) => a + b, 0);
  const sumL = Math.abs(losses.reduce((a, b) => a + b, 0));
  const profitFactor = sumL === 0 ? (sumW > 0 ? 99 : 0) : sumW / sumL;
  const daily = dailyPnl(taken).map((d) => d.pnl);
  // max DD
  let eq = 0, peak = 0, dd = 0;
  const sorted = [...taken].sort((a, b) => (a.date_et ?? "").localeCompare(b.date_et ?? ""));
  for (const t of sorted) {
    eq += Number(t.net_pnl_current ?? t.actual_pnl) || 0;
    if (eq > peak) peak = eq;
    dd = Math.min(dd, eq - peak);
  }
  return {
    totalNet, totalGross,
    profitFactor,
    winRate: pnls.length ? wins.length / pnls.length : 0,
    avgWin: wins.length ? sumW / wins.length : 0,
    avgLoss: losses.length ? -sumL / losses.length : 0,
    bestTrade: pnls.length ? Math.max(...pnls) : 0,
    worstTrade: pnls.length ? Math.min(...pnls) : 0,
    bestDay: daily.length ? Math.max(...daily) : 0,
    worstDay: daily.length ? Math.min(...daily) : 0,
    maxDrawdown: dd,
  };
}

function dailyPnl(taken: T[]): { day: string; pnl: number }[] {
  const m = new Map<string, number>();
  for (const t of taken) {
    const k = t.date_et ?? "—";
    m.set(k, (m.get(k) ?? 0) + (Number(t.net_pnl_current ?? t.actual_pnl) || 0));
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, pnl]) => ({ day, pnl }));
}

function equityCurve(taken: T[]) {
  const daily = dailyPnl(taken);
  let eq = 0;
  return daily.map((d) => { eq += d.pnl; return { day: d.day, equity: eq }; });
}

function computeEodTrailingDD(eq: { day: string; equity: number }[]): number {
  let peak = 0, dd = 0;
  for (const p of eq) { peak = Math.max(peak, p.equity); dd = Math.min(dd, p.equity - peak); }
  return dd;
}

function emptyLegStat() {
  return {
    trades: 0, netTotal: 0, pf: 0, winRate: 0, avgTrade: 0,
    rolling10Sum: 0, rolling10PF: 0, currentLosingStreak: 0,
  };
}

function perLegStats(trades: T[]): Record<string, ReturnType<typeof emptyLegStat>> {
  const out: Record<string, ReturnType<typeof emptyLegStat>> = {};
  for (const s of STRATEGIES) {
    const sub = trades
      .filter((t) => t.leg_id === s.id && t.trade_status === "taken")
      .sort((a, b) => (a.date_et ?? "").localeCompare(b.date_et ?? ""));
    const pnls = sub.map((t) => Number(t.net_pnl_current ?? t.actual_pnl) || 0);
    const wins = pnls.filter((p) => p > 0);
    const losses = pnls.filter((p) => p < 0);
    const sumW = wins.reduce((a, b) => a + b, 0);
    const sumL = Math.abs(losses.reduce((a, b) => a + b, 0));
    const last10 = pnls.slice(-10);
    const last10W = last10.filter((p) => p > 0).reduce((a, b) => a + b, 0);
    const last10L = Math.abs(last10.filter((p) => p < 0).reduce((a, b) => a + b, 0));
    let streak = 0;
    for (let i = pnls.length - 1; i >= 0; i--) {
      if (pnls[i] < 0) streak++;
      else break;
    }
    out[s.id] = {
      trades: sub.length,
      netTotal: pnls.reduce((a, b) => a + b, 0),
      pf: sumL === 0 ? (sumW > 0 ? 99 : 0) : sumW / sumL,
      winRate: pnls.length ? wins.length / pnls.length : 0,
      avgTrade: pnls.length ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0,
      rolling10Sum: last10.reduce((a, b) => a + b, 0),
      rolling10PF: last10L === 0 ? (last10W > 0 ? 99 : 0) : last10W / last10L,
      currentLosingStreak: streak,
    };
  }
  return out;
}

function executionStats(trades: T[]) {
  const theoretical = trades.reduce((a, t) => a + (Number(t.theoretical_pnl) || 0), 0);
  const actual = trades.reduce((a, t) => a + (Number(t.actual_pnl ?? t.net_pnl_current) || 0), 0);
  const slippage = trades.reduce((a, t) => a + (Number(t.slippage_est) || 0), 0);
  const commissions = trades.reduce((a, t) => a + (Number(t.commissions_current) || 0), 0);
  const ruleErrors = trades.filter((t) => t.rule_followed === false).length;
  const exitAfter1645 = trades.filter((t) => t.exit_time_et && t.exit_time_et > "16:45").length;
  const totalExits = trades.filter((t) => t.exit_time_et).length;
  return {
    theoretical, actual, actualMinusTheo: actual - theoretical,
    slippage, commissions,
    ruleErrors,
    lateEntries: trades.filter((t) => t.rule_error_type === "late_entry").length,
    wrongSide: trades.filter((t) => t.rule_error_type === "wrong_side").length,
    wrongSize: trades.filter((t) => t.rule_error_type === "wrong_size").length,
    entryAtSignalClose: trades.filter((t) =>
      t.rule_error_type === "entry_at_signal_close"
      || (t.signal_time_et && t.entry_time_et && t.signal_time_et === t.entry_time_et)
    ).length,
    exitAfter1645,
    totalExits,
  };
}

function EligibilityBadge({ value }: { value: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    not_enough: { cls: "bg-muted text-muted-foreground", label: "Not enough data" },
    review: { cls: "bg-success text-success-foreground", label: "Eligible for review" },
    pause: { cls: "bg-warning text-warning-foreground", label: "Pause" },
    kill_review: { cls: "bg-destructive text-destructive-foreground", label: "Kill review" },
  };
  const v = map[value];
  return <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-medium ${v.cls}`}>{v.label}</span>;
}

function TestRunner() {
  const [results, setResults] = useState<ReturnType<typeof runPhidiasTests> | null>(null);
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Self-tests (PnL & signaali)</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setResults(runPhidiasTests())}>Suorita testit</Button>
      </CardHeader>
      <CardContent>
        {!results ? (
          <div className="text-xs text-muted-foreground">Paina &ldquo;Suorita testit&rdquo; ajaaksesi PnL- ja signaalitestit.</div>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {results.map((r) => (
              <li key={r.name} className="flex items-start gap-2">
                {r.pass
                  ? <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  : <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{r.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
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
