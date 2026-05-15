import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTodayStrategies, nowInET, type TodayItem } from "@/lib/strategies";
import { AlertTriangle, Calendar, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TodayQuickView({ onAdd }: { onAdd?: (sym: string) => void }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const { weekdayName, dateStr, hh, mm } = nowInET();
  const items = getTodayStrategies();
  const etTime = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} ET`;
  void tick;

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
          {items.length === 0 ? (
            <Badge variant="secondary">Ei treidejä</Badge>
          ) : (
            <Badge>{items.length} strategiaa</Badge>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trading today (viikonloppu).</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {items.map((it) => <TodayCard key={it.sym} item={it} onAdd={onAdd} />)}
          </div>
        )}

        <div className="mt-4 flex gap-2 items-start text-xs text-muted-foreground rounded-md bg-warning/10 border border-warning/30 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-warning shrink-0" />
          <span>
            Käytä chartissa New York / ET. Helsinki-ajat ovat helper. Normaali ET+7, DST-mismatch ET+6.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function TodayCard({ item, onAdd }: { item: TodayItem; onAdd?: (sym: string) => void }) {
  const { sym, spec, status, alerts } = item;
  const statusMap = {
    upcoming: { label: "Upcoming", cls: "bg-muted text-muted-foreground" },
    active: { label: "Active now", cls: "bg-success text-success-foreground" },
    completed: { label: "Completed", cls: "bg-secondary text-secondary-foreground" },
  } as const;
  const s = statusMap[status];

  return (
    <div className="rounded-md border bg-secondary/30 p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">{sym}</Badge>
          <span className={`text-[10px] uppercase font-medium px-1.5 py-0.5 rounded ${s.cls}`}>{s.label}</span>
        </div>
        {onAdd && (
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onAdd(sym)}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        )}
      </div>
      <div className="text-xs">
        <div><span className="text-muted-foreground">Session:</span> {spec.etWindow}</div>
        <div><span className="text-muted-foreground">Entry:</span> {spec.entryTimeEt} ET</div>
        <div className="text-muted-foreground text-[11px] mt-0.5">
          Helsinki: {spec.helsinkiWindowNormal} · DST: {spec.helsinkiWindowDst}
        </div>
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
  const days = [
    { d: 1, name: "Maanantai", strats: ["GC"] },
    { d: 2, name: "Tiistai", strats: ["YM", "MES", "GC", "HG"] },
    { d: 3, name: "Keskiviikko", strats: ["YM", "MES", "GC", "HG"] },
    { d: 4, name: "Torstai", strats: ["YM", "MES", "GC", "HG"] },
    { d: 5, name: "Perjantai", strats: ["YM", "MES", "GC", "HG"] },
  ];
  const { dow } = nowInET();
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">Viikon kalenteri (ET)</div>
        <div className="grid grid-cols-5 gap-2">
          {days.map((d) => {
            const today = d.d === dow;
            return (
              <div key={d.d} className={`rounded-md border p-2 text-center ${today ? "border-primary bg-primary/5" : "bg-secondary/30"}`}>
                <div className="text-[11px] font-semibold">{d.name.slice(0,2).toUpperCase()}</div>
                <div className="text-[9px] text-muted-foreground">{d.name}</div>
                <div className="mt-1.5 flex flex-wrap gap-0.5 justify-center">
                  {d.strats.map((s) => (
                    <span key={s} className="text-[9px] font-mono bg-background border rounded px-1">{s}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
