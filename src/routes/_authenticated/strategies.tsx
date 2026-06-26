import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { TodayQuickView, WeeklyCalendar } from "@/components/today-quick-view";
import {
  STRATEGIES, TICK,
  PORTFOLIO_NAME, PORTFOLIO_SUBTITLE, PORTFOLIO_STATUS,
} from "@/lib/strategies";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/strategies")({
  component: StrategiesPage,
});

// ---- Per-strategy execution playbook ------------------------------------

type StyleTag = "BREAKOUT" | "FADE" | "REVERSION";

interface Playbook {
  style: StyleTag;
  calc: string[];                  // "What to compute"
  levels?: string[];               // optional "compute levels"
  signal: { condition: string; action: string; dir: "LONG" | "SHORT" }[];
  notes?: string[];                // extra inline notes (before risk)
  doNotForget: string[];
}

const PLAYBOOKS: Record<string, Playbook> = {
  "2828f5a": {
    style: "FADE",
    calc: ["ATR(24)", "Previous day high", "Previous day low"],
    levels: [
      "Upper level = Prev High + 0.25 × ATR",
      "Lower level = Prev Low − 0.25 × ATR",
    ],
    signal: [
      { condition: "Suljettu 15m sulkeutuu upper levelin yli", action: "ENTER SHORT", dir: "SHORT" },
      { condition: "Suljettu 15m sulkeutuu lower levelin alle", action: "ENTER LONG", dir: "LONG" },
    ],
    doNotForget: [
      "Älä koskaan enteröi signaalikynttilän sulussa",
      "Entry = seuraavan 15m kynttilän avaus",
      "Hard flat 16:45 ET",
    ],
  },
  "3314fd": {
    style: "BREAKOUT",
    calc: ["ATR(16)", "Overnight High", "Overnight Low"],
    levels: [
      "Upper level = ON High + 0.25 × ATR",
      "Lower level = ON Low − 0.25 × ATR",
    ],
    signal: [
      { condition: "Upper level break", action: "ENTER LONG", dir: "LONG" },
      { condition: "Lower level break", action: "ENTER SHORT", dir: "SHORT" },
    ],
    doNotForget: [
      "Overnight high/low täytyy olla tiedossa ennen entryä",
      "Varmista OHLC-ankkurointi",
      "Entry = seuraavan 30m kynttilän avaus",
      "Hard flat 16:45 ET",
    ],
  },
  "4ac847": {
    style: "REVERSION",
    calc: ["ATR(5)", "Previous day close"],
    levels: ["distance = (close − prev close) / ATR"],
    signal: [
      { condition: "distance > 0.5", action: "ENTER SHORT", dir: "SHORT" },
      { condition: "distance < −0.5", action: "ENTER LONG", dir: "LONG" },
    ],
    notes: [
      "Tämä strategia käyttää eri RR-suhdetta: 1.0 / 2.0",
      "Älä käytä 1.5 / 3.0 asetuksia",
    ],
    doNotForget: [
      "Entry = seuraavan 60m kynttilän avaus",
      "Max hold 720 min — pidempi kuin muilla",
      "Hard flat 16:45 ET",
    ],
  },
  "e652": {
    style: "REVERSION",
    calc: ["ATR(36)", "Previous day close"],
    levels: ["distance = (close − prev close) / ATR"],
    signal: [
      { condition: "distance > 1.25", action: "ENTER SHORT", dir: "SHORT" },
      { condition: "distance < −1.25", action: "ENTER LONG", dir: "LONG" },
    ],
    notes: ["High risk strategy"],
    doNotForget: [
      "Losing streak kill = 6 (ei 8)",
      "Entry = seuraavan 5m kynttilän avaus",
      "Hard flat 16:45 ET",
    ],
  },
  "c2c181": {
    style: "FADE",
    calc: ["ATR(6)", "Previous day high", "Previous day low"],
    levels: [
      "Upper level = Prev High + 0.25 × ATR",
      "Lower level = Prev Low − 0.25 × ATR",
    ],
    signal: [
      { condition: "Upper break", action: "ENTER SHORT", dir: "SHORT" },
      { condition: "Lower break", action: "ENTER LONG", dir: "LONG" },
    ],
    doNotForget: [
      "Tämä on FADE — vastakkainen suunta kuin breakout",
      "Entry = seuraavan 30m kynttilän avaus",
      "Hard flat 16:45 ET",
    ],
  },
  "cd8e66": {
    style: "BREAKOUT",
    calc: ["ATR(5)", "Previous day high", "Previous day low"],
    levels: [
      "Upper level = Prev High + 0.25 × ATR",
      "Lower level = Prev Low − 0.25 × ATR",
    ],
    signal: [
      { condition: "Upper break", action: "ENTER LONG", dir: "LONG" },
      { condition: "Lower break", action: "ENTER SHORT", dir: "SHORT" },
    ],
    doNotForget: [
      "Tämä on BREAKOUT — myötäsuuntainen",
      "Entry = seuraavan 15m kynttilän avaus",
      "Hard flat 16:45 ET",
    ],
  },
  "6d352449": {
    style: "BREAKOUT",
    calc: ["ATR(6)", "Camarilla R4", "Camarilla S4"],
    levels: [
      "R4 = Prev Close + 1.1 × Range / 2",
      "S4 = Prev Close − 1.1 × Range / 2",
      "Range = Prev High − Prev Low",
    ],
    signal: [
      { condition: "R4 break", action: "ENTER LONG", dir: "LONG" },
      { condition: "S4 break", action: "ENTER SHORT", dir: "SHORT" },
    ],
    notes: ["Korkea false discovery -riski", "Seuraa erillisenä strategiana"],
    doNotForget: [
      "Entry = seuraavan 30m kynttilän avaus",
      "Hard flat 16:45 ET",
    ],
  },
  "ac172a2d": {
    style: "BREAKOUT",
    calc: ["ATR(5)", "Camarilla R4", "Camarilla S4"],
    levels: [
      "R4 = Prev Close + 1.1 × Range / 2",
      "S4 = Prev Close − 1.1 × Range / 2",
      "Range = Prev High − Prev Low",
    ],
    signal: [
      { condition: "R4 break", action: "ENTER LONG", dir: "LONG" },
      { condition: "S4 break", action: "ENTER SHORT", dir: "SHORT" },
    ],
    notes: ["High risk strategy"],
    doNotForget: [
      "Losing streak kill = 6 (ei 8)",
      "Entry = seuraavan 30m kynttilän avaus",
      "Hard flat 16:45 ET",
    ],
  },
};

