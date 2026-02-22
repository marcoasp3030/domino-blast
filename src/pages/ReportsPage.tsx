import { AppLayout } from "@/components/layout/AppLayout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";

const monthlyData = [
  { month: "Set", enviados: 15200, abertos: 5320, clicados: 1230 },
  { month: "Out", enviados: 18400, abertos: 6440, clicados: 1520 },
  { month: "Nov", enviados: 22100, abertos: 8430, clicados: 2010 },
  { month: "Dez", enviados: 28000, abertos: 10920, clicados: 2880 },
  { month: "Jan", enviados: 19800, abertos: 7524, clicados: 1780 },
  { month: "Fev", enviados: 24580, abertos: 8451, clicados: 2134 },
];

const deliverabilityData = [
  { date: "Sem 1", taxa: 97.2 },
  { date: "Sem 2", taxa: 96.8 },
  { date: "Sem 3", taxa: 97.5 },
  { date: "Sem 4", taxa: 98.1 },
  { date: "Sem 5", taxa: 97.9 },
  { date: "Sem 6", taxa: 97.2 },
];

export default function ReportsPage() {
  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Relatórios</h1>
        <p className="page-description">Análise detalhada de performance</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly performance */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-1">Performance Mensal</h3>
          <p className="text-sm text-muted-foreground mb-6">Últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
              <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,13%,91%)", borderRadius: "8px", fontSize: "13px" }} />
              <Bar dataKey="enviados" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="abertos" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="clicados" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Deliverability */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-1">Taxa de Entrega</h3>
          <p className="text-sm text-muted-foreground mb-6">Últimas 6 semanas</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={deliverabilityData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
              <YAxis domain={[95, 100]} tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
              <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,13%,91%)", borderRadius: "8px", fontSize: "13px" }} />
              <Line type="monotone" dataKey="taxa" stroke="hsl(152, 69%, 40%)" strokeWidth={2.5} dot={{ fill: "hsl(152, 69%, 40%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top campaigns */}
      <div className="mt-6 rounded-xl border border-border bg-card">
        <div className="p-6 pb-4">
          <h3 className="text-base font-semibold">Top Campanhas</h3>
          <p className="text-sm text-muted-foreground">Melhor performance no período</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="border-t border-border">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Campanha</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Enviados</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Abertura</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">CTR</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Welcome Series", sent: "890", open: "61.2%", ctr: "22.4%" },
                { name: "Black Friday", sent: "5.200", open: "42.1%", ctr: "12.3%" },
                { name: "Newsletter Fev", sent: "3.100", open: "38.5%", ctr: "9.7%" },
              ].map((c, i) => (
                <tr key={i} className="border-t border-border hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-muted-foreground">{i + 1}</td>
                  <td className="px-6 py-4 font-medium">{c.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{c.sent}</td>
                  <td className="px-6 py-4">
                    <span className="badge-success">{c.open}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="badge-info">{c.ctr}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
