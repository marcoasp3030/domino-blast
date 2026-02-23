import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ResponseTimeChartProps {
  engagements: {
    time_to_open: number | null;
    time_to_click: number | null;
    status: string;
  }[];
}

const OPEN_BUCKETS = [
  { label: "< 1min", max: 60 },
  { label: "1–5min", max: 300 },
  { label: "5–15min", max: 900 },
  { label: "15–30min", max: 1800 },
  { label: "30min–1h", max: 3600 },
  { label: "1–3h", max: 10800 },
  { label: "3–6h", max: 21600 },
  { label: "6–12h", max: 43200 },
  { label: "12–24h", max: 86400 },
  { label: "1–3d", max: 259200 },
  { label: "> 3d", max: Infinity },
];

const COLORS = [
  "hsl(152, 60%, 45%)",
  "hsl(152, 55%, 50%)",
  "hsl(140, 50%, 52%)",
  "hsl(80, 50%, 50%)",
  "hsl(45, 70%, 50%)",
  "hsl(35, 75%, 50%)",
  "hsl(25, 75%, 50%)",
  "hsl(15, 70%, 50%)",
  "hsl(5, 65%, 50%)",
  "hsl(0, 60%, 50%)",
  "hsl(0, 50%, 45%)",
];

function bucketize(times: number[]) {
  const counts = OPEN_BUCKETS.map((b) => ({ name: b.label, count: 0 }));
  for (const t of times) {
    for (let i = 0; i < OPEN_BUCKETS.length; i++) {
      if (t < OPEN_BUCKETS[i].max || i === OPEN_BUCKETS.length - 1) {
        counts[i].count++;
        break;
      }
    }
  }
  return counts;
}

export function ResponseTimeChart({ engagements }: ResponseTimeChartProps) {
  const [metric, setMetric] = useState<"open" | "click">("open");

  const chartData = useMemo(() => {
    const times = engagements
      .map((e) => (metric === "open" ? e.time_to_open : e.time_to_click))
      .filter((t): t is number => t !== null && t >= 0);
    return bucketize(times);
  }, [engagements, metric]);

  const hasData = chartData.some((d) => d.count > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Distribuição do Tempo de Resposta</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Quanto tempo após receber o email</p>
        </div>
        <Tabs value={metric} onValueChange={(v) => setMetric(v as "open" | "click")}>
          <TabsList className="h-8">
            <TabsTrigger value="open" className="text-xs px-3 h-7">Abertura</TabsTrigger>
            <TabsTrigger value="click" className="text-xs px-3 h-7">Clique</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
          Sem dados de {metric === "open" ? "abertura" : "clique"} disponíveis
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value} contatos`, metric === "open" ? "Abriram" : "Clicaram"]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
