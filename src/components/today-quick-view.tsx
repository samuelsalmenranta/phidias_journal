import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTodayStrategies, nowInET, STRATEGIES, type TodayItem } from "@/lib/strategies";
import { AlertTriangle, Calendar, Clock } from "lucide-react";

export function TodayQuickView() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  void tick;

  const { weekdayName, dateStr, hh, mm, dow } = nowInET();
  const items = getTodayStrategies();
  const etTime = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} ET`;

  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">
              <Calendar className="h-3.5 w-3.5" /> Tänään (ET)
            </div>
            <h2 className="text-lg font-semibold mt-0.5">{weekdayName} · {dateStr}</h2>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" /> {etTime}
            </div>
          </div>
          {dow === 0 || dow === 6 ? (
            <Badge variant="secondary">Viikonloppu</Badge>
          ) : (
            <Badge>{items.length} jalkaa aktiivisia</Badge>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ei treidejä — viikonloppu. La/Su ei treidata.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {items.map((it) => <TodayCard key={it.spec.id} item={it} />)}
          </div>
        )}

        <div className="mt-4 flex gap-2 items-start text-xs text-muted-foreground rounded-md bg-warning/10 border border-warning/30 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-warning shrink-0" />
          <span>
            Käytä chartissa New York / ET. Helsinki on helper. Normaali ET+7, DST-mismatch ET+6. Hard flat 16:45 ET.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function TodayCard({ item }: { item: TodayItem }) {
  const { spec, status, alerts } = item;
  const statusMap = {
    upcoming: { label: "Upcoming", cls: "bg-muted text-muted-foreground" },
    active: { label: "Active", cls: "bg-success text-success-foreground" },
    completed: { label: "Completed", cls: "bg-secondary text-secondary-foreground" },
  } as const;
  const s = statusMap[status];

  return (
    <div className="rounded-md border bg-secondary/30 p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="font-mono">{spec.symbol}</Badge>
          <span className="font-mono text-xs truncate">{spec.id}</span>
        </div>
        <span className={`text-[10px] uppercase font-medium px-1.5 py-0.5 rounded ${s.cls}`}>{s.label}</span>
      </div>
      <div className="text-xs">
        <div><span className="text-muted-foreground">Family:</span> {spec.family}</div>
        <div><span className="text-muted-foreground">ET:</span> {spec.sessionStartEt}–{spec.sessionEndEt} ({spec.timeframe})</div>
        <div className="text-muted-foreground text-[11px] mt-0.5">
          Helsinki: {spec.helsinkiNormal} · DST: {spec.helsinkiDst}
        </div>
        <div className="text-muted-foreground text-[11px]">Entry-ikkuna: {spec.possibleEntryEt}</div>
      </div>
      {alerts.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {alerts.map((a, i) => (
            <li key={i} className="text-[11px] text-muted-foreground flex gap-1 items-start">
              <span className="text-warning mt-0.5">•</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function WeeklyCalendar() {
  const fiDays = ["Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai"];
  const { dow } = nowInET();
  // All 8 strategies are eligible on regular weekdays
  const legs = STRATEGIES.map((s) => s.id);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
          Viikon kalenteri (ET) — kaikki 8 jalkaa joka arkipäivä
        </div>
        <div className="grid grid-cols-5 gap-2">
          {fiDays.map((name, i) => {
            const d = i + 1;
            const today = d === dow;
            return (
              <div key={d} className={`rounded-md border p-2 text-center ${today ? "border-primary bg-primary/5" : "bg-secondary/30"}`}>
                <div className="text-[11px] font-semibold">{name.slice(0, 2).toUpperCase()}</div>
                <div className="text-[9px] text-muted-foreground">{name}</div>
                <div className="mt-1.5 flex flex-wrap gap-0.5 justify-center">
                  {legs.map((id) => (
                    <span key={id} className="text-[9px] font-mono bg-background border rounded px-1">{id.slice(0, 4)}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-[11px] text-muted-foreground mt-3">
          La/Su ei treidata. Holiday / early close -päivät vaativat manuaalisen tarkistuksen.
        </div>
      </CardContent>
    </Card>
  );
}
