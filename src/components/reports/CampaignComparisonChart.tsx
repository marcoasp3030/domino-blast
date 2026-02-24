import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Trophy } from "lucide-react";

const METRIC_COLORS = {
  openRate: "hsl(262, 83%, 58%)",
  clickRate: "hsl(38, 92%, 50%)",
  bounceRate: "hsl(0, 72%, 51%)",
};

interface CampaignRow {
  campaign_id: string;
  campaign_name: string;
  sent_at: string | null;
  total_recipients: number;
  delivered: number;
  opens: number;
  clicks: number;
  bounces: number;
  spam: number;
  unsubscribes: number;
}

export function CampaignComparisonChart() {
  const { companyId } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["campaign-performance", companyId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_campaign_performance", {
        _company_id: companyId!,
      });
      return (data || []) as CampaignRow[];
    },
    enabled: !!companyId,
  });

  const chartData = rows.map((r) => {
    const del = Number(r.delivered) || 0;
    return {
      name: r.campaign_name.length > 20 ? r.campaign_name.slice(0, 18) + "…" : r.campaign_name,
      fullName: r.campaign_name,
      openRate: del > 0 ? +((Number(r.opens) / del) * 100).toFixed(1) : 0,
      clickRate: del > 0 ? +((Number(r.clicks) / del) * 100).toFixed(1) : 0,
      bounceRate: del > 0 ? +((Number(r.bounces) / del) * 100).toFixed(1) : 0,
      delivered: del,
      opens: Number(r.opens),
      clicks: Number(r.clicks),
      bounces: Number(r.bounces),
      sentAt: r.sent_at ? new Date(r.sent_at).toLocaleDateString("pt-BR") : "-",
    };
  }).reverse(); // oldest first for chart

  const hasData = chartData.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-1">
        <Trophy className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">Comparativo de Campanhas</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Taxas de abertura, clique e rejeição por campanha (últimas 20 concluídas)</p>

      {isLoading ? (
        <Skeleton className="h-[350px] w-full rounded-lg" />
      ) : !hasData ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          Nenhuma campanha concluída ainda
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                angle={-35}
                textAnchor="end"
                interval={0}
                height={70}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                unit="%"
                domain={[0, "auto"]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-sm min-w-[200px]">
                      <p className="font-semibold mb-1">{d.fullName}</p>
                      <p className="text-xs text-muted-foreground mb-2">Enviada em {d.sentAt} · {d.delivered} entregas</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: METRIC_COLORS.openRate }} />
                            Abertura
                          </span>
                          <span className="font-medium tabular-nums">{d.openRate}% <span className="text-muted-foreground font-normal">({d.opens})</span></span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: METRIC_COLORS.clickRate }} />
                            Clique
                          </span>
                          <span className="font-medium tabular-nums">{d.clickRate}% <span className="text-muted-foreground font-normal">({d.clicks})</span></span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: METRIC_COLORS.bounceRate }} />
                            Rejeição
                          </span>
                          <span className="font-medium tabular-nums">{d.bounceRate}% <span className="text-muted-foreground font-normal">({d.bounces})</span></span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              <Bar dataKey="openRate" name="Abertura %" fill={METRIC_COLORS.openRate} radius={[3, 3, 0, 0]} />
              <Bar dataKey="clickRate" name="Clique %" fill={METRIC_COLORS.clickRate} radius={[3, 3, 0, 0]} />
              <Bar dataKey="bounceRate" name="Rejeição %" fill={METRIC_COLORS.bounceRate} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
