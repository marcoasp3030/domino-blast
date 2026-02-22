import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { BarChart3 } from "lucide-react";

const colorMap: Record<string, string> = {
  delivered: "hsl(152, 69%, 40%)",
  open: "hsl(262, 83%, 58%)",
  click: "hsl(38, 92%, 50%)",
  bounce: "hsl(0, 72%, 51%)",
  spam: "hsl(350, 80%, 55%)",
  unsubscribe: "hsl(220, 10%, 46%)",
  dropped: "hsl(220, 14%, 75%)",
};

const labelMap: Record<string, string> = {
  delivered: "Entregues",
  open: "Abertos",
  click: "Clicados",
  bounce: "Bounces",
  spam: "Spam",
  unsubscribe: "Unsubscribe",
  dropped: "Dropped",
};

export function EventBreakdown() {
  const { companyId } = useAuth();

  const { data: eventData = [] } = useQuery({
    queryKey: ["event-breakdown", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("event_type");
      const counts: Record<string, number> = {};
      (data || []).forEach((e) => { counts[e.event_type] = (counts[e.event_type] || 0) + 1; });
      return Object.entries(counts).map(([name, value]) => ({
        name: labelMap[name] || name,
        value,
        color: colorMap[name] || "hsl(220, 10%, 46%)",
      }));
    },
    enabled: !!companyId,
  });

  const hasData = eventData.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-base font-semibold mb-1">Eventos</h3>
      <p className="text-sm text-muted-foreground mb-4">Distribuição por tipo</p>

      {hasData ? (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={eventData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {eventData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 13%, 91%)", borderRadius: "8px", fontSize: "13px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {eventData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-medium">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
          <BarChart3 className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">Nenhum evento registrado</p>
        </div>
      )}
    </div>
  );
}
