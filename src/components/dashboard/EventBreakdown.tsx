import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { name: "Entregues", value: 23892, color: "hsl(152, 69%, 40%)" },
  { name: "Abertos", value: 8451, color: "hsl(262, 83%, 58%)" },
  { name: "Clicados", value: 2134, color: "hsl(38, 92%, 50%)" },
  { name: "Bounces", value: 688, color: "hsl(0, 72%, 51%)" },
  { name: "Spam", value: 42, color: "hsl(350, 80%, 55%)" },
  { name: "Unsubscribe", value: 156, color: "hsl(220, 10%, 46%)" },
];

export function EventBreakdown() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-base font-semibold mb-1">Eventos</h3>
      <p className="text-sm text-muted-foreground mb-4">Distribuição por tipo</p>

      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(0, 0%, 100%)",
              border: "1px solid hsl(220, 13%, 91%)",
              borderRadius: "8px",
              fontSize: "13px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
              <span className="text-muted-foreground">{item.name}</span>
            </div>
            <span className="font-medium">{item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
