// Phidias Risk Bounded portfolio — paper-shadow journal data layer.
// Replaces the abandoned LucidDirect / capacity_rank1_gc set.

export type Symbol = "MNQ" | "GC" | "NG";
export type Family =
  | "prior_day_range_fade"
  | "prior_day_range_breakout"
  | "prior_day_close_reversion"
  | "overnight_range_breakout"
  | "camarilla_breakout";

export type Phase = "paper_shadow" | "evaluation" | "funded";
export type AccountStructure =
  | "1x100K"
  | "1x150K"
  | "2x150K+1x100K"
  | "5x100K";

export const DEFAULT_ACCOUNT_STRUCTURE: AccountStructure = "2x150K+1x100K";

export const PORTFOLIO_ID = "phidias_risk_bounded";
export const PORTFOLIO_NAME = "Phidias Risk Bounded";
export const PORTFOLIO_SUBTITLE = "Paper Shadow Journal";
export const PORTFOLIO_STATUS = "PAPER_SHADOW_READY";

// ---- Symbol specs --------------------------------------------------------

export interface SymbolSpec {
  size: number;        // tick size
  value: number;       // $ per tick per contract
  commission: number;  // $ per side per contract
}

export const TICK: Record<Symbol, SymbolSpec> = {
  MNQ: { size: 0.25,  value: 0.50, commission: 0.79 },
  GC:  { size: 0.10,  value: 10.0, commission: 2.42 },
  NG:  { size: 0.001, value: 10.0, commission: 2.32 },
};

// ---- Phidias account rules ----------------------------------------------

export const PHIDIAS_RULES = {
  evalTarget: { "100K": 6000, "150K": 9000 },
  drawdown:   { "100K": 3000, "150K": 4500 },
  evaluationConsistency: 0.50,
  fundedConsistency: 0.30,
  payoutIntervalDays: 5,
  payoutSplits: [0.75, 0.80, 0.85, 0.90, 1.00],
  hardFlatEt: "16:45",
  fundedDrawdownNote: "EOD trailing drawdown (ei intraday). Ei DLL.",
};

export const ACCOUNT_STRUCTURES: {
  id: AccountStructure;
  label: string;
  accounts: { size: "100K" | "150K"; count: number }[];
  totalDrawdown: number;
  totalEvalTarget: number;
}[] = [
  { id: "1x100K", label: "1 × Premium 100K",
    accounts: [{ size: "100K", count: 1 }],
    totalDrawdown: 3000, totalEvalTarget: 6000 },
  { id: "1x150K", label: "1 × Premium 150K",
    accounts: [{ size: "150K", count: 1 }],
    totalDrawdown: 4500, totalEvalTarget: 9000 },
  { id: "2x150K+1x100K", label: "2 × 150K + 1 × 100K (default)",
    accounts: [{ size: "150K", count: 2 }, { size: "100K", count: 1 }],
    totalDrawdown: 4500 * 2 + 3000, totalEvalTarget: 9000 * 2 + 6000 },
  { id: "5x100K", label: "5 × Premium 100K",
    accounts: [{ size: "100K", count: 5 }],
    totalDrawdown: 3000 * 5, totalEvalTarget: 6000 * 5 },
];

export const EXPECTED_RETURNS = {
  realisticMonthly: "€1,400 – €2,500 / kk",
  fullHistoryMedian: "€2,476 / kk",
  p10: "€530 / kk",
  p90: "€4,990 / kk",
  holdout: "€3,145 / kk",
  warning:
    "Täyden historian mediaani sisältää 2022 korkean volatiliteetin jakson. Älä ankkuroidu pelkkään holdoutiin tai täysmediaaniin.",
  volRegime: {
    low: "€1,523 / kk",
    mid: "€825 / kk",
    high: "€5,294 / kk",
  },
  volatilityMessage:
    "Tämä portfolio on long volatility. Hiljaiset matalan volatiliteetin jaksot ovat odotettuja eivätkä automaattisesti epäonnistuminen.",
  disclaimer: "Backtest / lifecycle -konteksti — ei takuu tulevasta tuotosta.",
};

