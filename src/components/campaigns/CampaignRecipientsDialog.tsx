import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Eye, MousePointerClick, AlertTriangle, ShieldX, UserMinus, ArrowDownCircle, Activity, Users } from "lucide-react";

interface CampaignRecipientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: { id: string; name: string } | null;
}

const eventConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  delivered: { label: "Entregues", icon: Mail, variant: "default", color: "text-emerald-600" },
  open: { label: "Abriram", icon: Eye, variant: "secondary", color: "text-violet-600" },
  click: { label: "Clicaram", icon: MousePointerClick, variant: "outline", color: "text-amber-600" },
  bounce: { label: "Bounce", icon: AlertTriangle, variant: "destructive", color: "text-red-600" },
  spam: { label: "Spam", icon: ShieldX, variant: "destructive", color: "text-rose-600" },
  unsubscribe: { label: "Unsub", icon: UserMinus, variant: "destructive", color: "text-gray-600" },
  dropped: { label: "Dropped", icon: ArrowDownCircle, variant: "destructive", color: "text-gray-500" },
};

type GroupedContact = {
  contact_id: string;
  email: string;
  name: string | null;
  events: { event_type: string; timestamp: string; url: string | null }[];
};

export function CampaignRecipientsDialog({ open, onOpenChange, campaign }: CampaignRecipientsDialogProps) {
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

  // Group events by contact
  const contactMap = new Map<string, GroupedContact>();
  events.forEach((e: any) => {
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

  // Count unique contacts per event type
  const typeCounts: Record<string, Set<string>> = {};
  events.forEach((e: any) => {
    if (!e.contact_id) return;
    if (!typeCounts[e.event_type]) typeCounts[e.event_type] = new Set();
    typeCounts[e.event_type].add(e.contact_id);
  });

  const filterTypes = ["all", "delivered", "open", "click", "bounce", "spam", "unsubscribe", "dropped"];

  const getFilteredContacts = (filterType: string) => {
    if (filterType === "all") return contacts;
    return contacts.filter((c) => c.events.some((e) => e.event_type === filterType));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Destinatários da Campanha
          </DialogTitle>
          {campaign && (
            <p className="text-sm text-muted-foreground">{campaign.name}</p>
          )}
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {Object.entries(eventConfig).map(([type, config]) => {
            const count = typeCounts[type]?.size || 0;
            const Icon = config.icon;
            return (
              <div key={type} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 text-center">
                <Icon className={`h-4 w-4 ${config.color}`} />
                <span className="text-lg font-bold">{count}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{config.label}</span>
              </div>
            );
          })}
        </div>

        <Tabs defaultValue="all" className="mt-2">
          <TabsList className="w-full justify-start overflow-x-auto">
            {filterTypes.map((type) => (
              <TabsTrigger key={type} value={type} className="text-xs">
                {type === "all"
                  ? `Todos (${contacts.length})`
                  : `${eventConfig[type]?.label || type} (${typeCounts[type]?.size || 0})`}
              </TabsTrigger>
            ))}
          </TabsList>

          {filterTypes.map((filterType) => (
            <TabsContent key={filterType} value={filterType}>
              <ScrollArea className="h-[360px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">Carregando...</div>
                ) : (
                  <div className="space-y-2 pr-3">
                    {getFilteredContacts(filterType).map((contact) => {
                      const eventTypes = [...new Set(contact.events.map((e) => e.event_type))];
                      return (
                        <div key={contact.contact_id} className="rounded-lg border border-border p-3 bg-muted/30">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{contact.name || "Sem nome"}</p>
                              <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                            </div>
                            <div className="flex gap-1 flex-wrap justify-end">
                              {eventTypes.map((type) => {
                                const config = eventConfig[type];
                                if (!config) return null;
                                const Icon = config.icon;
                                return (
                                  <div key={type} className="flex items-center gap-1">
                                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-1">
                            {contact.events.slice(0, 5).map((ev, i) => {
                              const config = eventConfig[ev.event_type];
                              return (
                                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant={config?.variant || "outline"} className="text-[9px] px-1 py-0">
                                    {config?.label || ev.event_type}
                                  </Badge>
                                  {ev.url && <span className="truncate flex-1">{ev.url}</span>}
                                  <span className="whitespace-nowrap">{new Date(ev.timestamp).toLocaleString("pt-BR")}</span>
                                </div>
                              );
                            })}
                            {contact.events.length > 5 && (
                              <p className="text-[11px] text-muted-foreground">+{contact.events.length - 5} eventos</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {getFilteredContacts(filterType).length === 0 && (
                      <div className="text-center text-muted-foreground py-8 text-sm">Nenhum contato nesta categoria</div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
