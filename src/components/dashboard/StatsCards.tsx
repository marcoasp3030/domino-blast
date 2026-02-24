import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Send, CheckCircle2, Eye, MousePointerClick, AlertTriangle, ShieldAlert } from "lucide-react";

interface StatsCardsProps {
  storeFilter?: string;
}

export function StatsCards({ storeFilter = "all" }: StatsCardsProps) {
  const { companyId } = useAuth();

  // Get campaign IDs for the selected store
  const { data: storeCampaignIds } = useQuery({
    queryKey: ["dashboard-store-campaign-ids", companyId, storeFilter],
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

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", companyId, storeFilter, storeCampaignIds],
    queryFn: async () => {
      if (!companyId) return null;

      if (storeFilter === "all") {
        const [sendsRes, eventCountsRes, contactsRes] = await Promise.all([
          supabase.from("sends").select("id", { count: "exact", head: true }),
          supabase.rpc("get_event_counts", { _company_id: companyId }),
          supabase.from("contacts").select("id", { count: "exact", head: true }),
        ]);

        const totalSent = sendsRes.count || 0;
        const counts: Record<string, number> = {};
        (eventCountsRes.data || []).forEach((r: any) => { counts[r.event_type] = Number(r.count); });

        return {
          totalSent,
          delivered: counts.delivered || 0,
          opened: counts.open || 0,
          clicked: counts.click || 0,
          bounced: counts.bounce || 0,
          spam: counts.spam || 0,
          totalContacts: contactsRes.count || 0,
        };
      }

      // Filtered by store
      if (!storeCampaignIds || storeCampaignIds.length === 0) {
        return { totalSent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, totalContacts: 0 };
      }

      const [sendsRes, eventsRes, contactsRes] = await Promise.all([
        supabase.from("sends").select("id", { count: "exact", head: true }).in("campaign_id", storeCampaignIds),
        supabase.from("events").select("event_type").in("campaign_id", storeCampaignIds),
        storeFilter === "none"
          ? supabase.from("contacts").select("id", { count: "exact", head: true }).is("store_id", null)
          : supabase.from("contacts").select("id", { count: "exact", head: true }).eq("store_id", storeFilter),
      ]);

      const totalSent = sendsRes.count || 0;
      const counts: Record<string, number> = {};
      (eventsRes.data || []).forEach((r: any) => { counts[r.event_type] = (counts[r.event_type] || 0) + 1; });

      return {
        totalSent,
        delivered: counts.delivered || 0,
        opened: counts.open || 0,
        clicked: counts.click || 0,
        bounced: counts.bounce || 0,
        spam: counts.spam || 0,
        totalContacts: contactsRes.count || 0,
      };
    },
    enabled: !!companyId && (storeFilter === "all" || storeCampaignIds !== undefined),
  });

  const cards = [
    { label: "Enviados", value: stats?.totalSent || 0, rate: "-", icon: Send, gradient: "var(--gradient-primary)" },
    { label: "Entregues", value: stats?.delivered || 0, rate: stats?.totalSent ? `${((stats.delivered / stats.totalSent) * 100).toFixed(1)}%` : "-", icon: CheckCircle2, gradient: "var(--gradient-success)" },
    { label: "Abertos", value: stats?.opened || 0, rate: stats?.delivered ? `${((stats.opened / stats.delivered) * 100).toFixed(1)}%` : "-", icon: Eye, gradient: "var(--gradient-purple)" },
    { label: "Clicados", value: stats?.clicked || 0, rate: stats?.delivered ? `${((stats.clicked / stats.delivered) * 100).toFixed(1)}%` : "-", icon: MousePointerClick, gradient: "var(--gradient-warning)" },
    { label: "Rejeições", value: stats?.bounced || 0, rate: stats?.totalSent ? `${((stats.bounced / stats.totalSent) * 100).toFixed(1)}%` : "-", icon: AlertTriangle, gradient: "var(--gradient-danger)" },
    { label: "Spam", value: stats?.spam || 0, rate: stats?.totalSent ? `${((stats.spam / stats.totalSent) * 100).toFixed(1)}%` : "-", icon: ShieldAlert, gradient: "var(--gradient-danger)" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((stat) => (
        <div key={stat.label} className="stat-card group">
          <div className="stat-card-gradient" style={{ background: stat.gradient }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg opacity-80 group-hover:opacity-100 transition-opacity" style={{ background: stat.gradient }}>
                <stat.icon className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{stat.value.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">Taxa: <span className="font-semibold text-foreground">{stat.rate}</span></p>
          </div>
        </div>
      ))}
    </div>
  );
}
