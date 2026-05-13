import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  STRATEGIES,
  TICK,
  computePnl,
  getStrategyForSymbol,
  type Symbol,
} from "@/lib/strategies";

export const Route = createFileRoute("/_authenticated/loki")({
  component: LokiPage,
});

type TradeRow = {
  id: string;
  date_et: string | null;
  lucid_eod_day: string | null;
  symbol: string;
  strategy_name: string | null;
  portfolio_version: string | null;
  trade_status: string | null;
  direction: string | null;
  current_qty: number | null;
  optimized_qty: number | null;
  signal_time_et: string | null;
  entry_time_et: string | null;
  exit_time_et: string | null;
  entry_price_theoretical: number | null;
  entry_price_actual: number | null;
  stop_price: number | null;
  target_price: number | null;
  exit_price_theoretical: number | null;
  exit_price_actual: number | null;
  exit_reason: string | null;
  gross_pnl_current: number | null;
  gross_pnl_optimized: number | null;
  net_pnl_current: number | null;
  net_pnl_optimized: number | null;
  commissions_current: number | null;
  commissions_optimized: number | null;
  estimated_slippage_current: number | null;
  estimated_slippage_optimized: number | null;
  rule_followed: boolean | null;
  rule_error_type: string | null;
  notes: string | null;
  gap_pct: number | null;
  body_pct: number | null;
  body_fraction: number | null;
};

const EXIT_REASONS = [
  "target", "stop", "max_hold", "manual_flatten_before_1645",
  "skipped_filter", "missed_fill", "rule_error",
];
const SKIP_REASONS = [
  "skipped_filter", "missed_fill", "late_entry", "no_confirmation",
  "gap_too_small", "previous_day_red_failed", "body_conditions_failed", "manual_skip", "other",
];
const STATUSES = ["Taken", "Skipped", "Missed", "Invalid"];
const PORTFOLIOS = ["Both", "Current V2", "Optimized V2"];
const DIRECTIONS = ["Long", "Short"];

function LokiPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TradeRow | null>(null);

  // filters
  const [fSymbol, setFSymbol] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fPortfolio, setFPortfolio] = useState("all");
  const [fExitReason, setFExitReason] = useState("all");
  const [fRuleFollowed, setFRuleFollowed] = useState("all");
  const [fRange, setFRange] = useState("all");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("date_et", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setTrades((data ?? []) as TradeRow[]);
  }

  useEffect(() => { if (user) load(); }, [user]);

  const filtered = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return trades.filter((t) => {
      if (fSymbol !== "all" && t.symbol !== fSymbol) return false;
      if (fStatus !== "all" && t.trade_status !== fStatus) return false;
      if (fPortfolio !== "all" && t.portfolio_version !== fPortfolio) return false;
      if (fExitReason !== "all" && t.exit_reason !== fExitReason) return false;
      if (fRuleFollowed !== "all") {
        const want = fRuleFollowed === "yes";
        if (t.rule_followed !== want) return false;
      }
      if (fRange !== "all" && t.date_et) {
        const d = new Date(t.date_et + "T00:00:00");
        const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
        if (fRange === "today" && diffDays !== 0) return false;
        if (fRange === "7" && diffDays > 7) return false;
        if (fRange === "30" && diffDays > 30) return false;
      }
      return true;
    });
  }, [trades, fSymbol, fStatus, fPortfolio, fExitReason, fRuleFollowed, fRange]);

  async function deleteTrade(id: string) {
    if (!confirm("Poistetaanko treidi?")) return;
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Poistettu");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Loki</h1>
          <p className="text-sm text-muted-foreground">Treidit, skipit ja virheet</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Uusi treidi / signaali</Button>
          </DialogTrigger>
          <TradeFormDialog
            initial={editing}
            onClose={() => { setOpen(false); setEditing(null); }}
            onSaved={() => { setOpen(false); setEditing(null); load(); }}
          />
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Suodattimet</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <FilterSelect label="Symboli" value={fSymbol} onChange={setFSymbol} options={["all","ES","YM","HG"]} />
          <FilterSelect label="Status" value={fStatus} onChange={setFStatus} options={["all", ...STATUSES]} />
          <FilterSelect label="Portfolio" value={fPortfolio} onChange={setFPortfolio} options={["all", ...PORTFOLIOS]} />
          <FilterSelect label="Exit" value={fExitReason} onChange={setFExitReason} options={["all", ...EXIT_REASONS]} />
          <FilterSelect label="Sääntö" value={fRuleFollowed} onChange={setFRuleFollowed} options={["all","yes","no"]} />
          <FilterSelect label="Aika" value={fRange} onChange={setFRange} options={["all","today","7","30"]} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Ladataan…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Ei treidejä — lisää ensimmäinen.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Pvm</th>
                    <th className="text-left px-3 py-2">Sym</th>
                    <th className="text-left px-3 py-2">Suunta</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Entry → Exit</th>
                    <th className="text-right px-3 py-2">P&amp;L Current</th>
                    <th className="text-right px-3 py-2">P&amp;L Optimized</th>
                    <th className="text-left px-3 py-2">Exit reason</th>
                    <th className="text-left px-3 py-2">Sääntö</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-t hover:bg-muted/20">
                      <td className="px-3 py-2 whitespace-nowrap">{t.date_et ?? "—"}</td>
                      <td className="px-3 py-2 font-mono">{t.symbol}</td>
                      <td className="px-3 py-2">{t.direction ?? "—"}</td>
                      <td className="px-3 py-2"><StatusBadge value={t.trade_status} /></td>
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                        {t.entry_price_actual ?? t.entry_price_theoretical ?? "—"} → {t.exit_price_actual ?? t.exit_price_theoretical ?? "—"}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums ${pnlColor(t.net_pnl_current)}`}>{fmt$(t.net_pnl_current)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${pnlColor(t.net_pnl_optimized)}`}>{fmt$(t.net_pnl_optimized)}</td>
                      <td className="px-3 py-2"><ExitBadge value={t.exit_reason} /></td>
                      <td className="px-3 py-2">{t.rule_followed === null ? "—" : t.rule_followed ? <Badge className="bg-success text-success-foreground hover:bg-success">OK</Badge> : <Badge variant="destructive">Virhe</Badge>}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(t); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteTrade(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  const labelMap: Record<string,string> = { all: "Kaikki", today: "Tänään", "7": "7 pv", "30": "30 pv", yes: "OK", no: "Virhe" };
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{labelMap[o] ?? o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function StatusBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const map: Record<string, string> = {
    Taken: "bg-success text-success-foreground",
    Skipped: "bg-muted text-muted-foreground",
    Missed: "bg-warning text-warning-foreground",
    Invalid: "bg-destructive text-destructive-foreground",
  };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${map[value] ?? "bg-muted"}`}>{value}</span>;
}

function ExitBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const map: Record<string, string> = {
    target: "bg-success/15 text-success border-success/30",
    stop: "bg-destructive/15 text-destructive border-destructive/30",
    max_hold: "bg-muted text-muted-foreground",
    manual_flatten_before_1645: "bg-warning/15 text-warning-foreground border-warning/40",
    rule_error: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs border ${map[value] ?? "bg-muted border-transparent"}`}>{value}</span>;
}

function fmt$(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  return (n >= 0 ? "+" : "") + "$" + n.toFixed(2);
}
function pnlColor(v: number | null | undefined) {
  if (v === null || v === undefined || Number(v) === 0) return "";
  return Number(v) > 0 ? "text-success" : "text-destructive";
}

// ----- form dialog -----

