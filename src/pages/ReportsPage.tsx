import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ReportsPage() {
  const { companyId } = useAuth();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["report-campaigns", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("campaigns").select("*").eq("status", "completed").order("completed_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: eventCounts } = useQuery({
    queryKey: ["report-events", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("event_type");
      const counts: Record<string, number> = {};
      (data || []).forEach((e) => { counts[e.event_type] = (counts[e.event_type] || 0) + 1; });
      return counts;
    },
    enabled: !!companyId,
  });

  const chartData = [
    { name: "Entregues", value: eventCounts?.delivered || 0, fill: "hsl(152, 69%, 40%)" },
    { name: "Abertos", value: eventCounts?.open || 0, fill: "hsl(262, 83%, 58%)" },
    { name: "Clicados", value: eventCounts?.click || 0, fill: "hsl(38, 92%, 50%)" },
    { name: "Bounces", value: eventCounts?.bounce || 0, fill: "hsl(0, 72%, 51%)" },
    { name: "Spam", value: eventCounts?.spam || 0, fill: "hsl(350, 80%, 55%)" },
    { name: "Unsub", value: eventCounts?.unsubscribe || 0, fill: "hsl(220, 10%, 46%)" },
  ];

  const hasData = chartData.some((d) => d.value > 0);

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Relatórios</h1>
        <p className="page-description">Análise detalhada de performance</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-1">Eventos por Tipo</h3>
          <p className="text-sm text-muted-foreground mb-6">Total acumulado</p>
          {hasData ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,13%,91%)", borderRadius: "8px", fontSize: "13px" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Nenhum evento registrado ainda
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-1">Campanhas Concluídas</h3>
          <p className="text-sm text-muted-foreground mb-6">Últimas 10</p>
          {campaigns.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Nenhuma campanha concluída ainda
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.completed_at ? new Date(c.completed_at).toLocaleDateString("pt-BR") : "-"}</p>
                  </div>
                  <span className="text-sm font-semibold">{c.total_recipients || 0} envios</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
