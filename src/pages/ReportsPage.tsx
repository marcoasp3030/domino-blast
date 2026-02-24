import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventContactsPanel } from "@/components/reports/EventContactsPanel";
import { EventTimelineChart } from "@/components/reports/EventTimelineChart";
import { CampaignComparisonChart } from "@/components/reports/CampaignComparisonChart";
import { Eye, MousePointerClick, AlertTriangle, Mail, Store } from "lucide-react";

export default function ReportsPage() {
  const { companyId } = useAuth();
  const [storeFilter, setStoreFilter] = useState<string>("all");

  const { data: allStores = [] } = useQuery({
    queryKey: ["stores", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name").order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  // Get campaign IDs for the selected store to filter events
  const { data: storeCampaignIds } = useQuery({
    queryKey: ["store-campaign-ids", companyId, storeFilter],
    queryFn: async () => {
      if (storeFilter === "all") return null;
      let q = supabase.from("campaigns").select("id");
      if (storeFilter === "none") q = q.is("store_id", null);
      else q = q.eq("store_id", storeFilter);
      const { data } = await q;
      return (data || []).map((c) => c.id);
    },
    enabled: !!companyId,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["report-campaigns", companyId, storeFilter],
    queryFn: async () => {
      let q = supabase.from("campaigns").select("*, stores(name)").eq("status", "completed").order("completed_at", { ascending: false }).limit(10);
      if (storeFilter === "none") q = q.is("store_id", null);
      else if (storeFilter !== "all") q = q.eq("store_id", storeFilter);
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: eventCounts } = useQuery({
    queryKey: ["report-events", companyId, storeFilter, storeCampaignIds],
    queryFn: async () => {
      if (storeFilter === "all") {
        const { data } = await supabase.rpc("get_event_counts", { _company_id: companyId! });
        const counts: Record<string, number> = {};
        (data || []).forEach((r: any) => { counts[r.event_type] = Number(r.count); });
        return counts;
      }
      // Filter events by campaign IDs belonging to the store
      if (!storeCampaignIds || storeCampaignIds.length === 0) return {};
      const { data } = await supabase
        .from("events")
        .select("event_type")
        .in("campaign_id", storeCampaignIds);
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => { counts[r.event_type] = (counts[r.event_type] || 0) + 1; });
      return counts;
    },
    enabled: !!companyId && (storeFilter === "all" || storeCampaignIds !== undefined),
  });

  const delivered = eventCounts?.delivered || 0;
  const opens = eventCounts?.open || 0;
  const clicks = eventCounts?.click || 0;
  const bounces = eventCounts?.bounce || 0;

  const openRate = delivered > 0 ? ((opens / delivered) * 100).toFixed(1) : "0.0";
  const clickRate = delivered > 0 ? ((clicks / delivered) * 100).toFixed(1) : "0.0";
  const bounceRate = delivered > 0 ? ((bounces / delivered) * 100).toFixed(1) : "0.0";

  const rateCards = [
    { label: "Entregas", value: delivered.toLocaleString("pt-BR"), icon: Mail, color: "hsl(152, 69%, 40%)", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
    { label: "Taxa de Abertura", value: `${openRate}%`, sub: `${opens.toLocaleString("pt-BR")} aberturas`, icon: Eye, color: "hsl(262, 83%, 58%)", bg: "bg-violet-100 dark:bg-violet-900/30" },
    { label: "Taxa de Clique", value: `${clickRate}%`, sub: `${clicks.toLocaleString("pt-BR")} cliques`, icon: MousePointerClick, color: "hsl(38, 92%, 50%)", bg: "bg-amber-100 dark:bg-amber-900/30" },
    { label: "Taxa de Rejeição", value: `${bounceRate}%`, sub: `${bounces.toLocaleString("pt-BR")} rejeições`, icon: AlertTriangle, color: "hsl(0, 72%, 51%)", bg: "bg-red-100 dark:bg-red-900/30" },
  ];

  const chartData = [
    { name: "Entregues", value: delivered, fill: "hsl(152, 69%, 40%)" },
    { name: "Abertos", value: opens, fill: "hsl(262, 83%, 58%)" },
    { name: "Clicados", value: clicks, fill: "hsl(38, 92%, 50%)" },
    { name: "Rejeições", value: bounces, fill: "hsl(0, 72%, 51%)" },
    { name: "Spam", value: eventCounts?.spam || 0, fill: "hsl(350, 80%, 55%)" },
    { name: "Unsub", value: eventCounts?.unsubscribe || 0, fill: "hsl(220, 10%, 46%)" },
  ];

  const hasData = chartData.some((d) => d.value > 0);

  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-description">Análise detalhada de performance</p>
        </div>
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Loja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as lojas</SelectItem>
            <SelectItem value="none">Sem loja</SelectItem>
            {allStores.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2"><Store className="h-3 w-3" />{s.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {rateCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <Icon className="h-4 w-4" style={{ color: card.color }} />
                </div>
                <span className="text-sm text-muted-foreground">{card.label}</span>
              </div>
              <p className="text-2xl font-bold tracking-tight">{card.value}</p>
              {card.sub && <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>}
            </div>
          );
        })}
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
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{c.completed_at ? new Date(c.completed_at).toLocaleDateString("pt-BR") : "-"}</span>
                      {(c as any).stores?.name && <span className="flex items-center gap-1"><Store className="h-3 w-3" />{(c as any).stores.name}</span>}
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{c.total_recipients || 0} envios</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <EventTimelineChart />
      </div>

      <div className="mt-6">
        <CampaignComparisonChart />
      </div>

      <div className="mt-6">
        <EventContactsPanel />
      </div>
    </AppLayout>
  );
}
