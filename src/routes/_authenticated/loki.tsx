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
  STRATEGIES, TICK, getStrategy,
  computeGrossPnl, computeCommission, computeThresholds, evaluateSignal,
  type Symbol,
} from "@/lib/strategies";

export const Route = createFileRoute("/_authenticated/loki")({
  component: LokiPage,
});

type TradeRow = {
  id: string;
  date_et: string | null;
  leg_id: string | null;
  phase: string | null;
  account_structure: string | null;
  account_label: string | null;
  symbol: string;
  timeframe: string | null;
  session_name: string | null;
  family: string | null;
  trade_status: string | null;
  direction: string | null;
  qty: number | null;
  signal_time_et: string | null;
  entry_time_et: string | null;
  exit_time_et: string | null;
  signal_close: number | null;
  entry_price_theoretical: number | null;
  entry_price_actual: number | null;
  exit_price_theoretical: number | null;
  exit_price_actual: number | null;
  atr_period: number | null;
  atr_value: number | null;
  stop_multiple: number | null;
  target_multiple: number | null;
  stop_price: number | null;
  target_price: number | null;
  time_exit_time: string | null;
  hard_flat_relevant: boolean | null;
  exit_reason: string | null;
  prev_high: number | null;
  prev_low: number | null;
  prev_close: number | null;
  overnight_high: number | null;
  overnight_low: number | null;
  r4: number | null;
  s4: number | null;
  upper_threshold: number | null;
  lower_threshold: number | null;
  distance: number | null;
  distance_threshold: number | null;
  commissions_current: number | null;
  slippage_est: number | null;
  gross_pnl_current: number | null;
  net_pnl_current: number | null;
  theoretical_pnl: number | null;
  actual_pnl: number | null;
  actual_minus_theoretical: number | null;
  rule_followed: boolean | null;
  rule_error_type: string | null;
  notes: string | null;
};

const STATUS_OPTIONS = ["taken", "missed", "invalid", "skipped", "rule_error"];
const PHASE_OPTIONS  = ["paper_shadow", "evaluation", "funded"];
const ACCOUNT_STRUCTURES = ["1x100K", "1x150K", "2x150K+1x100K", "5x100K"];
const DIRECTION_OPTIONS = ["long", "short", "none"];
const EXIT_REASONS = [
  "target", "stop", "time_exit", "hard_flat_1645",
  "manual_flatten", "missed", "invalid", "rule_error",
];
const RULE_ERROR_TYPES = [
  "", "late_entry", "wrong_side", "wrong_size", "entry_at_signal_close",
  "exit_after_1645", "atr_period_mismatch", "other",
];

function LokiPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TradeRow | null>(null);

  // filters
  const [fLeg, setFLeg] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fPhase, setFPhase] = useState("all");
  const [fExit, setFExit] = useState("all");
  const [fRule, setFRule] = useState("all");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("date_et", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setTrades((data ?? []) as unknown as TradeRow[]);
  }

  useEffect(() => { if (user) load(); }, [user]);

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (fLeg !== "all" && t.leg_id !== fLeg) return false;
      if (fStatus !== "all" && t.trade_status !== fStatus) return false;
      if (fPhase !== "all" && t.phase !== fPhase) return false;
      if (fExit !== "all" && t.exit_reason !== fExit) return false;
      if (fRule !== "all") {
        const want = fRule === "yes";
        if (t.rule_followed !== want) return false;
      }
      return true;
    });
  }, [trades, fLeg, fStatus, fPhase, fExit, fRule]);

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
          <p className="text-sm text-muted-foreground">Phidias risk_bounded — paper-shadow treidit</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog
            open={open}
            onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => { setEditing(null); setOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />Uusi treidi
              </Button>
            </DialogTrigger>
            <TradeFormDialog
              initial={editing}
              onClose={() => { setOpen(false); setEditing(null); }}
              onSaved={() => { setOpen(false); setEditing(null); load(); }}
            />
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Suodattimet</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <FilterSelect label="Jalka" value={fLeg} onChange={setFLeg}
            options={["all", ...STRATEGIES.map((s) => s.id)]} />
          <FilterSelect label="Status" value={fStatus} onChange={setFStatus}
            options={["all", ...STATUS_OPTIONS]} />
          <FilterSelect label="Vaihe" value={fPhase} onChange={setFPhase}
            options={["all", ...PHASE_OPTIONS]} />
          <FilterSelect label="Exit" value={fExit} onChange={setFExit}
            options={["all", ...EXIT_REASONS]} />
          <FilterSelect label="Sääntö" value={fRule} onChange={setFRule}
            options={["all", "yes", "no"]} />
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
                    <th className="text-left px-3 py-2">Jalka</th>
                    <th className="text-left px-3 py-2">Sym</th>
                    <th className="text-left px-3 py-2">Dir</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Entry → Exit</th>
                    <th className="text-right px-3 py-2">Theo</th>
                    <th className="text-right px-3 py-2">Net</th>
                    <th className="text-right px-3 py-2">Δ</th>
                    <th className="text-left px-3 py-2">Exit</th>
                    <th className="text-left px-3 py-2">Sääntö</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-t hover:bg-muted/20">
                      <td className="px-3 py-2 whitespace-nowrap">{t.date_et ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-[11px]">{t.leg_id ?? "—"}</td>
                      <td className="px-3 py-2 font-mono">{t.symbol}</td>
                      <td className="px-3 py-2">{t.direction ?? "—"}</td>
                      <td className="px-3 py-2"><StatusBadge value={t.trade_status} /></td>
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                        {t.entry_price_actual ?? t.entry_price_theoretical ?? "—"} → {t.exit_price_actual ?? t.exit_price_theoretical ?? "—"}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums ${pnlColor(t.theoretical_pnl)}`}>{fmt$(t.theoretical_pnl)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${pnlColor(t.actual_pnl ?? t.net_pnl_current)}`}>{fmt$(t.actual_pnl ?? t.net_pnl_current)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${pnlColor(t.actual_minus_theoretical)}`}>{fmt$(t.actual_minus_theoretical)}</td>
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

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function StatusBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const map: Record<string, string> = {
    taken: "bg-success text-success-foreground",
    missed: "bg-warning text-warning-foreground",
    invalid: "bg-destructive text-destructive-foreground",
    skipped: "bg-muted text-muted-foreground",
    rule_error: "bg-destructive text-destructive-foreground",
  };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${map[value] ?? "bg-muted"}`}>{value}</span>;
}

function ExitBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const map: Record<string, string> = {
    target: "bg-success/15 text-success border-success/30",
    stop: "bg-destructive/15 text-destructive border-destructive/30",
    time_exit: "bg-muted text-muted-foreground",
    hard_flat_1645: "bg-warning/15 text-warning-foreground border-warning/40",
    manual_flatten: "bg-warning/15 text-warning-foreground border-warning/40",
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

// ===== Trade form dialog =====

function TradeFormDialog({
  initial, onClose, onSaved,
}: { initial: TradeRow | null; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const initialLegId = initial?.leg_id ?? STRATEGIES[0].id;
  const [legId, setLegId] = useState(initialLegId);
  const spec = useMemo(() => getStrategy(legId)!, [legId]);
  const tick = TICK[spec.symbol];

  const [dateEt, setDateEt] = useState(initial?.date_et ?? today);
  const [phase, setPhase] = useState(initial?.phase ?? "paper_shadow");
  const [accStruct, setAccStruct] = useState(initial?.account_structure ?? "2x150K+1x100K");
  const [accLabel, setAccLabel] = useState(initial?.account_label ?? "");
  const [status, setStatus] = useState(initial?.trade_status ?? "taken");
  const [direction, setDirection] = useState(initial?.direction ?? "long");
  const [qty, setQty] = useState<number>(initial?.qty ?? spec.qty);
  const [signalTime, setSignalTime] = useState(initial?.signal_time_et ?? "");
  const [entryTime, setEntryTime] = useState(initial?.entry_time_et ?? "");
  const [exitTime, setExitTime] = useState(initial?.exit_time_et ?? "");
  const [signalClose, setSignalClose] = useState<string>(initial?.signal_close?.toString() ?? "");
  const [entryTheo, setEntryTheo] = useState<string>(initial?.entry_price_theoretical?.toString() ?? "");
  const [entryAct, setEntryAct] = useState<string>(initial?.entry_price_actual?.toString() ?? "");
  const [exitTheo, setExitTheo] = useState<string>(initial?.exit_price_theoretical?.toString() ?? "");
  const [exitAct, setExitAct] = useState<string>(initial?.exit_price_actual?.toString() ?? "");
  const [atrPeriod, setAtrPeriod] = useState<number>(initial?.atr_period ?? spec.atrPeriod);
  const [atrValue, setAtrValue] = useState<string>(initial?.atr_value?.toString() ?? "");
  const [stopMul, setStopMul] = useState<number>(initial?.stop_multiple ?? spec.stopMultiple);
  const [targetMul, setTargetMul] = useState<number>(initial?.target_multiple ?? spec.targetMultiple);
  const [stopPrice, setStopPrice] = useState<string>(initial?.stop_price?.toString() ?? "");
  const [targetPrice, setTargetPrice] = useState<string>(initial?.target_price?.toString() ?? "");
  const [timeExit, setTimeExit] = useState<string>(initial?.time_exit_time ?? "");
  const [hardFlatRel, setHardFlatRel] = useState<boolean>(initial?.hard_flat_relevant ?? false);
  const [exitReason, setExitReason] = useState(initial?.exit_reason ?? "target");
  const [commissions, setCommissions] = useState<string>(
    initial?.commissions_current?.toString() ?? (tick.commission * 2 * (initial?.qty ?? spec.qty)).toFixed(2),
  );
  const [slippage, setSlippage] = useState<string>(initial?.slippage_est?.toString() ?? "0");
  const [ruleFollowed, setRuleFollowed] = useState<string>(
    initial?.rule_followed === null || initial?.rule_followed === undefined
      ? "yes"
      : (initial.rule_followed ? "yes" : "no"),
  );
  const [ruleErrType, setRuleErrType] = useState(initial?.rule_error_type ?? "");
  // Context fields
  const [prevHigh, setPrevHigh] = useState<string>(initial?.prev_high?.toString() ?? "");
  const [prevLow, setPrevLow] = useState<string>(initial?.prev_low?.toString() ?? "");
  const [prevClose, setPrevClose] = useState<string>(initial?.prev_close?.toString() ?? "");
  const [ovHigh, setOvHigh] = useState<string>(initial?.overnight_high?.toString() ?? "");
  const [ovLow, setOvLow] = useState<string>(initial?.overnight_low?.toString() ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  // Reset defaults when leg changes (only if not editing)
  useEffect(() => {
    if (initial) return;
    const s = getStrategy(legId);
    if (!s) return;
    setQty(s.qty);
    setAtrPeriod(s.atrPeriod);
    setStopMul(s.stopMultiple);
    setTargetMul(s.targetMultiple);
    setCommissions((TICK[s.symbol].commission * 2 * s.qty).toFixed(2));
  }, [legId, initial]);

  // ===== Auto-calc =====
  const atrNum = parseFloat(atrValue);
  const sigCloseNum = parseFloat(signalClose);
  const ctx = {
    prevHigh: parseFloat(prevHigh) || undefined,
    prevLow: parseFloat(prevLow) || undefined,
    prevClose: parseFloat(prevClose) || undefined,
    overnightHigh: parseFloat(ovHigh) || undefined,
    overnightLow: parseFloat(ovLow) || undefined,
    atr: isNaN(atrNum) ? 0 : atrNum,
  };

  const signalEval = useMemo(() => {
    if (isNaN(sigCloseNum) || isNaN(atrNum)) return null;
    return evaluateSignal(spec, sigCloseNum, ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, sigCloseNum, atrNum, prevHigh, prevLow, prevClose, ovHigh, ovLow]);

  const thresholds = useMemo(() => {
    if (isNaN(atrNum)) return null;
    return computeThresholds(spec, ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, atrNum, prevHigh, prevLow, prevClose, ovHigh, ovLow]);

  // Auto stop/target prices from entry + ATR + multiples
  useEffect(() => {
    const ep = parseFloat(entryAct || entryTheo || "");
    if (isNaN(ep) || isNaN(atrNum) || atrNum <= 0) return;
    const stopDist = stopMul * atrNum;
    const targetDist = targetMul * atrNum;
    if (direction === "long") {
      if (!stopPrice) setStopPrice((ep - stopDist).toFixed(4));
      if (!targetPrice) setTargetPrice((ep + targetDist).toFixed(4));
    } else if (direction === "short") {
      if (!stopPrice) setStopPrice((ep + stopDist).toFixed(4));
      if (!targetPrice) setTargetPrice((ep - targetDist).toFixed(4));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryAct, entryTheo, atrValue, direction, stopMul, targetMul]);

  const pnlPreview = useMemo(() => {
    const epT = parseFloat(entryTheo || entryAct || "");
    const xpT = parseFloat(exitTheo || exitAct || "");
    const epA = parseFloat(entryAct || entryTheo || "");
    const xpA = parseFloat(exitAct || exitTheo || "");
    if (direction !== "long" && direction !== "short") return { theo: null, act: null };
    const theoGross = !isNaN(epT) && !isNaN(xpT)
      ? computeGrossPnl(spec.symbol, direction, epT, xpT, qty) : null;
    const actGross = !isNaN(epA) && !isNaN(xpA)
      ? computeGrossPnl(spec.symbol, direction, epA, xpA, qty) : null;
    const comm = parseFloat(commissions) || 0;
    const slip = parseFloat(slippage) || 0;
    return {
      theo: theoGross !== null ? theoGross - comm : null,
      act: actGross !== null ? actGross - comm - slip : null,
    };
  }, [entryAct, entryTheo, exitAct, exitTheo, direction, qty, spec.symbol, commissions, slippage]);

  // ===== Validation warnings =====
  const warnings: string[] = [];
  if (atrPeriod !== spec.atrPeriod)
    warnings.push(`ATR period ${atrPeriod} ei vastaa jalan oletusta (${spec.atrPeriod}).`);
  if (signalTime && entryTime && signalTime === entryTime)
    warnings.push("Entry-aika sama kuin signaaliaika — entry pitää olla seuraavan saman aikajakson barin avaus, ei signaalibarin sulku.");
  if (exitTime && exitTime > "16:45")
    warnings.push("HARD ERROR: exit > 16:45 ET. Kaikki pitää olla flat viimeistään 16:45 ET.");
  if (legId === "e652")
    warnings.push("e652: heikompi jalka. Losing streak hard-kill = 6.");
  if (legId === "ac172a2d")
    warnings.push("NG: heikompi jalka. Losing streak hard-kill = 6.");
  if (legId === "3314fd")
    warnings.push("3314: overnight high/low tiedossa vasta 09:30 ET jälkeen. Varmista entry-bari.");
  const hasContext =
    (spec.family.includes("prior_day_range") && prevHigh && prevLow) ||
    (spec.family === "prior_day_close_reversion" && prevClose) ||
    (spec.family === "overnight_range_breakout" && ovHigh && ovLow) ||
    (spec.family === "camarilla_breakout" && prevHigh && prevLow && prevClose);

  async function save() {
    setSaving(true);
    const epT = parseFloat(entryTheo || entryAct || "");
    const xpT = parseFloat(exitTheo || exitAct || "");
    const epA = parseFloat(entryAct || entryTheo || "");
    const xpA = parseFloat(exitAct || exitTheo || "");
    const dirSym = direction === "long" || direction === "short" ? direction : null;

    const grossAct = dirSym && !isNaN(epA) && !isNaN(xpA)
      ? computeGrossPnl(spec.symbol, dirSym, epA, xpA, qty) : null;
    const grossTheo = dirSym && !isNaN(epT) && !isNaN(xpT)
      ? computeGrossPnl(spec.symbol, dirSym, epT, xpT, qty) : null;
    const comm = parseFloat(commissions) || computeCommission(spec.symbol, qty);
    const slip = parseFloat(slippage) || 0;
    const netAct = grossAct !== null ? grossAct - comm - slip : null;
    const theoretical = grossTheo !== null ? grossTheo - comm : null;
    const amt = theoretical !== null && netAct !== null ? netAct - theoretical : null;

    const payload = {
      date_et: dateEt || null,
      leg_id: legId,
      phase,
      account_structure: accStruct,
      account_label: accLabel || null,
      symbol: spec.symbol,
      timeframe: spec.timeframe,
      session_name: spec.sessionName,
      family: spec.family,
      trade_status: status,
      direction: direction || null,
      qty,
      signal_time_et: signalTime || null,
      entry_time_et: entryTime || null,
      exit_time_et: exitTime || null,
      signal_close: numOrNull(signalClose),
      entry_price_theoretical: numOrNull(entryTheo),
      entry_price_actual: numOrNull(entryAct),
      exit_price_theoretical: numOrNull(exitTheo),
      exit_price_actual: numOrNull(exitAct),
      atr_period: atrPeriod,
      atr_value: numOrNull(atrValue),
      stop_multiple: stopMul,
      target_multiple: targetMul,
      stop_price: numOrNull(stopPrice),
      target_price: numOrNull(targetPrice),
      time_exit_time: timeExit || null,
      hard_flat_relevant: hardFlatRel,
      exit_reason: exitReason || null,
      prev_high: numOrNull(prevHigh),
      prev_low: numOrNull(prevLow),
      prev_close: numOrNull(prevClose),
      overnight_high: numOrNull(ovHigh),
      overnight_low: numOrNull(ovLow),
      r4: thresholds?.r4 ?? null,
      s4: thresholds?.s4 ?? null,
      upper_threshold: thresholds?.upper ?? null,
      lower_threshold: thresholds?.lower ?? null,
      distance: signalEval?.distance ?? null,
      distance_threshold: thresholds?.distanceThreshold ?? null,
      commissions_current: comm,
      slippage_est: slip,
      gross_pnl_current: grossAct,
      net_pnl_current: netAct,
      theoretical_pnl: theoretical,
      actual_pnl: netAct,
      actual_minus_theoretical: amt,
      rule_followed: ruleFollowed === "yes",
      rule_error_type: ruleErrType || null,
      notes: notes || null,
      // legacy columns kept for backwards compat
      strategy_name: spec.fullId,
      portfolio_version: "phidias_risk_bounded",
      current_qty: qty,
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Jalka (leg_id)">
            <Select value={legId} onValueChange={setLegId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STRATEGIES.map((s) =>
                  <SelectItem key={s.id} value={s.id}>{s.id} — {s.symbol} {s.family}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date (ET)"><Input type="date" value={dateEt} onChange={(e) => setDateEt(e.target.value)} /></Field>
          <Field label="Phase">
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PHASE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Account structure">
            <Select value={accStruct} onValueChange={setAccStruct}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACCOUNT_STRUCTURES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Account label / ID"><Input value={accLabel} onChange={(e) => setAccLabel(e.target.value)} placeholder="A1 / 150K-#1" /></Field>
          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        <div className="rounded-md bg-secondary/40 p-3 text-xs space-y-1">
          <div className="font-mono font-semibold">{spec.fullId}</div>
          <div className="text-muted-foreground">
            {spec.symbol} ×{spec.qty} · {spec.timeframe} · ATR({spec.atrPeriod}) · Stop {spec.stopMultiple}× · Target {spec.targetMultiple}× · Max {spec.maxHoldMinutes}min · Komissio ${tick.commission}/side
          </div>
          <div className="text-muted-foreground">
            ET {spec.sessionStartEt}–{spec.sessionEndEt} · Helsinki {spec.helsinkiNormal} · DST {spec.helsinkiDst}
          </div>
        </div>

        {warnings.map((w, i) => <Warn key={i}>{w}</Warn>)}
        {!hasContext && (
          <div className="text-xs text-muted-foreground italic">
            Konteksti-kentät (prev_high/low/close, overnight, jne) puuttuvat → laskenta tilataan keskeneräiseksi.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Direction">
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DIRECTION_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Qty"><Input type="number" value={qty} onChange={(e) => setQty(parseInt(e.target.value || "0"))} /></Field>
          <Field label="Signal time ET"><Input value={signalTime} onChange={(e) => setSignalTime(e.target.value)} placeholder="HH:MM" /></Field>
          <Field label="Entry time ET"><Input value={entryTime} onChange={(e) => setEntryTime(e.target.value)} placeholder="HH:MM" /></Field>
          <Field label="Exit time ET"><Input value={exitTime} onChange={(e) => setExitTime(e.target.value)} placeholder="HH:MM" /></Field>
          <Field label="Time-exit time"><Input value={timeExit} onChange={(e) => setTimeExit(e.target.value)} placeholder="HH:MM" /></Field>
          <Field label="Hard flat relevant">
            <Select value={hardFlatRel ? "yes" : "no"} onValueChange={(v) => setHardFlatRel(v === "yes")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Kyllä</SelectItem>
                <SelectItem value="no">Ei</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Exit reason">
            <Select value={exitReason} onValueChange={setExitReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EXIT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Signal close"><Input type="number" step="any" value={signalClose} onChange={(e) => setSignalClose(e.target.value)} /></Field>
          <Field label="Entry — theoretical"><Input type="number" step="any" value={entryTheo} onChange={(e) => setEntryTheo(e.target.value)} /></Field>
          <Field label="Entry — actual"><Input type="number" step="any" value={entryAct} onChange={(e) => setEntryAct(e.target.value)} /></Field>
          <Field label="Exit — theoretical"><Input type="number" step="any" value={exitTheo} onChange={(e) => setExitTheo(e.target.value)} /></Field>
          <Field label="Exit — actual"><Input type="number" step="any" value={exitAct} onChange={(e) => setExitAct(e.target.value)} /></Field>
          <Field label="Stop price"><Input type="number" step="any" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} /></Field>
          <Field label="Target price"><Input type="number" step="any" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} /></Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="ATR period"><Input type="number" value={atrPeriod} onChange={(e) => setAtrPeriod(parseInt(e.target.value || "0"))} /></Field>
          <Field label="ATR value"><Input type="number" step="any" value={atrValue} onChange={(e) => setAtrValue(e.target.value)} /></Field>
          <Field label="Stop mult."><Input type="number" step="any" value={stopMul} onChange={(e) => setStopMul(parseFloat(e.target.value || "0"))} /></Field>
          <Field label="Target mult."><Input type="number" step="any" value={targetMul} onChange={(e) => setTargetMul(parseFloat(e.target.value || "0"))} /></Field>
        </div>

        {/* Family-specific context */}
        {(spec.family === "prior_day_range_fade" || spec.family === "prior_day_range_breakout") && (
          <ContextBlock title="Prior day range">
            <Field label="prev_high"><Input type="number" step="any" value={prevHigh} onChange={(e) => setPrevHigh(e.target.value)} /></Field>
            <Field label="prev_low"><Input type="number" step="any" value={prevLow} onChange={(e) => setPrevLow(e.target.value)} /></Field>
          </ContextBlock>
        )}
        {spec.family === "prior_day_close_reversion" && (
          <ContextBlock title="Prior day close reversion">
            <Field label="prev_close"><Input type="number" step="any" value={prevClose} onChange={(e) => setPrevClose(e.target.value)} /></Field>
          </ContextBlock>
        )}
        {spec.family === "overnight_range_breakout" && (
          <ContextBlock title="Overnight range (tunnetaan 09:30 ET jälkeen)">
            <Field label="overnight_high"><Input type="number" step="any" value={ovHigh} onChange={(e) => setOvHigh(e.target.value)} /></Field>
            <Field label="overnight_low"><Input type="number" step="any" value={ovLow} onChange={(e) => setOvLow(e.target.value)} /></Field>
          </ContextBlock>
        )}
        {spec.family === "camarilla_breakout" && (
          <ContextBlock title="Camarilla R4/S4">
            <Field label="prev_high"><Input type="number" step="any" value={prevHigh} onChange={(e) => setPrevHigh(e.target.value)} /></Field>
            <Field label="prev_low"><Input type="number" step="any" value={prevLow} onChange={(e) => setPrevLow(e.target.value)} /></Field>
            <Field label="prev_close"><Input type="number" step="any" value={prevClose} onChange={(e) => setPrevClose(e.target.value)} /></Field>
          </ContextBlock>
        )}

        {(thresholds || signalEval) && (
          <div className="rounded-md border p-3 bg-secondary/30 text-xs grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat label="Upper" v={thresholds?.upper != null ? thresholds.upper.toFixed(4) : "—"} />
            <Stat label="Lower" v={thresholds?.lower != null ? thresholds.lower.toFixed(4) : "—"} />
            {thresholds?.r4 != null && <Stat label="R4" v={thresholds.r4.toFixed(4)} />}
            {thresholds?.s4 != null && <Stat label="S4" v={thresholds.s4.toFixed(4)} />}
            {signalEval?.distance != null && <Stat label="distance" v={signalEval.distance.toFixed(4)} />}
            {signalEval && <Stat label="signal → dir" v={signalEval.direction} />}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Commissions ($)"><Input type="number" step="0.01" value={commissions} onChange={(e) => setCommissions(e.target.value)} /></Field>
          <Field label="Slippage est. ($)"><Input type="number" step="0.01" value={slippage} onChange={(e) => setSlippage(e.target.value)} /></Field>
          <Field label="Rule followed">
            <Select value={ruleFollowed} onValueChange={setRuleFollowed}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Kyllä</SelectItem>
                <SelectItem value="no">Ei</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Rule error type">
            <Select value={ruleErrType || "none"} onValueChange={(v) => setRuleErrType(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {RULE_ERROR_TYPES.filter(Boolean).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></Field>

        {(pnlPreview.theo !== null || pnlPreview.act !== null) && (
          <div className="rounded-md border p-3 bg-secondary/30 grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Theoretical net</div>
              <div className={`text-lg font-semibold tabular-nums ${pnlColor(pnlPreview.theo)}`}>{fmt$(pnlPreview.theo)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Actual net</div>
              <div className={`text-lg font-semibold tabular-nums ${pnlColor(pnlPreview.act)}`}>{fmt$(pnlPreview.act)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Δ Actual − Theo</div>
              <div className={`text-lg font-semibold tabular-nums ${pnlColor(pnlPreview.act !== null && pnlPreview.theo !== null ? pnlPreview.act - pnlPreview.theo : null)}`}>
                {pnlPreview.act !== null && pnlPreview.theo !== null ? fmt$(pnlPreview.act - pnlPreview.theo) : "—"}
              </div>
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

function ContextBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{title}</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{children}</div>
    </div>
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

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono tabular-nums">{v}</div>
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

// Touch type to keep import used in some contexts
type _S = Symbol;