function TradeFormDialog({
  initial, onClose, onSaved,
}: { initial: TradeRow | null; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [symbol, setSymbol] = useState<Symbol>((initial?.symbol as Symbol) ?? "ES");
  const [strategy, setStrategy] = useState(initial?.strategy_name ?? getStrategyForSymbol((initial?.symbol as Symbol) ?? "ES").name);
  const [dateEt, setDateEt] = useState(initial?.date_et ?? today);
  const [lucidDay, setLucidDay] = useState(initial?.lucid_eod_day ?? today);
  const [status, setStatus] = useState(initial?.trade_status ?? "Taken");
  const [portfolio, setPortfolio] = useState(initial?.portfolio_version ?? "Both");
  const [direction, setDirection] = useState(initial?.direction ?? "Long");
  const [currentQty, setCurrentQty] = useState<number>(initial?.current_qty ?? getStrategyForSymbol((initial?.symbol as Symbol) ?? "ES").currentQty);
  const [optimizedQty, setOptimizedQty] = useState<number>(initial?.optimized_qty ?? getStrategyForSymbol((initial?.symbol as Symbol) ?? "ES").optimizedQty);
  const [signalTime, setSignalTime] = useState(initial?.signal_time_et ?? "");
  const [entryTime, setEntryTime] = useState(initial?.entry_time_et ?? getStrategyForSymbol((initial?.symbol as Symbol) ?? "ES").entryTimeEt);
  const [exitTime, setExitTime] = useState(initial?.exit_time_et ?? "");
  const [entryTheo, setEntryTheo] = useState<string>(initial?.entry_price_theoretical?.toString() ?? "");
  const [entryAct, setEntryAct] = useState<string>(initial?.entry_price_actual?.toString() ?? "");
  const [stopPrice, setStopPrice] = useState<string>(initial?.stop_price?.toString() ?? "");
  const [targetPrice, setTargetPrice] = useState<string>(initial?.target_price?.toString() ?? "");
  const [exitTheo, setExitTheo] = useState<string>(initial?.exit_price_theoretical?.toString() ?? "");
  const [exitAct, setExitAct] = useState<string>(initial?.exit_price_actual?.toString() ?? "");
  const [exitReason, setExitReason] = useState(initial?.exit_reason ?? "target");
  const [commCur, setCommCur] = useState<string>(initial?.commissions_current?.toString() ?? "0");
  const [commOpt, setCommOpt] = useState<string>(initial?.commissions_optimized?.toString() ?? "0");
  const [slipCur, setSlipCur] = useState<string>(initial?.estimated_slippage_current?.toString() ?? "0");
  const [slipOpt, setSlipOpt] = useState<string>(initial?.estimated_slippage_optimized?.toString() ?? "0");
  const [ruleFollowed, setRuleFollowed] = useState<string>(initial?.rule_followed === null || initial?.rule_followed === undefined ? "yes" : (initial.rule_followed ? "yes" : "no"));
  const [ruleErrorType, setRuleErrorType] = useState(initial?.rule_error_type ?? "");
  const [gapPct, setGapPct] = useState<string>(initial?.gap_pct?.toString() ?? "");
  const [bodyPct, setBodyPct] = useState<string>(initial?.body_pct?.toString() ?? "");
  const [bodyFrac, setBodyFrac] = useState<string>(initial?.body_fraction?.toString() ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  // when symbol changes (and not editing), autofill defaults
  useEffect(() => {
    if (initial) return;
    const s = getStrategyForSymbol(symbol);
    setStrategy(s.name);
    setCurrentQty(s.currentQty);
    setOptimizedQty(s.optimizedQty);
    setEntryTime(s.entryTimeEt);
  }, [symbol, initial]);

  const spec = getStrategyForSymbol(symbol);
  const tickInfo = TICK[symbol];

  // auto compute stop/target prices when entry actual changes
  useEffect(() => {
    const ep = parseFloat(entryAct || entryTheo || "");
    if (!isNaN(ep)) {
      if (direction === "Long") {
        if (!stopPrice) setStopPrice((ep - spec.stopPriceDistance).toString());
        if (!targetPrice) setTargetPrice((ep + spec.targetPriceDistance).toString());
      } else {
        if (!stopPrice) setStopPrice((ep + spec.stopPriceDistance).toString());
        if (!targetPrice) setTargetPrice((ep - spec.targetPriceDistance).toString());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryAct, entryTheo, direction, symbol]);

  // auto compute P&L
  const pnlPreview = useMemo(() => {
    const ep = parseFloat(entryAct || entryTheo || "");
    const xp = parseFloat(exitAct || exitTheo || "");
    if (isNaN(ep) || isNaN(xp)) return { gC: null as number | null, gO: null as number | null };
    const gC = computePnl(symbol, direction as "Long" | "Short", ep, xp, currentQty);
    const gO = computePnl(symbol, direction as "Long" | "Short", ep, xp, optimizedQty);
    return { gC, gO };
  }, [entryAct, entryTheo, exitAct, exitTheo, symbol, direction, currentQty, optimizedQty]);

  const isMonday = (() => {
    const d = dateEt ? new Date(dateEt + "T00:00:00") : new Date();
    return d.getDay() === 1;
  })();
  const mondayWarn = isMonday && (symbol === "ES" || symbol === "YM");
  const hgCutoffWarn = symbol === "HG" && entryTime === "16:30";

  async function save() {
    setSaving(true);
    const ep = parseFloat(entryAct || entryTheo || "");
    const xp = parseFloat(exitAct || exitTheo || "");
    const grossC = !isNaN(ep) && !isNaN(xp) ? computePnl(symbol, direction as "Long" | "Short", ep, xp, currentQty) : null;
    const grossO = !isNaN(ep) && !isNaN(xp) ? computePnl(symbol, direction as "Long" | "Short", ep, xp, optimizedQty) : null;

    const slipTicks = !isNaN(ep) && entryAct && entryTheo
      ? Math.abs(parseFloat(entryAct) - parseFloat(entryTheo)) / tickInfo.size
      : null;

    const payload = {
      date_et: dateEt || null,
      lucid_eod_day: lucidDay || null,
      symbol,
      strategy_name: strategy,
      portfolio_version: portfolio,
      trade_status: status,
      direction,
      current_qty: currentQty,
      optimized_qty: optimizedQty,
      signal_time_et: signalTime || null,
      entry_time_et: entryTime || null,
      exit_time_et: exitTime || null,
      entry_price_theoretical: numOrNull(entryTheo),
      entry_price_actual: numOrNull(entryAct),
      stop_price: numOrNull(stopPrice),
      target_price: numOrNull(targetPrice),
      exit_price_theoretical: numOrNull(exitTheo),
      exit_price_actual: numOrNull(exitAct),
      exit_reason: exitReason || null,
      gross_pnl_current: grossC,
      gross_pnl_optimized: grossO,
      commissions_current: numOrNull(commCur) ?? 0,
      commissions_optimized: numOrNull(commOpt) ?? 0,
      estimated_slippage_current: numOrNull(slipCur) ?? 0,
      estimated_slippage_optimized: numOrNull(slipOpt) ?? 0,
      net_pnl_current: grossC !== null ? grossC - (numOrNull(commCur) ?? 0) - (numOrNull(slipCur) ?? 0) : null,
      net_pnl_optimized: grossO !== null ? grossO - (numOrNull(commOpt) ?? 0) - (numOrNull(slipOpt) ?? 0) : null,
      slippage_ticks: slipTicks,
      rule_followed: ruleFollowed === "yes",
      rule_error_type: ruleErrorType || null,
      gap_pct: numOrNull(gapPct),
      body_pct: numOrNull(bodyPct),
      body_fraction: numOrNull(bodyFrac),
      notes: notes || null,
    };

    let error;
    if (initial) {
      ({ error } = await supabase.from("trades").update(payload).eq("id", initial.id));
    } else {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setSaving(false); return toast.error("Et ole kirjautunut"); }
      ({ error } = await supabase.from("trades").insert({ ...payload, user_id: u.user.id }));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(initial ? "Päivitetty" : "Tallennettu");
    onSaved();
  }

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{initial ? "Muokkaa treidiä" : "Uusi treidi / signaali"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Symbol + strategy auto-fill section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Symboli">
            <Select value={symbol} onValueChange={(v) => setSymbol(v as Symbol)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STRATEGIES.map((s) => <SelectItem key={s.symbol} value={s.symbol}>{s.symbol}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Portfolio">
            <Select value={portfolio} onValueChange={setPortfolio}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PORTFOLIOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Suunta">
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DIRECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        {/* Auto-fill summary */}
        <div className="rounded-md bg-secondary/40 p-3 text-xs space-y-1">
          <div className="font-mono font-semibold">{spec.name}</div>
          <div className="text-muted-foreground">
            Current ×{spec.currentQty} · Optimized ×{spec.optimizedQty} · Stop {spec.stopTicks}t ({spec.stopPriceDistance}) · Target {spec.targetTicks}t ({spec.targetPriceDistance}) · Entry {spec.entryTimeEt} ET · Session {spec.helsinkiWindow}
          </div>
        </div>

        {mondayWarn && (
          <Warn>No trade: ES/YM eivät treidaa maanantaisin.</Warn>
        )}
        {hgCutoffWarn && (
          <Warn>Cutoff risk: jos vielä auki 16:43–16:44 ET, sulje manuaalisesti ennen Lucid 16:45 ET cutoffia. Kirjaa exit_reason = manual_flatten_before_1645.</Warn>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Date (ET)"><Input type="date" value={dateEt} onChange={(e) => setDateEt(e.target.value)} /></Field>
          <Field label="Lucid EOD day"><Input type="date" value={lucidDay} onChange={(e) => setLucidDay(e.target.value)} /></Field>
          <Field label="Current qty"><Input type="number" value={currentQty} onChange={(e) => setCurrentQty(parseInt(e.target.value || "0"))} /></Field>
          <Field label="Optimized qty"><Input type="number" value={optimizedQty} onChange={(e) => setOptimizedQty(parseInt(e.target.value || "0"))} /></Field>
          <Field label="Signal time ET"><Input value={signalTime} onChange={(e) => setSignalTime(e.target.value)} placeholder="09:30" /></Field>
          <Field label="Entry time ET"><Input value={entryTime} onChange={(e) => setEntryTime(e.target.value)} placeholder="10:00" /></Field>
          <Field label="Exit time ET"><Input value={exitTime} onChange={(e) => setExitTime(e.target.value)} placeholder="11:00" /></Field>
          <Field label="Gap %"><Input type="number" step="0.01" value={gapPct} onChange={(e) => setGapPct(e.target.value)} /></Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Entry — theoretical"><Input type="number" step="any" value={entryTheo} onChange={(e) => setEntryTheo(e.target.value)} /></Field>
          <Field label="Entry — actual (paper)"><Input type="number" step="any" value={entryAct} onChange={(e) => setEntryAct(e.target.value)} /></Field>
          <Field label="Stop"><Input type="number" step="any" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} /></Field>
          <Field label="Target"><Input type="number" step="any" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} /></Field>
          <Field label="Exit — theoretical"><Input type="number" step="any" value={exitTheo} onChange={(e) => setExitTheo(e.target.value)} /></Field>
          <Field label="Exit — actual (paper)"><Input type="number" step="any" value={exitAct} onChange={(e) => setExitAct(e.target.value)} /></Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Exit reason">
            <Select value={exitReason} onValueChange={setExitReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(status === "Skipped" ? SKIP_REASONS : EXIT_REASONS).map((r) =>
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Comm. Current ($)"><Input type="number" step="0.01" value={commCur} onChange={(e) => setCommCur(e.target.value)} /></Field>
          <Field label="Comm. Optimized ($)"><Input type="number" step="0.01" value={commOpt} onChange={(e) => setCommOpt(e.target.value)} /></Field>
          <Field label="Slip $ Current"><Input type="number" step="0.01" value={slipCur} onChange={(e) => setSlipCur(e.target.value)} /></Field>
          <Field label="Slip $ Optimized"><Input type="number" step="0.01" value={slipOpt} onChange={(e) => setSlipOpt(e.target.value)} /></Field>
          <Field label="Rule followed">
            <Select value={ruleFollowed} onValueChange={setRuleFollowed}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Kyllä</SelectItem>
                <SelectItem value="no">Ei</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Rule error type"><Input value={ruleErrorType} onChange={(e) => setRuleErrorType(e.target.value)} placeholder="late_entry, wrong_size, …" /></Field>
        </div>

        {symbol === "HG" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Body %"><Input type="number" step="0.01" value={bodyPct} onChange={(e) => setBodyPct(e.target.value)} /></Field>
            <Field label="Body fraction"><Input type="number" step="0.01" value={bodyFrac} onChange={(e) => setBodyFrac(e.target.value)} /></Field>
          </div>
        )}

        <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></Field>

        {(pnlPreview.gC !== null || pnlPreview.gO !== null) && (
          <div className="rounded-md border p-3 bg-secondary/30 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Gross P&amp;L Current</div>
              <div className={`text-lg font-semibold tabular-nums ${pnlColor(pnlPreview.gC)}`}>{fmt$(pnlPreview.gC)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Gross P&amp;L Optimized</div>
              <div className={`text-lg font-semibold tabular-nums ${pnlColor(pnlPreview.gO)}`}>{fmt$(pnlPreview.gO)}</div>
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Peruuta</Button>
        <Button onClick={save} disabled={saving}>{saving ? "Tallennetaan…" : "Tallenna"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start text-sm rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-destructive">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function numOrNull(v: string): number | null {
  if (v === "" || v === undefined || v === null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}
