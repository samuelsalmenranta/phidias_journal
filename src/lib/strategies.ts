// LucidDirect capacity_rank1_gc portfolio — DO NOT modify strategy parameters.
export type Symbol = "YM" | "HG" | "MES" | "GC" | "MGC";

export const TICK = {
  YM:  { size: 1,      value: 5.0  },
  HG:  { size: 0.0005, value: 12.5 },
  MES: { size: 0.25,   value: 1.25 },
  GC:  { size: 0.10,   value: 10.0 },
  MGC: { size: 0.10,   value: 1.0  },
} as const;

// Primary high-EV portfolio (with GC) and GC-free conservative comparison.
// We re-use the existing "current"/"optimized" DB columns:
//   current   = Primary (with GC)
//   optimized = GC-free comparison
export const PORTFOLIO = {
  primary: { YM: 4, HG: 5, MES: 20, GC: 4, MGC: 0 },
  gcFree:  { YM: 9, HG: 2, MES: 10, GC: 0, MGC: 0 },
} as const;

// Mini-equivalent per contract (Lucid 10 mini / 100 micro concurrent rule)
export const MINI_EQ_PER_CONTRACT: Record<Symbol, number> = {
  YM:  1,    // 1 mini = 1 mini-eq
  HG:  1,    // 1 HG mini = 1 mini-eq
  MES: 0.1,  // 10 micros = 1 mini-eq
  GC:  1,    // 1 GC mini = 1 mini-eq
  MGC: 0.1,  // 10 micros = 1 mini-eq
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
    id: "GC_gap_phase1_16",
    symbol: "GC",
    name: "GC_gap_phase1_16",
    logic: "Seuraa aamugappia. Gap ylös = osta, gap alas = myy.",
    days: "Kaikki viikonpäivät",
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
    stopPriceDistance: 2.4,
    targetPriceDistance: 7.2,
    maxHoldBars: 4,
    primaryQty: PORTFOLIO.primary.GC,
    gcFreeQty: PORTFOLIO.gcFree.GC,
    warning:
      "Korkein EV mutta riskisin jalka. Seuraa 10 treidin rullaavaa PnL:ää.",
    notes: [
      "Edellinen päivä punainen: eilen 16:45 ET hinta oli ALLE eilen 09:30 ET hinnan.",
      "Laske gap: (tänään 09:30 ET hinta − eilen 16:45 ET hinta) / eilen 16:45 ET hinta × 100.",
      "Gap oltava yli +0.7% tai alle −0.7%.",
      "Vahvistus: katso 09:30−09:45 ET kynttilä. Gap ylös → kynttilän pitää sulkeutua vihreänä. Gap alas → kynttilän pitää sulkeutua punaisena.",
      "Entry: 09:45 ET kynttilän avautuessa.",
      "Stop 24 tickiä, target 72 tickiä, pidä enintään 4 kynttilää.",
      "Sulje viimeistään 16:45 ET.",
      "Kaikki viikonpäivät.",
    ],
  }),
  mk({
    id: "HG_imbalance_reversal_17734",
    symbol: "HG",
    name: "HG_imbalance_reversal_17734",
    logic: "Iso kynttilä = käänne. Iso nousu = myy, iso lasku = osta.",
    days: "Tiistai−perjantai (ei maanantaisin)",
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
      "Sulje viimeistään 16:45 ET. Jos 16:30 ET entry on auki klo 16:43, sulje manuaalisesti.",
    notes: [
      "Sessio alkaa 13:30 ET. Odota 2 kynttilää — älä katso signaalia ennen 14:00 ET.",
      "Etsi iso kynttilä: (|sulkemishinta − avaushinta|) / avaushinta × 100 oltava yli 0.5%.",
      "Lisäksi: kynttilän body oltava yli 55% koko kynttilän pituudesta (eli lyhyet hännät).",
      "Iso vihreä kynttilä (nousu) → myy seuraavan kynttilän avauksessa.",
      "Iso punainen kynttilä (lasku) → osta seuraavan kynttilän avauksessa.",
      "Viimeinen sallittu entry: 16:15 ET.",
      "Stop 16 tickiä, target 72 tickiä, pidä enintään 2 kynttilää.",
      "Tiistai−perjantai (ei maanantaisin).",
    ],
  }),
  mk({
    id: "MGC_imbalance_reversal_europe_x10",
    symbol: "MGC",
    name: "MGC_imbalance_reversal_europe_x10",
    logic: "Etsi Eurooppa-session aikana iso 15 min kynttilä ja treidaa seuraavan kynttilän openissa vastakkaiseen suuntaan.",
    days: "Tiistai−perjantai (ei maanantaisin)",
    noMonday: true,
    sessionName: "Europe / Globex",
    sessionStartEt: "02:00",
    sessionEndEt: "04:45",
    etWindow: "02:00–04:45 ET",
    helsinkiWindowNormal: "09:00–11:45 (entry-ikkuna)",
    helsinkiWindowDst: "08:00–10:45 (entry-ikkuna)",
    entryTimeEt: "next-bar open",
    possibleEntryTimesEt: [
      "02:15","02:30","02:45","03:00",
      "03:15","03:30","03:45","04:00",
      "04:15","04:30","04:45",
    ],
    stopTicks: 24,
    targetTicks: 120,
    stopPriceDistance: 2.4,
    targetPriceDistance: 12.0,
    maxHoldBars: 2,
    primaryQty: 10,
    gcFreeQty: 0,
    notes: [
      "Session 02:00–04:45 ET. Etsi iso 15 min kynttilä, joka täyttää molemmat ehdot.",
      "Body %: |sulkemishinta − avaushinta| / avaushinta × 100 ≥ 0.35%.",
      "Body fraction: |sulkemishinta − avaushinta| / (korkein − matalin) ≥ 0.55.",
      "Jos korkein = matalin, signaalia ei oteta.",
      "Vihreä signaalikynttilä (close > open) → short seuraavan kynttilän avauksessa.",
      "Punainen signaalikynttilä (close < open) → long seuraavan kynttilän avauksessa.",
      "Stop 24 tickiä = 2.40 gold-pistettä. Target 120 tickiä = 12.00 gold-pistettä.",
      "Pidä enintään 2 kynttilää (noin 30 min). Jos stop tai target ei osu, sulje max hold -ajan lopussa.",
      "Tiistai−perjantai (ei maanantaisin). Max 1 treidi per päivä.",
    ],
  }),
  mk({
    id: "YM_gap_follow_fade_3020",
    symbol: "YM",
    name: "YM_gap_follow_fade_3020",
    logic: "Fadaa aamugappi. Gap ylös = myy, gap alas = osta.",
    days: "Tiistai−perjantai (ei maanantaisin)",
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
      "Edellinen päivä punainen: eilen 16:45 ET hinta oli ALLE eilen 02:00 ET hinnan.",
      "Laske gap: (tänään 02:00 ET hinta − eilen 16:45 ET hinta) / eilen 16:45 ET hinta × 100.",
      "Gap oltava yli +0.7% tai alle −0.7%.",
      "Gap ylös → myy, gap alas → osta (ei vahvistuskynttilää).",
      "Entry: 02:30 ET kynttilän avautuessa.",
      "Stop 24 pistettä, target 72 pistettä, pidä enintään 4 kynttilää.",
      "Sulje viimeistään 05:00 ET.",
      "Tiistai−perjantai (ei maanantaisin).",
    ],
  }),
  mk({
    id: "MES_trend_continuation_1216",
    symbol: "MES",
    name: "MES_trend_continuation_1216",
    logic: "Jatka trendiä. 4 kynttilän nettoliike ≥ 0.3% + vahvistus = osta tai myy.",
    days: "Tiistai−perjantai (ei maanantaisin)",
    noMonday: true,
    sessionName: "Europe / Globex",
    sessionStartEt: "02:00",
    sessionEndEt: "05:00",
    etWindow: "02:00–05:00 ET",
    helsinkiWindowNormal: "10:00–11:45 (entry-ikkuna)",
    helsinkiWindowDst: "09:00–10:45 (entry-ikkuna)",
    entryTimeEt: "03:00–04:45",
    possibleEntryTimesEt: [
      "03:00","03:15","03:30","03:45",
      "04:00","04:15","04:30","04:45",
    ],
    stopTicks: 48,
    targetTicks: 120,
    stopPriceDistance: 12,
    targetPriceDistance: 30,
    maxHoldBars: 4,
    primaryQty: PORTFOLIO.primary.MES,
    gcFreeQty: PORTFOLIO.gcFree.MES,
    notes: [
      "Odota 4 kynttilää. Laske nettoliike: kynttilä 4:n sulkemishinta − kynttilä 1:n avaushinta / kynttilä 1:n avaushinta × 100.",
      "Nettoliikkeen oltava yli +0.3% tai alle −0.3% (käytännössä noin 17 pistettä nykyhinnoilla).",
      "Vahvistus: kynttilä 4 pitää sulkeutua liikkeen suuntaan. Nousu → kynttilä 4 vihreä. Lasku → kynttilä 4 punainen.",
      "Nousu + vihreä vahvistus → osta kynttilä 5:n avauksessa.",
      "Lasku + punainen vahvistus → myy kynttilä 5:n avauksessa.",
      "Entry mahdollinen klo 03:00−04:45 ET.",
      "Stop 48 tickiä, target 120 tickiä, pidä enintään 4 kynttilää.",
      "Sulje viimeistään 05:00 ET.",
      "Tiistai−perjantai (ei maanantaisin).",
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
      alerts.push("Jos 16:30 ET entry on auki klo 16:43, sulje manuaalisesti.");
    }
    if (s.symbol === "GC") alerts.push("Korkein EV mutta riskisin jalka. Seuraa 10 treidin rullaavaa PnL:ää.");
    return { sym: s.symbol, spec: s, status, alerts };
  });
}
