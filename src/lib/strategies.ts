// LucidDirect capacity_rank1_gc portfolio — DO NOT modify strategy parameters.
export type Symbol = "YM" | "HG" | "MES" | "GC";

export const TICK = {
  YM:  { size: 1,      value: 5.0  },
  HG:  { size: 0.0005, value: 12.5 },
  MES: { size: 0.25,   value: 1.25 },
  GC:  { size: 0.10,   value: 10.0 },
} as const;

// Primary high-EV portfolio (with GC) and GC-free conservative comparison.
// We re-use the existing "current"/"optimized" DB columns:
//   current   = Primary (with GC)
//   optimized = GC-free comparison
export const PORTFOLIO = {
  primary: { YM: 4, HG: 5, MES: 20, GC: 4 },
  gcFree:  { YM: 9, HG: 2, MES: 10, GC: 0 },
} as const;

// Mini-equivalent per contract (Lucid 10 mini / 100 micro concurrent rule)
export const MINI_EQ_PER_CONTRACT: Record<Symbol, number> = {
  YM:  1,    // 1 mini = 1 mini-eq
  HG:  1,    // 1 HG mini = 1 mini-eq
  MES: 0.1,  // 10 micros = 1 mini-eq
  GC:  1,    // 1 GC mini = 1 mini-eq
};

export const MAX_CONCURRENT_MINI_EQ = 10;

export interface StrategySpec {
  id: string;
  symbol: Symbol;
  name: string;
  logic: string;
  days: string;
  noMonday: boolean;
  sessionName: string;
  sessionStartEt: string;
  sessionEndEt: string;
  etWindow: string;
  helsinkiWindowNormal: string;
  helsinkiWindowDst: string;
  entryTimeEt: string;
  possibleEntryTimesEt: string[]; // empty = single fixed entry
  stopTicks: number;
  targetTicks: number;
  stopPriceDistance: number;
  targetPriceDistance: number;
  maxHoldBars: number;
  primaryQty: number;
  gcFreeQty: number;
  miniEqPerContract: number;
  primaryMiniEq: number;
  gcFreeMiniEq: number;
  notes: string[];
  warning?: string;
}

function mk(
  partial: Omit<StrategySpec, "primaryMiniEq" | "gcFreeMiniEq" | "miniEqPerContract">,
): StrategySpec {
  const m = MINI_EQ_PER_CONTRACT[partial.symbol];
  return {
    ...partial,
    miniEqPerContract: m,
    primaryMiniEq: partial.primaryQty * m,
    gcFreeMiniEq: partial.gcFreeQty * m,
  };
}