const SHORT_NAMES: Record<string, string> = {
  "2828f5a": "MNQ Prior Day Range Fade",
  "3314fd": "MNQ Overnight Range Breakout",
  "4ac847": "MNQ Prior Day Close Reversion",
  "e652": "MNQ US Open Reversion",
  "c2c181": "MNQ London Range Fade",
  "cd8e66": "MNQ Afternoon Breakout",
  "6d352449": "GC Camarilla Breakout",
  "ac172a2d": "NG Camarilla Breakout",
};

const UNIVERSAL_RULES = [
  "Chart timezone = New York (ET)",
  "Helsinki-aika on vain helper",
  "Käytä aina suljettua signaalibaria",
  "Älä koskaan enteröi signaalibarin sulussa",
  "Entry = seuraavan saman timeframe-barin avaus",
  "Stop ja target asetetaan välittömästi",
  "Ei overnight-positioita",
  "Hard flat = 16:45 ET",
  "Sama strategia ei voi avata uutta positiota jos edellinen on vielä auki",
];

const UNIVERSAL_JOURNAL = [
  "theoretical entry",
  "actual fill",
  "screenshot",
  "execution error kyllä/ei",
];

const CHECKLIST_ITEMS = [
  "Session OK",
  "Signal candle closed",
  "Entry candle identified",
  "Stop placed",
  "Target placed",
  "Screenshot taken",
  "Journal completed",
];

const STYLE_BADGE: Record<StyleTag, string> = {
  BREAKOUT: "bg-success text-success-foreground hover:bg-success/90",
  FADE: "bg-warning text-warning-foreground hover:bg-warning/90",
  REVERSION: "bg-primary text-primary-foreground hover:bg-primary/90",
};

