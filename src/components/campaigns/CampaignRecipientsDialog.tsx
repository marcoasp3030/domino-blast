import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Mail, Eye, MousePointerClick, AlertTriangle, ShieldX, UserMinus, ArrowDownCircle, Users, Download, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePeriodFilter } from "@/components/shared/DatePeriodFilter";

interface CampaignRecipientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: { id: string; name: string } | null;
}

const eventConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline"; color: string; bg: string }> = {
  delivered: { label: "Entregues", icon: Mail, variant: "default", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" },
  open: { label: "Abriram", icon: Eye, variant: "secondary", color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800" },
  click: { label: "Clicaram", icon: MousePointerClick, variant: "outline", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" },
  bounce: { label: "Rejeição", icon: AlertTriangle, variant: "destructive", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" },
  spam: { label: "Spam", icon: ShieldX, variant: "destructive", color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800" },
  unsubscribe: { label: "Descadastro", icon: UserMinus, variant: "destructive", color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-700" },
  dropped: { label: "Dropped", icon: ArrowDownCircle, variant: "destructive", color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-700" },
};

type GroupedContact = {
  contact_id: string;
  email: string;
  name: string | null;
  events: { event_type: string; timestamp: string; url: string | null }[];
};

export function CampaignRecipientsDialog({ open, onOpenChange, campaign }: CampaignRecipientsDialogProps) {
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedContact, setExpandedContact] = useState<string | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["campaign-recipients", campaign?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*, contacts(email, name)")
        .eq("campaign_id", campaign!.id)
        .order("timestamp", { ascending: false })
        .limit(500);
      return (data || []) as any[];
    },
    enabled: !!campaign?.id && open,
  });

  const filteredEvents = useMemo(() => {
    if (!dateFrom && !dateTo) return events;
    return events.filter((e: any) => {
      const t = new Date(e.timestamp);
      if (dateFrom && t < dateFrom) return false;
      if (dateTo && t > dateTo) return false;
      return true;
    });
  }, [events, dateFrom, dateTo]);

  const contactMap = new Map<string, GroupedContact>();
  filteredEvents.forEach((e: any) => {
    if (!e.contact_id) return;
    if (!contactMap.has(e.contact_id)) {
      contactMap.set(e.contact_id, {
        contact_id: e.contact_id,
        email: e.contacts?.email || "—",
        name: e.contacts?.name || null,
        events: [],
      });
    }
    contactMap.get(e.contact_id)!.events.push({
      event_type: e.event_type,
      timestamp: e.timestamp,
      url: e.url,
    });
  });

  const contacts = Array.from(contactMap.values());

  const typeCounts: Record<string, Set<string>> = {};
  filteredEvents.forEach((e: any) => {
    if (!e.contact_id) return;
    if (!typeCounts[e.event_type]) typeCounts[e.event_type] = new Set();
    typeCounts[e.event_type].add(e.contact_id);
  });

  const getFilteredContacts = (filterType: string) => {
    let list = filterType === "all" ? contacts : contacts.filter((c) => c.events.some((e) => e.event_type === filterType));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.email.toLowerCase().includes(q) || (c.name || "").toLowerCase().includes(q));
    }
    return list;
  };

  const exportCsv = () => {
    const data = getFilteredContacts(activeFilter);
    if (!data.length || !campaign) return;
    const header = "Nome,Email,Eventos\n";
    const rows = data.map((c) => {
      const types = [...new Set(c.events.map((e) => eventConfig[e.event_type]?.label || e.event_type))].join("; ");
      return [c.name || "Sem nome", c.email, types]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campanha-${campaign.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterTypes = ["all", "delivered", "open", "click", "bounce", "spam", "unsubscribe", "dropped"];
  const displayedContacts = getFilteredContacts(activeFilter);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <DialogHeader className="mb-0">
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              Destinatários da Campanha
            </DialogTitle>
            {campaign && (
              <p className="text-sm text-muted-foreground mt-1">{campaign.name}</p>
            )}
          </DialogHeader>
        </div>

        {/* Stats Cards */}
        <div className="px-6 pt-4 pb-3">
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {Object.entries(eventConfig).map(([type, config]) => {
              const count = typeCounts[type]?.size || 0;
              const Icon = config.icon;
              const isActive = activeFilter === type;
              return (
                <button
                  key={type}
                  onClick={() => setActiveFilter(activeFilter === type ? "all" : type)}
                  className={`
                    flex flex-col items-center gap-0.5 rounded-xl border p-2.5 text-center transition-all cursor-pointer
                    ${isActive ? config.bg + " ring-1 ring-offset-1 ring-primary/30 shadow-sm" : "border-border hover:bg-muted/50"}
                  `}
                >
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <span className="text-base font-bold leading-tight">{count}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 pb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <DatePeriodFilter onFilterChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
          {displayedContacts.length > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs shrink-0" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          )}
        </div>

        {/* Active filter indicator */}
        {activeFilter !== "all" && (
          <div className="px-6 pb-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1 text-xs">
                {eventConfig[activeFilter]?.label || activeFilter}
                <button onClick={() => setActiveFilter("all")} className="ml-1 hover:text-foreground">✕</button>
              </Badge>
              <span className="text-xs text-muted-foreground">
                {displayedContacts.length} contato{displayedContacts.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}

        {/* Contact List */}
        <ScrollArea className="flex-1 min-h-0 px-6 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">Carregando...</div>
          ) : displayedContacts.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 text-sm">
              {search ? "Nenhum contato encontrado para esta busca" : "Nenhum contato neste período"}
            </div>
          ) : (
            <div className="space-y-1.5 pr-2">
              {displayedContacts.map((contact) => {
                const eventTypes = [...new Set(contact.events.map((e) => e.event_type))];
                const isExpanded = expandedContact === contact.contact_id;
                const visibleEvents = isExpanded ? contact.events : contact.events.slice(0, 3);

                return (
                  <div
                    key={contact.contact_id}
                    className="rounded-xl border border-border bg-card hover:shadow-sm transition-all"
                  >
                    {/* Contact header row */}
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer"
                      onClick={() => setExpandedContact(isExpanded ? null : contact.contact_id)}
                    >
                      {/* Avatar */}
                      <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0 uppercase">
                        {(contact.name || contact.email).slice(0, 2)}
                      </div>

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{contact.name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                      </div>

                      {/* Event badges */}
                      <div className="flex items-center gap-1 shrink-0">
                        {eventTypes.map((type) => {
                          const config = eventConfig[type];
                          if (!config) return null;
                          const Icon = config.icon;
                          const count = contact.events.filter((e) => e.event_type === type).length;
                          return (
                            <div
                              key={type}
                              className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${config.bg}`}
                              title={`${config.label}: ${count}`}
                            >
                              <Icon className={`h-3 w-3 ${config.color}`} />
                              {count > 1 && <span className={config.color}>{count}</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Expand toggle */}
                      {contact.events.length > 0 && (
                        <div className="shrink-0 text-muted-foreground">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      )}
                    </div>

                    {/* Event timeline (expandable) */}
                    {(isExpanded || contact.events.length <= 3) && contact.events.length > 0 && (
                      <div className="border-t border-border px-3 py-2 space-y-1 bg-muted/20">
                        {visibleEvents.map((ev, i) => {
                          const config = eventConfig[ev.event_type];
                          const Icon = config?.icon;
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                              <div className="flex items-center gap-1.5 shrink-0 w-24">
                                {Icon && <Icon className={`h-3 w-3 ${config.color}`} />}
                                <span className="font-medium">{config?.label || ev.event_type}</span>
                              </div>
                              {ev.url && (
                                <span className="truncate flex-1 text-muted-foreground" title={ev.url}>
                                  {ev.url}
                                </span>
                              )}
                              <span className="text-muted-foreground whitespace-nowrap shrink-0">
                                {new Date(ev.timestamp).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          );
                        })}
                        {!isExpanded && contact.events.length > 3 && (
                          <button
                            onClick={() => setExpandedContact(contact.contact_id)}
                            className="text-xs text-primary hover:underline pt-0.5"
                          >
                            +{contact.events.length - 3} eventos
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {!isLoading && displayedContacts.length > 0 && (
          <div className="px-6 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground text-center">
            {activeFilter === "all"
              ? `${contacts.length} contato${contacts.length !== 1 ? "s" : ""} • ${filteredEvents.length} evento${filteredEvents.length !== 1 ? "s" : ""}`
              : `${displayedContacts.length} de ${contacts.length} contatos`}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