export const STRATEGIES: StrategySpec[] = [
  mk({
    id: "YM_gap_follow_fade_3020",
    symbol: "YM",
    name: "YM_gap_follow_fade_3020",
    logic: "Fadaa aamun gappi — gap ylös = myy, gap alas = osta",
    days: "Tiistai–perjantai (ei maanantaisin)",
    noMonday: true,
    sessionName: "Europe / Globex",
    sessionStartEt: "02:00",
    sessionEndEt: "05:00",
    etWindow: "02:00–05:00 ET",
    helsinkiWindowNormal: "09:00–12:00 (entry 09:30)",
    helsinkiWindowDst: "08:00–11:00 (entry 08:30)",
    entryTimeEt: "02:30",
    possibleEntryTimesEt: ["02:30"],
    stopTicks: 24,
    targetTicks: 72,
    stopPriceDistance: 24,
    targetPriceDistance: 72,
    maxHoldBars: 4,
    primaryQty: PORTFOLIO.primary.YM,
    gcFreeQty: PORTFOLIO.gcFree.YM,
    notes: [
      "Edellisen päivän väri: edellisen päivän 16:45 ET close ON OLTAVA alle edellisen päivän 02:00 ET openin.",
      "Gap = (tämän päivän 02:00 ET open − edellisen päivän 16:45 ET close) / edellisen päivän 16:45 ET close × 100.",
      "Gap oltava yli +0.7 % tai alle −0.7 %.",
      "Gap ylös → myy, gap alas → osta (ei vahvistuskynttilää).",
      "Entry: 02:30 ET kynttilän avaus / 09:30 Helsinki (DST: 08:30).",
      "Stop 24 pistettä, target 72 pistettä, max hold 4 kynttilää.",
      "Sulje viimeistään 05:00 ET / 12:00 Helsinki (DST: 11:00).",
      "Tiistai–perjantai (ei maanantaisin).",
    ],
  }),
  mk({
    id: "HG_imbalance_reversal_17734",
    symbol: "HG",
    name: "HG_imbalance_reversal_17734",
    logic: "Imbalance reversal — iso vihreä = short, iso punainen = long",
    days: "Tiistai–perjantai (no_monday)",
    noMonday: true,
    sessionName: "Afternoon",
    sessionStartEt: "13:30",
    sessionEndEt: "16:45",
    etWindow: "13:30–16:45 ET",
    helsinkiWindowNormal: "20:30–23:45",
    helsinkiWindowDst: "19:30–22:45",
    entryTimeEt: "next-bar open",
    possibleEntryTimesEt: [
      "14:00","14:15","14:30","14:45",
      "15:00","15:15","15:30","15:45",
      "16:00","16:15","16:30",
    ],
    stopTicks: 16,
    targetTicks: 72,
    stopPriceDistance: 0.0080,
    targetPriceDistance: 0.0360,
    maxHoldBars: 2,
    primaryQty: PORTFOLIO.primary.HG,
    gcFreeQty: PORTFOLIO.gcFree.HG,
    warning:
      "HG cutoff: jos 16:30 ET entry on vielä auki noin 16:43–16:44 ET, sulje manuaalisesti ennen Lucid 16:45 ET cutoffia. exit_reason = manual_flatten_before_1645.",
    notes: [
      "min_bars 2: aloita seuranta kun sessiossa on vähintään 2 baria.",
      "body_pct = abs(close − open) / open × 100; ehto ≥ 0.5 %.",
      "body_fraction = abs(close − open) / max(high − low, tick_size); ehto ≥ 0.55.",
      "Vihreä signaali = short next-bar open; punainen = long next-bar open.",
      "Stop 16 ticks (0.0080), target 72 ticks (0.0360), max hold 2 baria.",
    ],
  }),
  mk({
    id: "MES_trend_continuation_1216",
    symbol: "MES",
    name: "MES_trend_continuation_1216",
    logic: "Trend continuation — 4-bar move ≥ 0.3 %, jatketaan suuntaan",
    days: "Tiistai–perjantai (no_monday)",
    noMonday: true,
    sessionName: "Europe / Globex",
    sessionStartEt: "02:00",
    sessionEndEt: "05:00",
    etWindow: "02:00–05:00 ET",
    helsinkiWindowNormal: "09:00–12:00",
    helsinkiWindowDst: "08:00–11:00",
    entryTimeEt: "03:00–04:45",
    possibleEntryTimesEt: [
      "03:00","03:15","03:30","03:45",
      "04:00","04:15","04:30","04:45",
    ],
    stopTicks: 48,
    targetTicks: 120,
    stopPriceDistance: 12,   // 48 * 0.25
    targetPriceDistance: 30, // 120 * 0.25
    maxHoldBars: 4,
    primaryQty: PORTFOLIO.primary.MES,
    gcFreeQty: PORTFOLIO.gcFree.MES,
    notes: [
      "lookback_bars 4: katso viimeiset 4 baria signaalihetkellä.",
      "move_pct = (recent[-1].close − recent[0].open) / recent[0].open × 100.",
      "Ehto: abs(move_pct) ≥ 0.3 %.",
      "allow_pullback = false: long vaatii close > open, short vaatii close < open.",
      "Suunta = move_pctin etumerkki (positiivinen = long, negatiivinen = short).",
      "Stop 48 ticks, target 120 ticks, max hold 4 baria. Flat 05:00 ET.",
      "20 micros = 2 mini-equivalent (concurrent exposure).",
    ],
  }),
  mk({
    id: "GC_gap_phase1_16",
    symbol: "GC",
    name: "GC_gap_phase1_16",
    logic: "Gap phase1 follow — gap up = long, gap down = short, vaatii confirmation",
    days: "Maanantai–perjantai (all days)",
    noMonday: false,
    sessionName: "US open",
    sessionStartEt: "09:30",
    sessionEndEt: "16:45",
    etWindow: "09:30 start, entry 09:45 ET",
    helsinkiWindowNormal: "16:30 start (entry 16:45)",
    helsinkiWindowDst: "15:30 start (entry 15:45)",
    entryTimeEt: "09:45",
    possibleEntryTimesEt: ["09:45"],
    stopTicks: 24,
    targetTicks: 72,
    stopPriceDistance: 2.4,  // 24 * 0.10
    targetPriceDistance: 7.2, // 72 * 0.10
    maxHoldBars: 4,
    primaryQty: PORTFOLIO.primary.GC,
    gcFreeQty: PORTFOLIO.gcFree.GC,
    warning:
      "GC = portfolion korkein EV mutta riskisin jalka. Seuraa tarkasti rolling 10-trade PnL ja stoppien sarjat.",
    notes: [
      "previous_day_red: prev_context_close < prev_context_open (kontekstiväli 09:30–16:45 ET).",
      "gap_pct = (today_09:30_open − prev_context_close) / prev_context_close × 100.",
      "Ehto: abs(gap_pct) ≥ 0.7 %.",
      "Mode follow: gap up = long, gap down = short.",
      "Confirmation: 09:30 bar close > open (long) tai close < open (short).",
      "Entry 09:45 ET candle open. Stop 24t, target 72t, max hold 4 baria.",
      "Flat 16:45 ET. Ei VIX-filtteriä.",
    ],
  }),
];

