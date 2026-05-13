import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DAY_CHECKLIST } from "@/lib/strategies";
import { AlertTriangle, Calendar } from "lucide-react";

const DAY_NAMES_FI = ["Sunnuntai", "Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai", "Lauantai"];

export function TodayQuickView() {
  const now = new Date();
  const dow = now.getDay();
  const items = DAY_CHECKLIST[dow] ?? [];
  const dayName = DAY_NAMES_FI[dow];

  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">
              <Calendar className="h-3.5 w-3.5" /> Tänään
            </div>
            <h2 className="text-lg font-semibold mt-0.5">{dayName}</h2>
          </div>
          {items.length === 0 ? (
            <Badge variant="secondary">Ei treidejä</Badge>
          ) : (
            <Badge>{items.length} aktiivista</Badge>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {dow === 0 || dow === 6
              ? "Viikonloppu — ei treidejä."
              : "Maanantaisin treidataan vain HG."}
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.sym} className="flex items-center justify-between gap-3 rounded-md border bg-secondary/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">{it.sym}</Badge>
                  <span className="text-sm">{it.window}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex gap-2 items-start text-xs text-muted-foreground rounded-md bg-warning/10 border border-warning/30 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-warning shrink-0" />
          <span>
            Käytä chartissa New York / ET. Helsinki = ET + 7h normaalisti, mutta DST-mismatch-viikkoina ET + 6h.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
