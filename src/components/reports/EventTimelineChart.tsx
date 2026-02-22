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

export function EventTimelineChart() {
  const { companyId } = useAuth();
  const [days, setDays] = useState("30");

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
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            {Object.entries(EVENT_LABELS).map(([key, label]) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={label}
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
