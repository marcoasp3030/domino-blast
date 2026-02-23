import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ResponseTimeChart } from "@/components/activities/ResponseTimeChart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Activity, Search, Mail, Eye, MousePointerClick, AlertTriangle,
  ShieldX, UserMinus, ArrowDownCircle, Clock, XCircle, Download,
  TrendingUp, TrendingDown, Timer,
} from "lucide-react";

const eventConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  delivered: { label: "Entregue", icon: Mail, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  open: { label: "Aberto", icon: Eye, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
  click: { label: "Clique", icon: MousePointerClick, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  bounce: { label: "Bounce", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
  spam: { label: "Spam", icon: ShieldX, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30" },
  unsubscribe: { label: "Descadastro", icon: UserMinus, color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-900/30" },
  dropped: { label: "Dropped", icon: ArrowDownCircle, color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-900/30" },
};

type ContactEngagement = {
  contact_id: string;
  email: string;
  name: string | null;
  campaign_name: string;
  campaign_id: string;
  delivered_at: string | null;
  first_open_at: string | null;
  first_click_at: string | null;
  events: { event_type: string; timestamp: string; url: string | null }[];
  time_to_open: number | null; // seconds
  time_to_click: number | null; // seconds
  status: "engaged" | "opened_only" | "rejected";
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.round((seconds % 86400) / 3600);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

export default function ActivitiesPage() {
  const { companyId } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");

  // Fetch campaigns for filter
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns-list", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("id, name, status")
        .in("status", ["completed", "sending"])
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch events with contact + campaign data
  const { data: rawEvents = [], isLoading } = useQuery({
    queryKey: ["activities-events", companyId, campaignFilter],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*, contacts(email, name), campaigns(name)")
        .order("timestamp", { ascending: true })
        .limit(5000);

      if (campaignFilter !== "all") {
        query = query.eq("campaign_id", campaignFilter);
      }

      const { data } = await query;
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  // Process events into engagement records per contact+campaign
  const engagements: ContactEngagement[] = useMemo(() => {
    const map = new Map<string, ContactEngagement>();

    for (const ev of rawEvents) {
      if (!ev.contact_id || !ev.campaign_id) continue;
      const key = `${ev.contact_id}_${ev.campaign_id}`;

      if (!map.has(key)) {
        map.set(key, {
          contact_id: ev.contact_id,
          email: ev.contacts?.email || "—",
          name: ev.contacts?.name || null,
          campaign_name: ev.campaigns?.name || "—",
          campaign_id: ev.campaign_id,
          delivered_at: null,
          first_open_at: null,
          first_click_at: null,
          events: [],
          time_to_open: null,
          time_to_click: null,
          status: "rejected",
        });
      }

      const record = map.get(key)!;
      record.events.push({
        event_type: ev.event_type,
        timestamp: ev.timestamp,
        url: ev.url,
      });

      const ts = ev.timestamp;
      if (ev.event_type === "delivered" && (!record.delivered_at || ts < record.delivered_at)) {
        record.delivered_at = ts;
      }
      if (ev.event_type === "open" && (!record.first_open_at || ts < record.first_open_at)) {
        record.first_open_at = ts;
      }
      if (ev.event_type === "click" && (!record.first_click_at || ts < record.first_click_at)) {
        record.first_click_at = ts;
      }
    }

    // Calculate timing and status
    for (const record of map.values()) {
      if (record.delivered_at) {
        const deliveredMs = new Date(record.delivered_at).getTime();
        if (record.first_open_at) {
          record.time_to_open = (new Date(record.first_open_at).getTime() - deliveredMs) / 1000;
        }
        if (record.first_click_at) {
          record.time_to_click = (new Date(record.first_click_at).getTime() - deliveredMs) / 1000;
        }
      }

      if (record.first_click_at) {
        record.status = "engaged";
      } else if (record.first_open_at) {
        record.status = "opened_only";
      } else {
        record.status = "rejected";
      }
    }

    return Array.from(map.values());
  }, [rawEvents]);

  // Filter and sort
  const filtered = useMemo(() => {
    let list = engagements;

    if (statusFilter !== "all") {
      list = list.filter((e) => e.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) => e.email.toLowerCase().includes(q) || (e.name || "").toLowerCase().includes(q) || e.campaign_name.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === "recent") {
        const aTs = a.delivered_at || "";
        const bTs = b.delivered_at || "";
        return bTs.localeCompare(aTs);
      }
      if (sortBy === "fastest_open") {
        const aT = a.time_to_open ?? Infinity;
        const bT = b.time_to_open ?? Infinity;
        return aT - bT;
      }
      if (sortBy === "fastest_click") {
        const aT = a.time_to_click ?? Infinity;
        const bT = b.time_to_click ?? Infinity;
        return aT - bT;
      }
      if (sortBy === "slowest") {
        const aT = a.time_to_open ?? -1;
        const bT = b.time_to_open ?? -1;
        return bT - aT;
      }
      return 0;
    });

    return list;
  }, [engagements, statusFilter, search, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const total = engagements.length;
    const engaged = engagements.filter((e) => e.status === "engaged").length;
    const openedOnly = engagements.filter((e) => e.status === "opened_only").length;
    const rejected = engagements.filter((e) => e.status === "rejected").length;

    const openTimes = engagements.filter((e) => e.time_to_open !== null).map((e) => e.time_to_open!);
    const clickTimes = engagements.filter((e) => e.time_to_click !== null).map((e) => e.time_to_click!);

    const avgOpen = openTimes.length ? openTimes.reduce((a, b) => a + b, 0) / openTimes.length : null;
    const avgClick = clickTimes.length ? clickTimes.reduce((a, b) => a + b, 0) / clickTimes.length : null;

    return { total, engaged, openedOnly, rejected, avgOpen, avgClick };
  }, [engagements]);

  const exportCsv = () => {
    if (!filtered.length) return;
    const header = "Nome,Email,Campanha,Status,Tempo até Abrir,Tempo até Clicar,Eventos\n";
    const rows = filtered.map((e) => {
      const statusLabel = e.status === "engaged" ? "Engajado" : e.status === "opened_only" ? "Só abriu" : "Rejeição";
      const tOpen = e.time_to_open !== null ? formatDuration(e.time_to_open) : "—";
      const tClick = e.time_to_click !== null ? formatDuration(e.time_to_click) : "—";
      const evts = [...new Set(e.events.map((ev) => eventConfig[ev.event_type]?.label || ev.event_type))].join("; ");
      return [e.name || "Sem nome", e.email, e.campaign_name, statusLabel, tOpen, tClick, evts]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "atividades.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusConfig = {
    engaged: { label: "Engajado", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" },
    opened_only: { label: "Só abriu", icon: Eye, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" },
    rejected: { label: "Rejeição", icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" },
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Atividades</h1>
        <p className="page-description">Análise de engajamento e tempo de resposta dos contatos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-xs text-muted-foreground">Engajados</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.engaged}</p>
          {stats.total > 0 && <p className="text-xs text-muted-foreground">{Math.round((stats.engaged / stats.total) * 100)}%</p>}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-muted-foreground">Só abriram</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.openedOnly}</p>
          {stats.total > 0 && <p className="text-xs text-muted-foreground">{Math.round((stats.openedOnly / stats.total) * 100)}%</p>}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-xs text-muted-foreground">Rejeição</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          {stats.total > 0 && <p className="text-xs text-muted-foreground">{Math.round((stats.rejected / stats.total) * 100)}%</p>}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="h-4 w-4 text-violet-600" />
            <span className="text-xs text-muted-foreground">Tempo médio abertura</span>
          </div>
          <p className="text-xl font-bold">{stats.avgOpen !== null ? formatDuration(stats.avgOpen) : "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <MousePointerClick className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-muted-foreground">Tempo médio clique</span>
          </div>
          <p className="text-xl font-bold">{stats.avgClick !== null ? formatDuration(stats.avgClick) : "—"}</p>
        </div>
      </div>

      {/* Response Time Chart */}
      <div className="mb-6">
        <ResponseTimeChart engagements={engagements} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar contato ou campanha..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Campanha" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as campanhas</SelectItem>
            {campaigns.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="engaged">Engajados</SelectItem>
            <SelectItem value="opened_only">Só abriram</SelectItem>
            <SelectItem value="rejected">Rejeição</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Ordenar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recente</SelectItem>
            <SelectItem value="fastest_open">Abertura mais rápida</SelectItem>
            <SelectItem value="fastest_click">Clique mais rápido</SelectItem>
            <SelectItem value="slowest">Mais lento</SelectItem>
          </SelectContent>
        </Select>
        {filtered.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Carregando atividades...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          {search || statusFilter !== "all" || campaignFilter !== "all"
            ? "Nenhuma atividade encontrada para os filtros aplicados"
            : "Nenhuma atividade registrada ainda. Envie uma campanha para começar."}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Contato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Campanha</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Tempo p/ Abrir</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Tempo p/ Clicar</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Eventos</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Entregue em</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((record, idx) => {
                  const sc = statusConfig[record.status];
                  const StatusIcon = sc.icon;
                  const eventTypes = [...new Set(record.events.map((e) => e.event_type))];

                  return (
                    <tr key={`${record.contact_id}_${record.campaign_id}_${idx}`} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0 uppercase">
                            {(record.name || record.email).slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{record.name || "Sem nome"}</p>
                            <p className="text-xs text-muted-foreground truncate">{record.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[180px]">{record.campaign_name}</td>
                      <td className="px-4 py-3 text-center">
                        <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${sc.bg}`}>
                          <StatusIcon className={`h-3 w-3 ${sc.color}`} />
                          <span className={sc.color}>{sc.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {record.time_to_open !== null ? (
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">{formatDuration(record.time_to_open)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {record.time_to_click !== null ? (
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">{formatDuration(record.time_to_click)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-0.5">
                          {eventTypes.map((type) => {
                            const config = eventConfig[type];
                            if (!config) return null;
                            const Icon = config.icon;
                            return (
                              <div key={type} className={`rounded p-1 ${config.bg}`} title={config.label}>
                                <Icon className={`h-3 w-3 ${config.color}`} />
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {record.delivered_at
                          ? new Date(record.delivered_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 200 && (
            <div className="px-4 py-3 border-t border-border text-center text-xs text-muted-foreground">
              Mostrando 200 de {filtered.length} registros
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
