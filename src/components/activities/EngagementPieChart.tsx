import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface EngagementPieChartProps {
  engaged: number;
  openedOnly: number;
  rejected: number;
}

const SEGMENTS = [
  { key: "engaged", label: "Engajados", color: "hsl(152, 60%, 45%)" },
  { key: "openedOnly", label: "Só abriram", color: "hsl(45, 80%, 50%)" },
  { key: "rejected", label: "Rejeição", color: "hsl(0, 65%, 50%)" },
];

export function EngagementPieChart({ engaged, openedOnly, rejected }: EngagementPieChartProps) {
  const total = engaged + openedOnly + rejected;
  const data = [
    { name: "Engajados", value: engaged },
    { name: "Só abriram", value: openedOnly },
    { name: "Rejeição", value: rejected },
  ].filter((d) => d.value > 0);

  if (total === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-center h-[300px] text-sm text-muted-foreground">
        Sem dados de engajamento disponíveis
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-1">Proporção de Engajamento</h3>
      <p className="text-xs text-muted-foreground mb-4">Distribuição por tipo de interação</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry) => {
              const seg = SEGMENTS.find((s) => s.label === entry.name);
              return <Cell key={entry.name} fill={seg?.color || "#888"} />;
            })}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`${value} (${Math.round((value / total) * 100)}%)`, ""]}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ fontSize: "12px", color: "hsl(var(--foreground))" }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
