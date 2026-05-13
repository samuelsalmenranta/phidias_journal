// Strategy definitions - DO NOT modify the parameters.
export type Symbol = "ES" | "YM" | "HG";

export const TICK = {
  ES: { size: 0.25, value: 12.5 },
  YM: { size: 1, value: 5 },
  HG: { size: 0.0005, value: 12.5 },
} as const;

export const PORTFOLIO = {
  current: { ES: 4, HG: 3, YM: 3 },
  optimized: { ES: 5, HG: 2, YM: 3 },
} as const;

export interface StrategySpec {
  id: string;
  symbol: Symbol;
  name: string;
  logic: string;
  days: string;
  etWindow: string;
  helsinkiWindow: string;
  entryTimeEt: string;
  stopTicks: number;
  targetTicks: number;
  stopPriceDistance: number;
  targetPriceDistance: number;
  currentQty: number;
  optimizedQty: number;
  notes: string[];
  warning?: string;
}

export const STRATEGIES: StrategySpec[] = [
  {
    id: "ES_gap_follow_fade_964",
    symbol: "ES",
    name: "ES_gap_follow_fade_964",
    logic: "Gap follow — gap up = long, gap down = short",
    days: "Tiistai–perjantai (ei maanantaisin)",
    etWindow: "09:30–11:15 ET",
    helsinkiWindow: "16:30–18:15 Helsinki",
    entryTimeEt: "10:00",
    stopTicks: 16,
    targetTicks: 72,
    stopPriceDistance: 4.0,
    targetPriceDistance: 18.0,
    currentQty: PORTFOLIO.current.ES,
    optimizedQty: PORTFOLIO.optimized.ES,
    notes: [
      "Käytä edellisen ET-päivän 16:45 timestampatun 15 min kynttilän close (ei daily candlea).",
      "Tämän päivän 09:30 ET kynttilän open.",
      "gap_pct = (today_09:30_open − previous_day_16:45_close) / previous_day_16:45_close × 100.",
      "Ehto: abs(gap_pct) ≥ 0.7 %.",
      "Confirmation: long jos 09:30 close > open, short jos close < open. Muuten ei treidiä.",
      "Entry = 10:00 ET candle open. 09:45 on vain delay, ei filtteri.",
      "Max hold 4 baria — timed exit 11:00 timestampatun kynttilän close.",
    ],
  },
  {
    id: "YM_gap_follow_fade_3020",
    symbol: "YM",
    name: "YM_gap_follow_fade_3020",
    logic: "Gap fade — gap up = short, gap down = long",
    days: "Tiistai–perjantai (ei maanantaisin)",
    etWindow: "02:00–05:00 ET",
    helsinkiWindow: "09:00–12:00 Helsinki",
    entryTimeEt: "02:30",
    stopTicks: 24,
    targetTicks: 72,
    stopPriceDistance: 24,
    targetPriceDistance: 72,
    currentQty: PORTFOLIO.current.YM,
    optimizedQty: PORTFOLIO.optimized.YM,
    notes: [
      "previous_day_red = previous_day_16:45_close < previous_day_02:00_open. Jos ei täyty, ei treidiä.",
      "gap_pct = (today_02:00_open − previous_day_16:45_close) / previous_day_16:45_close × 100.",
      "Ehto: abs(gap_pct) ≥ 0.7 %.",
      "Ei first-bar confirmationia. 02:15 on vain delay.",
      "Entry = 02:30 ET candle open.",
      "Max hold 4 baria — timed exit 03:30 close. Viimeistään flat 05:00 ET.",
    ],
  },
  {
    id: "HG_imbalance_reversal_5549",
    symbol: "HG",
    name: "HG_imbalance_reversal_5549",
    logic: "Imbalance reversal — iso vihreä = short, iso punainen = long",
    days: "Maanantai–perjantai",
    etWindow: "13:30–16:45 ET",
    helsinkiWindow: "20:30–23:45 Helsinki",
    entryTimeEt: "next candle open",
    stopTicks: 16,
    targetTicks: 72,
    stopPriceDistance: 0.008,
    targetPriceDistance: 0.036,
    currentQty: PORTFOLIO.current.HG,
    optimizedQty: PORTFOLIO.optimized.HG,
    warning:
      "HG cutoff: jos 16:30 ET entry on vielä auki noin 16:43–16:44 ET, sulje manuaalisesti ennen Lucid 16:45 ET cutoffia. Kirjaa exit_reason = manual_flatten_before_1645.",
    notes: [
      "Ensimmäinen signaalikynttilä 13:45 ET, viimeinen 16:15 ET. Ensimmäinen entry 14:00 ET, viimeinen backtest-entry 16:30 ET.",
      "body_pct = abs(close − open) / open × 100; ehto ≥ 0.5 %.",
      "body_fraction = abs(close − open) / (high − low); ehto ≥ 0.55. Jos high == low, käytä 1 tickiä rangena.",
      "Entry on aina seuraavan 15 min kynttilän open.",
      "Max hold 4 baria — esim. entry 14:00 → exit 15:00 close.",
    ],
  },
];

export const PORTFOLIO_NOTE =
  "Paper-forwardissa seurataan molempia rinnakkain. Current V2 on benchmark. Optimized V2 on korkeamman tuotto-odotuksen haastaja, mutta siinä on enemmän ES-painoa.";

export const GENERAL_RULES = [
  "Chart timeframe: 15 min",
  "Chart timezone: New York / ET",
  "Entry aina seuraavan kynttilän open — ei koskaan signaalikynttilän closeen",
  "Yksi treidi per strategia per päivä",
  "Stop ja target aktiiviseksi heti entrystä",
  "Jos stop ja target osuvat saman 15 min kynttilän aikana, oletus on stop-first",
  "Ei overnight-holdia — kaikki positiot flat ennen Lucidin 16:45 ET cutoffia",
  "Paperissa kirjataan sekä theoretical/backtest-fill että actual/paper-fill",
  "Päästressi: +0.5 tick per side. Hard stress: +1.0 tick per side",
];

export const DAY_CHECKLIST: Record<number, { sym: Symbol; window: string }[]> = {
  0: [], // Sun
  1: [{ sym: "HG", window: "20:30–23:45 Helsinki" }],
  2: [
    { sym: "YM", window: "09:00–12:00 Helsinki" },
    { sym: "ES", window: "16:30–18:15 Helsinki" },
    { sym: "HG", window: "20:30–23:45 Helsinki" },
  ],
  3: [
    { sym: "YM", window: "09:00–12:00 Helsinki" },
    { sym: "ES", window: "16:30–18:15 Helsinki" },
    { sym: "HG", window: "20:30–23:45 Helsinki" },
  ],
  4: [
    { sym: "YM", window: "09:00–12:00 Helsinki" },
    { sym: "ES", window: "16:30–18:15 Helsinki" },
    { sym: "HG", window: "20:30–23:45 Helsinki" },
  ],
  5: [
    { sym: "YM", window: "09:00–12:00 Helsinki" },
    { sym: "ES", window: "16:30–18:15 Helsinki" },
    { sym: "HG", window: "20:30–23:45 Helsinki" },
  ],
  6: [], // Sat
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