const DIR_BADGE: Record<"LONG" | "SHORT", string> = {
  LONG: "bg-success/15 text-success border-success/30",
  SHORT: "bg-destructive/15 text-destructive border-destructive/30",
};

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

      {/* Universal rules */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            UNIVERSAL RULES
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-1.5 text-sm">
            {UNIVERSAL_RULES.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="text-primary mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-md bg-secondary/40 border p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1.5">
              Kirjaa aina
            </div>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              {UNIVERSAL_JOURNAL.map((j) => (
                <li key={j} className="flex gap-2">
                  <span className="text-primary mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
                  <span>{j}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Execution Playbook</h2>
        {STRATEGIES.map((s) => (
          <ExecutionCard key={s.id} spec={s} />
        ))}
      </div>
    </div>
  );
}

function ExecutionCard({ spec }: { spec: (typeof STRATEGIES)[number] }) {
  const pb = PLAYBOOKS[spec.id];
  const tick = TICK[spec.symbol];
  const shortName = SHORT_NAMES[spec.id] ?? spec.fullId;
  if (!pb) return null;

  const stats = [
    { label: "Instrumentti", value: spec.symbol },
    { label: "Session", value: `${spec.sessionStartEt}–${spec.sessionEndEt} ET` },
    { label: "Timeframe", value: spec.timeframe },
    { label: "Qty", value: `${spec.qty}` },
    { label: "Stop", value: `${spec.stopMultiple} × ATR` },
    { label: "Target", value: `${spec.targetMultiple} × ATR` },
    { label: "Max hold", value: `${spec.maxHoldMinutes} min` },
    { label: "Streak kill", value: `${spec.killRule.losingStreak}` },
  ];

  return (
    <Card>
      <Accordion type="single" collapsible defaultValue={spec.id}>
        <AccordionItem value={spec.id} className="border-b-0">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <div className="flex flex-wrap items-center gap-2 text-left">
              <Badge className={STYLE_BADGE[pb.style]}>{pb.style}</Badge>
              <Badge variant="outline" className="font-mono text-[10px]">{spec.id}</Badge>
              <span className="font-semibold text-sm md:text-base">{shortName}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 space-y-5">
            {/* Key stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stats.map((st) => (
                <div key={st.label} className="rounded-md border bg-secondary/30 p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                    {st.label}
                  </div>
                  <div className="text-base font-semibold tabular-nums mt-0.5">{st.value}</div>
                </div>
              ))}
            </div>

            {/* What to compute */}
            <Section title="Mitä lasketaan?">
              <BulletList items={pb.calc} mono />
            </Section>

            {/* Levels */}
            {pb.levels && (
              <Section title="Laske rajat">
                <BulletList items={pb.levels} mono />
              </Section>
            )}

            {/* Signal */}
            <Section title="Signaali">
              <ul className="space-y-2">
                {pb.signal.map((sig) => (
                  <li key={sig.condition} className="rounded-md border bg-background p-3">
                    <div className="text-sm">{sig.condition}:</div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant="outline" className={`font-mono text-xs ${DIR_BADGE[sig.dir]}`}>
                        → {sig.action}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            {/* Notes */}
            {pb.notes && pb.notes.length > 0 && (
              <Section title="Huomioi">
                <BulletList items={pb.notes} />
              </Section>
            )}

            {/* Commission helper */}
            <div className="text-xs text-muted-foreground">
              Komissio: <span className="font-mono">${tick.commission}</span> / side / contract
            </div>

            {/* Execution checklist */}
            <ExecutionChecklist strategyId={spec.id} />

            {/* Do not forget */}
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3">
              <div className="flex items-center gap-2 text-destructive font-semibold text-sm mb-2">
                <AlertTriangle className="h-4 w-4" />
                DO NOT FORGET
              </div>
              <ul className="space-y-1 text-sm">
                {pb.doNotForget.map((d) => (
                  <li key={d} className="flex gap-2">
                    <span className="text-destructive mt-1.5 h-1 w-1 rounded-full bg-destructive shrink-0" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function BulletList({ items, mono = false }: { items: string[]; mono?: boolean }) {
  return (
    <ul className="space-y-1 text-sm">
      {items.map((it) => (
        <li key={it} className="flex gap-2">
          <span className="text-primary mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
          <span className={mono ? "font-mono text-[13px]" : ""}>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function ExecutionChecklist({ strategyId }: { strategyId: string }) {
  const storageKey = `phidias.checklist.${strategyId}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [storageKey]);

  const toggle = (item: string) => {
    setChecked((prev) => {
      const next = { ...prev, [item]: !prev[item] };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const reset = () => {
    setChecked({});
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  };

  const doneCount = CHECKLIST_ITEMS.filter((i) => checked[i]).length;

  return (
    <div className="rounded-md border bg-secondary/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          Execution Checklist
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {doneCount} / {CHECKLIST_ITEMS.length}
          </span>
          <button
            type="button"
            onClick={reset}
            className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
          >
            reset
          </button>
        </div>
      </div>
      <ul className="space-y-1.5">
        {CHECKLIST_ITEMS.map((item) => {
          const id = `${strategyId}-${item}`;
          const isChecked = !!checked[item];
          return (
            <li key={item} className="flex items-center gap-2.5">
              <Checkbox
                id={id}
                checked={isChecked}
                onCheckedChange={() => toggle(item)}
              />
              <label
                htmlFor={id}
                className={`text-sm cursor-pointer select-none ${
                  isChecked ? "line-through text-muted-foreground" : ""
                }`}
              >
                {item}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
