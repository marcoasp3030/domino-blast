import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const PERIOD_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
] as const;

const EVENT_COLORS: Record<string, string> = {
  delivered: "hsl(152, 69%, 40%)",
  open: "hsl(262, 83%, 58%)",
  click: "hsl(38, 92%, 50%)",
  bounce: "hsl(0, 72%, 51%)",
  spam: "hsl(350, 80%, 55%)",
  unsubscribe: "hsl(220, 10%, 46%)",
};

const EVENT_LABELS: Record<string, string> = {
  delivered: "Entregas",
  open: "Aberturas",
  click: "Cliques",
  bounce: "Bounces",
  spam: "Spam",
  unsubscribe: "Unsub",
};

const ALL_EVENT_KEYS = Object.keys(EVENT_LABELS);

export function EventTimelineChart() {
  const { companyId } = useAuth();
  const [days, setDays] = useState("30");
  const [visibleEvents, setVisibleEvents] = useState<Set<string>>(new Set(ALL_EVENT_KEYS));

  const toggleEvent = (key: string) => {
    setVisibleEvents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key); // keep at least one
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const { data: chartData = [], isLoading } = useQuery({
    queryKey: ["event-timeline", companyId, days],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_event_timeline", {
        _company_id: companyId!,
        _days: Number(days),
      });

      if (!data || data.length === 0) return [];

      // Pivot: group by day, each event_type becomes a key
      const byDay: Record<string, Record<string, number>> = {};
      for (const row of data) {
        const d = row.day as string;
        if (!byDay[d]) byDay[d] = {};
        byDay[d][row.event_type] = Number(row.count);
      }

      return Object.entries(byDay)
        .map(([day, counts]) => ({
          day: new Date(day + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          ...counts,
        }))
        .sort((a, b) => a.day.localeCompare(b.day));
    },
    enabled: !!companyId,
  });

  const hasData = chartData.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold">Evolução Temporal</h3>
          <p className="text-sm text-muted-foreground">Eventos por dia no período</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="h-8 w-[120px] text-sm">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {ALL_EVENT_KEYS.map((key) => {
          const active = visibleEvents.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleEvent(key)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                active
                  ? "border-transparent text-white"
                  : "border-border text-muted-foreground bg-transparent opacity-50"
              }`}
              style={active ? { background: EVENT_COLORS[key] } : undefined}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: EVENT_COLORS[key] }}
              />
              {EVENT_LABELS[key]}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <Skeleton className="h-[300px] w-full rounded-lg" />
      ) : !hasData ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          Nenhum evento no período selecionado
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const total = payload.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
                return (
                  <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-sm">
                    <p className="font-semibold mb-2">{label}</p>
                    <div className="space-y-1">
                      {payload.filter(p => Number(p.value) > 0).map((p) => {
                        const pct = total > 0 ? ((Number(p.value) / total) * 100).toFixed(1) : "0";
                        return (
                          <div key={p.dataKey} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                              <span className="text-muted-foreground">{p.name}</span>
                            </div>
                            <span className="font-medium tabular-nums">{p.value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 pt-2 border-t border-border flex justify-between text-xs text-muted-foreground">
                      <span>Total</span>
                      <span className="font-semibold text-foreground">{total}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend content={() => null} />
            {ALL_EVENT_KEYS.filter((key) => visibleEvents.has(key)).map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={EVENT_LABELS[key]}
                stroke={EVENT_COLORS[key]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