// ---- Strategies ----------------------------------------------------------

export interface StrategySpec {
  id: string;                  // short id, e.g. "2828f5a"
  fullId: string;              // human-readable full id
  symbol: Symbol;
  family: Family;
  qty: number;
  timeframe: string;           // "15m"
  timeframeMinutes: number;
  sessionName: string;         // e.g. "Premarket"
  sessionStartEt: string;      // "05:00"
  sessionEndEt: string;        // "09:30"
  helsinkiNormal: string;
  helsinkiDst: string;
  possibleEntryEt: string;     // descriptive
  atrPeriod: number;
  thresholdMultiple: number;   // 0.25 typically
  stopMultiple: number;        // 1.5
  targetMultiple: number;      // 3.0
  maxHoldMinutes: number;
  isFade: boolean;             // affects signal direction
  description: string;
  warning?: string;
  killRule: { rolling10Alert: number; hardKillNet: number; losingStreak: number };
}

const HARD_FLAT_ET = "16:45";

export const STRATEGIES: StrategySpec[] = [
  {
    id: "2828f5a", fullId: "2828f5a — MNQ prior_day_range_fade",
    symbol: "MNQ", family: "prior_day_range_fade", qty: 4,
    timeframe: "15m", timeframeMinutes: 15,
    sessionName: "Premarket", sessionStartEt: "05:00", sessionEndEt: "09:30",
    helsinkiNormal: "12:00–16:30", helsinkiDst: "11:00–15:30",
    possibleEntryEt: "Seuraavan 15m barin avaus signaalin jälkeen, normaalisti 05:15–09:30 ET.",
    atrPeriod: 24, thresholdMultiple: 0.25, stopMultiple: 1.5, targetMultiple: 3.0,
    maxHoldMinutes: 240, isFade: true,
    description:
      "Premarket-ikkunan fade edellisen päivän range-rikkomuksesta. Lasketaan ATR(24). " +
      "Yläkynnys = edellisen päivän high + 0.25 × ATR(24), alakynnys = edellisen päivän low − 0.25 × ATR(24). " +
      "Jos suljettu 15m bar sulkeutuu yläkynnyksen yli → SHORT (fade). " +
      "Jos suljettu 15m bar sulkeutuu alakynnyksen alle → LONG (fade). " +
      "Entry seuraavan 15m barin avauksessa, ei koskaan signaalibarin sulussa. " +
      "Stop 1.5 × ATR(24), target 3.0 × ATR(24), max hold 240 minuuttia. Hard flat 16:45 ET.",
    killRule: { rolling10Alert: 6.49, hardKillNet: -500, losingStreak: 8 },
  },
  {
    id: "3314fd", fullId: "3314fd — MNQ overnight_range_breakout",
    symbol: "MNQ", family: "overnight_range_breakout", qty: 5,
    timeframe: "30m", timeframeMinutes: 30,
    sessionName: "London", sessionStartEt: "02:00", sessionEndEt: "11:00",
    helsinkiNormal: "09:00–18:00", helsinkiDst: "08:00–17:00",
    possibleEntryEt:
      "Seuraavan 30m barin avaus signaalin jälkeen — vain kun overnight high/low on tiedossa (klo 09:30 ET jälkeen).",
    atrPeriod: 16, thresholdMultiple: 0.25, stopMultiple: 1.5, targetMultiple: 3.0,
    maxHoldMinutes: 240, isFade: false,
    description:
      "Overnight-rangen läpimurto. Lasketaan ATR(16). " +
      "Yläkynnys = overnight_high + 0.25 × ATR(16), alakynnys = overnight_low − 0.25 × ATR(16). " +
      "Jos suljettu 30m bar sulkeutuu yläkynnyksen yli → LONG (breakout). " +
      "Jos alakynnyksen alle → SHORT. Entry seuraavan 30m barin avauksessa. " +
      "Stop 1.5 × ATR(16), target 3.0 × ATR(16), max hold 240 min. Hard flat 16:45 ET.",
    warning:
      "3314 käyttää overnight high/low -arvoja, jotka tiedetään vasta 09:30 ET jälkeen. Varmista todellinen entry-bari OHLC-ankkuroinnilla.",
    killRule: { rolling10Alert: 5.62, hardKillNet: -500, losingStreak: 8 },
  },
  {
    id: "4ac847", fullId: "4ac847 — MNQ prior_day_close_reversion",
    symbol: "MNQ", family: "prior_day_close_reversion", qty: 5,
    timeframe: "60m", timeframeMinutes: 60,
    sessionName: "London", sessionStartEt: "02:00", sessionEndEt: "11:00",
    helsinkiNormal: "09:00–18:00", helsinkiDst: "08:00–17:00",
    possibleEntryEt:
      "Seuraavan 60m barin avaus signaalin jälkeen, normaalisti 03:00–11:00 ET varmennetulla barin ankkuroinnilla.",
    atrPeriod: 5, thresholdMultiple: 0.5, stopMultiple: 1.0, targetMultiple: 2.0,
    maxHoldMinutes: 720, isFade: true,
    description:
      "Reversion edellisen päivän sulkemishinnan ympärille. Lasketaan ATR(5). " +
      "distance = (signaalin sulkemishinta − edellisen päivän close) / ATR(5). " +
      "Jos distance > 0.5 → SHORT (kaukana yläpuolella = käänne alas). " +
      "Jos distance < −0.5 → LONG. Entry seuraavan 60m barin avauksessa. " +
      "Erityisprofiili: stop 1.0 × ATR(5), target 2.0 × ATR(5), max hold 720 min. " +
      "Session-end flatten + hard flat 16:45 ET.",
    warning:
      "Tämä jalka käyttää eri stop/target-kerrointa (1.0/2.0) kuin muut. Älä käytä 1.5/3.0 tässä.",
    killRule: { rolling10Alert: 3.11, hardKillNet: -500, losingStreak: 8 },
  },
  {
    id: "e652", fullId: "e652 — MNQ prior_day_close_reversion",
    symbol: "MNQ", family: "prior_day_close_reversion", qty: 4,
    timeframe: "5m", timeframeMinutes: 5,
    sessionName: "US open", sessionStartEt: "09:30", sessionEndEt: "12:00",
    helsinkiNormal: "16:30–19:00", helsinkiDst: "15:30–18:00",
    possibleEntryEt: "Seuraavan 5m barin avaus signaalin jälkeen, normaalisti 09:35–12:00 ET.",
    atrPeriod: 36, thresholdMultiple: 1.25, stopMultiple: 1.5, targetMultiple: 3.0,
    maxHoldMinutes: 240, isFade: true,
    description:
      "US-open reversion. Lasketaan ATR(36). " +
      "distance = (signaalin close − edellisen päivän close) / ATR(36). " +
      "Jos distance > 1.25 → SHORT, jos distance < −1.25 → LONG. " +
      "Entry seuraavan 5m barin avauksessa. " +
      "Stop 1.5 × ATR(36), target 3.0 × ATR(36), max hold 240 min. Hard flat 16:45 ET.",
    warning:
      "Heikompi / korkeariskisempi jalka. Losing streak hard-kill = 6 (ei 8).",
    killRule: { rolling10Alert: 1.67, hardKillNet: -500, losingStreak: 6 },
  },
  {
    id: "c2c181", fullId: "c2c181 — MNQ prior_day_range_fade",
    symbol: "MNQ", family: "prior_day_range_fade", qty: 4,
    timeframe: "30m", timeframeMinutes: 30,
    sessionName: "London", sessionStartEt: "02:00", sessionEndEt: "11:00",
    helsinkiNormal: "09:00–18:00", helsinkiDst: "08:00–17:00",
    possibleEntryEt: "Seuraavan 30m barin avaus signaalin jälkeen, normaalisti 02:30–11:00 ET.",
    atrPeriod: 6, thresholdMultiple: 0.25, stopMultiple: 1.5, targetMultiple: 3.0,
    maxHoldMinutes: 240, isFade: true,
    description:
      "London-session fade edellisen päivän range-rikkomuksesta. Lasketaan ATR(6). " +
      "Yläkynnys = prev_high + 0.25 × ATR(6), alakynnys = prev_low − 0.25 × ATR(6). " +
      "Yläkynnys ylittyy → SHORT, alakynnys alittuu → LONG (fade). " +
      "Entry seuraavan 30m barin avauksessa. Stop 1.5 × ATR(6), target 3.0 × ATR(6). " +
      "Max hold 240 min, hard flat 16:45 ET.",
    killRule: { rolling10Alert: 5.00, hardKillNet: -500, losingStreak: 8 },
  },
  {
    id: "cd8e66", fullId: "cd8e66 — MNQ prior_day_range_breakout",
    symbol: "MNQ", family: "prior_day_range_breakout", qty: 4,
    timeframe: "15m", timeframeMinutes: 15,
    sessionName: "Afternoon", sessionStartEt: "13:30", sessionEndEt: "16:30",
    helsinkiNormal: "20:30–23:30", helsinkiDst: "19:30–22:30",
    possibleEntryEt: "Seuraavan 15m barin avaus signaalin jälkeen, normaalisti 13:45–16:30 ET.",
    atrPeriod: 5, thresholdMultiple: 0.25, stopMultiple: 1.5, targetMultiple: 3.0,
    maxHoldMinutes: 240, isFade: false,
    description:
      "Iltapäivän breakout edellisen päivän rangen yli. Lasketaan ATR(5). " +
      "Yläkynnys = prev_high + 0.25 × ATR(5), alakynnys = prev_low − 0.25 × ATR(5). " +
      "Yläkynnys ylittyy → LONG (breakout), alakynnys alittuu → SHORT. " +
      "Entry seuraavan 15m barin avauksessa. Stop 1.5 × ATR(5), target 3.0 × ATR(5). " +
      "Max hold 240 min, hard flat 16:45 ET.",
    killRule: { rolling10Alert: 8.43, hardKillNet: -500, losingStreak: 8 },
  },
  {
    id: "6d352449", fullId: "6d352449 — GC camarilla_breakout",
    symbol: "GC", family: "camarilla_breakout", qty: 1,
    timeframe: "30m", timeframeMinutes: 30,
    sessionName: "Premarket", sessionStartEt: "05:00", sessionEndEt: "09:30",
    helsinkiNormal: "12:00–16:30", helsinkiDst: "11:00–15:30",
    possibleEntryEt: "Seuraavan 30m barin avaus signaalin jälkeen, normaalisti 05:30–09:30 ET.",
    atrPeriod: 6, thresholdMultiple: 0.25, stopMultiple: 1.5, targetMultiple: 3.0,
    maxHoldMinutes: 240, isFade: false,
    description:
      "Camarilla R4/S4 breakout kullassa (GC). Lasketaan ATR(6) sekä Camarilla-tasot: " +
      "R4 = prev_close + 1.1 × (prev_high − prev_low) / 2; S4 = prev_close − 1.1 × (prev_high − prev_low) / 2. " +
      "Yläkynnys = R4 + 0.25 × ATR(6), alakynnys = S4 − 0.25 × ATR(6). " +
      "Yläkynnys ylittyy → LONG, alakynnys alittuu → SHORT. " +
      "Entry seuraavan 30m barin avauksessa. Stop 1.5 × ATR(6), target 3.0 × ATR(6). " +
      "Max hold 240 min, hard flat 16:45 ET.",
    warning:
      "GC: korkea false-discovery -riski mutta historiallisesti yksi sileimmistä jaloista. Seuraa erikseen.",
    killRule: { rolling10Alert: 18.95, hardKillNet: -758, losingStreak: 8 },
  },
  {
    id: "ac172a2d", fullId: "ac172a2d — NG camarilla_breakout",
    symbol: "NG", family: "camarilla_breakout", qty: 1,
    timeframe: "30m", timeframeMinutes: 30,
    sessionName: "London", sessionStartEt: "02:00", sessionEndEt: "11:00",
    helsinkiNormal: "09:00–18:00", helsinkiDst: "08:00–17:00",
    possibleEntryEt: "Seuraavan 30m barin avaus signaalin jälkeen, normaalisti 02:30–11:00 ET.",
    atrPeriod: 5, thresholdMultiple: 0.25, stopMultiple: 1.5, targetMultiple: 3.0,
    maxHoldMinutes: 240, isFade: false,
    description:
      "Camarilla R4/S4 breakout maakaasussa (NG). Lasketaan ATR(5) sekä Camarilla: " +
      "R4 = prev_close + 1.1 × (prev_high − prev_low) / 2; S4 = prev_close − 1.1 × (prev_high − prev_low) / 2. " +
      "Yläkynnys = R4 + 0.25 × ATR(5), alakynnys = S4 − 0.25 × ATR(5). " +
      "Yläkynnys ylittyy → LONG, alakynnys alittuu → SHORT. " +
      "Entry seuraavan 30m barin avauksessa. Stop 1.5 × ATR(5), target 3.0 × ATR(5). " +
      "Max hold 240 min, hard flat 16:45 ET.",
    warning:
      "NG: heikompi / korkeariskisempi jalka. Losing streak hard-kill = 6 (ei 8).",
    killRule: { rolling10Alert: 14.35, hardKillNet: -574, losingStreak: 6 },
  },
];

