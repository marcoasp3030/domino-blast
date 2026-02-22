import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { date: "01/02", enviados: 1200, abertos: 420, clicados: 95 },
  { date: "02/02", enviados: 980, abertos: 350, clicados: 78 },
  { date: "03/02", enviados: 1500, abertos: 560, clicados: 134 },
  { date: "04/02", enviados: 800, abertos: 280, clicados: 62 },
  { date: "05/02", enviados: 2200, abertos: 780, clicados: 189 },
  { date: "06/02", enviados: 1800, abertos: 640, clicados: 156 },
  { date: "07/02", enviados: 3100, abertos: 1100, clicados: 267 },
  { date: "08/02", enviados: 2400, abertos: 860, clicados: 198 },
  { date: "09/02", enviados: 1900, abertos: 680, clicados: 152 },
  { date: "10/02", enviados: 2800, abertos: 990, clicados: 234 },
  { date: "11/02", enviados: 3500, abertos: 1250, clicados: 312 },
  { date: "12/02", enviados: 2100, abertos: 740, clicados: 178 },
  { date: "13/02", enviados: 1600, abertos: 570, clicados: 128 },
  { date: "14/02", enviados: 2900, abertos: 1030, clicados: 245 },
];

export function CampaignPerformanceChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-base font-semibold mb-1">Performance de Campanhas</h3>
      <p className="text-sm text-muted-foreground mb-6">Últimos 14 dias</p>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradOpened" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradClicked" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
          <Tooltip
            contentStyle={{
              background: "hsl(0, 0%, 100%)",
              border: "1px solid hsl(220, 13%, 91%)",
              borderRadius: "8px",
              fontSize: "13px",
            }}
          />
          <Area type="monotone" dataKey="enviados" stroke="hsl(199, 89%, 48%)" fill="url(#gradSent)" strokeWidth={2} />
          <Area type="monotone" dataKey="abertos" stroke="hsl(262, 83%, 58%)" fill="url(#gradOpened)" strokeWidth={2} />
          <Area type="monotone" dataKey="clicados" stroke="hsl(38, 92%, 50%)" fill="url(#gradClicked)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
