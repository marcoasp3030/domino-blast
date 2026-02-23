import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface CampaignPerformanceChartProps {
  storeFilter?: string;
}

export function CampaignPerformanceChart({ storeFilter = "all" }: CampaignPerformanceChartProps) {
  const { companyId } = useAuth();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["perf-campaigns", companyId, storeFilter],
    queryFn: async () => {
      let q = supabase.from("campaigns").select("id, name, total_recipients, created_at, status")
        .order("created_at", { ascending: true }).limit(14);
      if (storeFilter === "none") q = q.is("store_id", null);
      else if (storeFilter !== "all") q = q.eq("store_id", storeFilter);
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId,
  });

  const hasData = campaigns.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-base font-semibold mb-1">Performance de Campanhas</h3>
      <p className="text-sm text-muted-foreground mb-6">Últimas campanhas</p>
      {hasData ? (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={campaigns.map(c => ({
            name: c.name?.substring(0, 10) || "",
            enviados: c.total_recipients || 0,
          }))} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
            <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 13%, 91%)", borderRadius: "8px", fontSize: "13px" }} />
            <Area type="monotone" dataKey="enviados" stroke="hsl(199, 89%, 48%)" fill="url(#gradSent)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground">
          <TrendingUp className="h-12 w-12 mb-3 opacity-20" />
          <p>Crie suas primeiras campanhas para ver o gráfico</p>
        </div>
      )}
    </div>
  );
}