export function getStrategy(id: string): StrategySpec | undefined {
  return STRATEGIES.find((s) => s.id === id);
}

export const GENERAL_RULES = [
  "Aikavyöhyke: New York / ET on totuus. Helsinki on vain helper (ET+7 normaalisti, ET+6 DST-mismatch).",
  "Signaali käyttää aina vain SULJETTUA signaalibaria. Älä koskaan ota entryä signaalibarin sulkuhetkellä.",
  "Entry = seuraavan saman aikajakson barin avaus.",
  "Stop ja target aktiiviset välittömästi entryn jälkeen.",
  "Ei overnight-positioita. Hard flat viimeistään 16:45 ET.",
  "Max hold tai 16:45 flat — kumpi tulee ensin → exit siinä.",
  "Sama jalka ei avaa uutta positiota jos edellinen saman jalan treidi on vielä auki.",
  "Manuaalinen entry — kirjaa sekä theoretical (signaaliperusteinen) että actual (paper fill).",
];

// ---- PnL formulas --------------------------------------------------------
export function parseMarketNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (value === null || value === undefined) return NaN;

  const raw = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/[$€]/g, "");

  if (!raw) return NaN;

  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  let normalized = raw;

  if (hasComma && hasDot) {
    normalized = raw.replace(/,/g, "");
  } else if (hasComma) {
    const parts = raw.split(",");
    const last = parts[parts.length - 1] ?? "";
    normalized = parts.length === 2 && last.length <= 2
      ? `${parts[0]}.${last}`
      : raw.replace(/,/g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}
export function ticksBetween(
  symbol: Symbol,
  direction: "long" | "short",
  entry: number,
  exit: number,
): number {
  const { size } = TICK[symbol];
  const diff = direction === "long" ? exit - entry : entry - exit;
  return diff / size;
}

export function computeGrossPnl(
  symbol: Symbol,
  direction: "long" | "short",
  entry: number,
  exit: number,
  qty: number,
): number {
  const t = ticksBetween(symbol, direction, entry, exit);
  return t * TICK[symbol].value * qty;
}

export function computeCommission(symbol: Symbol, qty: number): number {
  return TICK[symbol].commission * 2 * qty;
}

export function computeNetPnl(
  symbol: Symbol,
  direction: "long" | "short",
  entry: number,
  exit: number,
  qty: number,
  slippage = 0,
): number {
  return computeGrossPnl(symbol, direction, entry, exit, qty)
    - computeCommission(symbol, qty)
    - slippage;
}

// ---- Signal threshold computation ---------------------------------------

export function computeThresholds(
  spec: StrategySpec,
  ctx: {
    prevHigh?: number; prevLow?: number; prevClose?: number;
    overnightHigh?: number; overnightLow?: number;
    atr: number;
  },
): { upper: number | null; lower: number | null; r4?: number; s4?: number; distanceThreshold?: number } {
  const m = spec.thresholdMultiple;
  switch (spec.family) {
    case "prior_day_range_fade":
    case "prior_day_range_breakout": {
      if (ctx.prevHigh == null || ctx.prevLow == null) return { upper: null, lower: null };
      return { upper: ctx.prevHigh + m * ctx.atr, lower: ctx.prevLow - m * ctx.atr };
    }
    case "overnight_range_breakout": {
      if (ctx.overnightHigh == null || ctx.overnightLow == null) return { upper: null, lower: null };
      return { upper: ctx.overnightHigh + m * ctx.atr, lower: ctx.overnightLow - m * ctx.atr };
    }
    case "camarilla_breakout": {
      if (ctx.prevHigh == null || ctx.prevLow == null || ctx.prevClose == null) return { upper: null, lower: null };
      const range = ctx.prevHigh - ctx.prevLow;
      const r4 = ctx.prevClose + 1.1 * range / 2;
      const s4 = ctx.prevClose - 1.1 * range / 2;
      return { upper: r4 + m * ctx.atr, lower: s4 - m * ctx.atr, r4, s4 };
    }
    case "prior_day_close_reversion": {
      // distance-based — thresholds expressed as distance
      return { upper: null, lower: null, distanceThreshold: m };
    }
  }
}

export function evaluateSignal(
  spec: StrategySpec,
  signalClose: number,
  ctx: {
    prevHigh?: number; prevLow?: number; prevClose?: number;
    overnightHigh?: number; overnightLow?: number;
    atr: number;
  },
): { direction: "long" | "short" | "none"; distance?: number; upper?: number | null; lower?: number | null; r4?: number; s4?: number } {
  if (spec.family === "prior_day_close_reversion") {
    if (ctx.prevClose == null || ctx.atr <= 0) return { direction: "none" };
    const distance = (signalClose - ctx.prevClose) / ctx.atr;
    const thr = spec.thresholdMultiple;
    if (distance > thr) return { direction: "short", distance };  // fade
    if (distance < -thr) return { direction: "long", distance };
    return { direction: "none", distance };
  }
  const t = computeThresholds(spec, ctx);
  if (t.upper == null || t.lower == null) return { direction: "none", ...t };
  if (signalClose > t.upper) {
    return { direction: spec.isFade ? "short" : "long", ...t };
  }
  if (signalClose < t.lower) {
    return { direction: spec.isFade ? "long" : "short", ...t };
  }
  return { direction: "none", ...t };
}

// ---- ET clock ------------------------------------------------------------

export type EtNow = {
  dow: number;
  hh: number;
  mm: number;
  dateStr: string;
  weekdayName: string;
};

export function nowInET(now: Date = new Date()): EtNow {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wkMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = wkMap[get("weekday")] ?? 0;
  const hh = parseInt(get("hour"), 10);
  // Intl returns "24" at midnight in some browsers
  const safeHh = hh === 24 ? 0 : hh;
  const mm = parseInt(get("minute"), 10);
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const fiNames = ["Sunnuntai", "Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai", "Lauantai"];
  return { dow, hh: safeHh, mm, dateStr, weekdayName: fiNames[dow] };
}

function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

export type TodayItem = {
  spec: StrategySpec;
  status: "upcoming" | "active" | "completed";
  alerts: string[];
};

export function getTodayStrategies(now: Date = new Date()): TodayItem[] {
  const { dow, hh, mm } = nowInET(now);
  if (dow === 0 || dow === 6) return [];
  const cur = hh * 60 + mm;
  return STRATEGIES.map((spec) => {
    const start = hhmmToMin(spec.sessionStartEt);
    const end = hhmmToMin(spec.sessionEndEt);
    let status: TodayItem["status"];
    if (cur < start) status = "upcoming";
    else if (cur < end) status = "active";
    else status = "completed";
    const alerts: string[] = [];
    if (cur >= start - 15 && cur < start) alerts.push("Sessio alkaa < 15 min");
    if (status === "active") alerts.push("Sessio aktiivinen");
    if (spec.warning) alerts.push(spec.warning);
    return { spec, status, alerts };
  });
}

// ---- Self-tests ---------------------------------------------------------

export type TestResult = { name: string; pass: boolean; detail: string };

function approx(a: number, b: number, eps = 1e-6) { return Math.abs(a - b) <= eps; }

export function runPhidiasTests(): TestResult[] {
  const out: TestResult[] = [];

  // MNQ long PnL
  {
    const gross = computeGrossPnl("MNQ", "long", 30000, 30010, 4);
    const comm = computeCommission("MNQ", 4);
    const net = gross - comm;
    out.push({
      name: "MNQ long 30000→30010 ×4",
      pass: approx(gross, 80) && approx(comm, 6.32) && approx(net, 73.68, 1e-4),
      detail: `gross=${gross} comm=${comm} net=${net}`,
    });
  }
  // GC short
  {
    const gross = computeGrossPnl("GC", "short", 4300.0, 4290.0, 1);
    const comm = computeCommission("GC", 1);
    out.push({
      name: "GC short 4300→4290 ×1",
      pass: approx(gross, 1000) && approx(comm, 4.84) && approx(gross - comm, 995.16, 1e-3),
      detail: `gross=${gross} comm=${comm} net=${gross - comm}`,
    });
  }
  // NG long
  {
    const gross = computeGrossPnl("NG", "long", 3.000, 3.010, 1);
    const comm = computeCommission("NG", 1);
    out.push({
      name: "NG long 3.000→3.010 ×1",
      pass: approx(gross, 100, 1e-6) && approx(comm, 4.64) && approx(gross - comm, 95.36, 1e-3),
      detail: `gross=${gross} comm=${comm} net=${gross - comm}`,
    });
  }
  // Prior day range fade
  {
    const fadeSpec = STRATEGIES.find((s) => s.id === "2828f5a")!;
    const t = computeThresholds(fadeSpec, { prevHigh: 30000, prevLow: 29800, atr: 100 });
    const okThr = approx(t.upper!, 30025) && approx(t.lower!, 29775);
    const sigShort = evaluateSignal(fadeSpec, 30030, { prevHigh: 30000, prevLow: 29800, atr: 100 });
    const sigLong  = evaluateSignal(fadeSpec, 29770, { prevHigh: 30000, prevLow: 29800, atr: 100 });
    out.push({
      name: "Range fade thresholds + signals",
      pass: okThr && sigShort.direction === "short" && sigLong.direction === "long",
      detail: `upper=${t.upper} lower=${t.lower} short=${sigShort.direction} long=${sigLong.direction}`,
    });
  }
  // Prior day range breakout
  {
    const bSpec = STRATEGIES.find((s) => s.id === "cd8e66")!;
    const sigLong  = evaluateSignal(bSpec, 30030, { prevHigh: 30000, prevLow: 29800, atr: 100 });
    const sigShort = evaluateSignal(bSpec, 29770, { prevHigh: 30000, prevLow: 29800, atr: 100 });
    out.push({
      name: "Range breakout signals (LONG above, SHORT below)",
      pass: sigLong.direction === "long" && sigShort.direction === "short",
      detail: `up=${sigLong.direction} dn=${sigShort.direction}`,
    });
  }
  // Reversion
  {
    const r = STRATEGIES.find((s) => s.id === "4ac847")!;
    const sShort = evaluateSignal(r, 30060, { prevClose: 30000, atr: 100 });
    const sLong  = evaluateSignal(r, 29940, { prevClose: 30000, atr: 100 });
    out.push({
      name: "Reversion distance signals",
      pass: sShort.direction === "short" && approx(sShort.distance!, 0.6, 1e-9)
         && sLong.direction === "long" && approx(sLong.distance!, -0.6, 1e-9),
      detail: `short=${sShort.distance} long=${sLong.distance}`,
    });
  }
  // Camarilla
  {
    const c = STRATEGIES.find((s) => s.id === "6d352449")!;
    const t = computeThresholds(c, { prevHigh: 30500, prevLow: 29500, prevClose: 30000, atr: 0 });
    out.push({
      name: "Camarilla R4/S4 calculation",
      pass: approx(t.r4!, 30550) && approx(t.s4!, 29450),
      detail: `R4=${t.r4} S4=${t.s4}`,
    });
  }
  return out;
}