export const PORTFOLIO_NOTE =
  "Primary on high-EV / high-churn portfolio (sis. GC). GC-free on konservatiivinen vertailu — paperissa seurataan rinnakkain, jotta nähdään onko GC EV:n arvoinen.";

export const GENERAL_RULES = [
  "Chart timeframe: 15 min — timezone New York / ET",
  "Entry next-bar open (paitsi GC phase1 jossa 09:45 fixed)",
  "Stop-first ordering jos stop ja target osuvat saman 15 min barin sisään",
  "Ei overnight — kaikki flat ennen 16:45 ET cutoffia",
  "Yksi treidi per strategia per päivä",
  "Max 10 mini-equivalent samanaikaisesti (ei päivän total)",
  "Paperissa: kirjaa sekä theoretical (backtest) että actual (paper) fill",
];

export const LUCID_EV_CONTEXT = {
  monthlyMedian: "€3,393 / kk (M18-60, 5 Direct-tiliä)",
  fiveYearMedian: "€175,628",
  fiveYearP10: "€87,768",
  firstPayoutDays: "204–214 päivää",
  breachRate: "0.82 breach / account / year",
  worstDay: "≈ −$2,879",
  tradesPerMonth: "4.9",
  activeDaysPerMonth: "4.4",
  disclaimer: "Backtest-odotus — ei takuu tulevasta tuotosta.",
};

export function getStrategyForSymbol(sym: Symbol): StrategySpec {
  return STRATEGIES.find((s) => s.symbol === sym)!;
}

export function computePnl(
  symbol: Symbol,
  direction: "Long" | "Short",
  entry: number,
  exit: number,
  qty: number,
): number {
  const t = TICK[symbol];
  const diff = direction === "Long" ? exit - entry : entry - exit;
  return (diff / t.size) * t.value * qty;
}

// ---------- Today / weekday schedule (ET) ----------

export type TodayItem = {
  sym: Symbol;
  spec: StrategySpec;
  status: "upcoming" | "active" | "completed";
  alerts: string[];
};

/** Get current time in ET as { dow, hh, mm, dateStr } using Intl. */
export function nowInET(now: Date = new Date()): {
  dow: number; // 0=Sun..6=Sat in ET
  hh: number;
  mm: number;
  dateStr: string; // YYYY-MM-DD ET
  weekdayName: string;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wkMap: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  const weekdayShort = get("weekday");
  const dow = wkMap[weekdayShort] ?? 0;
  const hh = parseInt(get("hour"), 10);
  const mm = parseInt(get("minute"), 10);
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const fiNames = ["Sunnuntai","Maanantai","Tiistai","Keskiviikko","Torstai","Perjantai","Lauantai"];
  return { dow, hh, mm, dateStr, weekdayName: fiNames[dow] };
}

function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function getTodayStrategies(now: Date = new Date()): TodayItem[] {
  const { dow, hh, mm } = nowInET(now);
  if (dow === 0 || dow === 6) return [];
  const cur = hh * 60 + mm;

  return STRATEGIES.filter((s) => (dow === 1 ? !s.noMonday : true)).map((s) => {
    const start = hhmmToMinutes(s.sessionStartEt);
    const end = hhmmToMinutes(s.sessionEndEt);
    const entry = hhmmToMinutes(s.possibleEntryTimesEt[0] ?? s.sessionStartEt);
    let status: TodayItem["status"];
    if (cur < start) status = "upcoming";
    else if (cur >= start && cur < end) status = "active";
    else status = "completed";

    const alerts: string[] = [];
    if (cur >= entry - 15 && cur < entry) alerts.push("Upcoming entry < 15 min");
    if (status === "active") alerts.push("Session active");
    if (s.symbol === "HG") {
      alerts.push("HG 16:30 entry: jos auki 16:43–16:44 ET, manuaalinen flatten ennen 16:45 cutoffia.");
    }
    if (s.symbol === "GC") alerts.push("GC watch: korkein EV, suurin riski.");
    return { sym: s.symbol, spec: s, status, alerts };
  });
}
