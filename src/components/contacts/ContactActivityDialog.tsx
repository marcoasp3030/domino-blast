import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Mail, Eye, MousePointerClick, AlertTriangle, ShieldX, UserMinus, ArrowDownCircle, Activity, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface ContactActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: { id: string; name: string | null; email: string } | null;
}

const eventConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  delivered: { label: "Entregue", icon: Mail, variant: "default", color: "text-emerald-600" },
  open: { label: "Aberto", icon: Eye, variant: "secondary", color: "text-violet-600" },
  click: { label: "Clicado", icon: MousePointerClick, variant: "outline", color: "text-amber-600" },
  bounce: { label: "Bounce", icon: AlertTriangle, variant: "destructive", color: "text-red-600" },
  spam: { label: "Spam", icon: ShieldX, variant: "destructive", color: "text-rose-600" },
  unsubscribe: { label: "Unsub", icon: UserMinus, variant: "destructive", color: "text-gray-600" },
  dropped: { label: "Dropped", icon: ArrowDownCircle, variant: "destructive", color: "text-gray-500" },
};

export function ContactActivityDialog({ open, onOpenChange, contact }: ContactActivityDialogProps) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["contact-activity", contact?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*, campaigns(name)")
        .eq("contact_id", contact!.id)
        .order("timestamp", { ascending: false })
        .limit(100);
      return (data || []) as any[];
    },
    enabled: !!contact?.id && open,
  });

  const eventCounts = events.reduce((acc: Record<string, number>, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1;
    return acc;
  }, {});

  const eventTypes = ["all", "delivered", "open", "click", "bounce", "spam", "unsubscribe", "dropped"];

  const exportCsv = () => {
    if (!events.length || !contact) return;
    const header = "Evento,Campanha,URL,IP,Data\n";
    const rows = events.map((e) => {
      const cfg = eventConfig[e.event_type];
      return [
        cfg?.label || e.event_type,
        e.campaigns?.name || "",
        e.url || "",
        e.ip_address || "",
        new Date(e.timestamp).toLocaleString("pt-BR"),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atividade-${contact.email}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Atividade do Contato
          </DialogTitle>
          {contact && (
            <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{contact.name || "Sem nome"}</span> — {contact.email}
            </div>
          )}
          {events.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2 w-fit" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          )}
        </DialogHeader>

        {/* Summary cards */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {Object.entries(eventConfig).map(([type, config]) => {
            const count = eventCounts[type] || 0;
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

        {/* Event timeline */}
        <Tabs defaultValue="all" className="mt-2">
          <TabsList className="w-full justify-start overflow-x-auto">
            {eventTypes.map((type) => (
              <TabsTrigger key={type} value={type} className="text-xs">
                {type === "all" ? `Todos (${events.length})` : `${eventConfig[type]?.label || type} (${eventCounts[type] || 0})`}
              </TabsTrigger>
            ))}
          </TabsList>

          {eventTypes.map((filterType) => (
            <TabsContent key={filterType} value={filterType}>
              <ScrollArea className="h-[360px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">Carregando...</div>
                ) : (
                  <div className="space-y-1.5 pr-3">
                    {events
                      .filter((e) => filterType === "all" || e.event_type === filterType)
                      .map((event) => {
                        const config = eventConfig[event.event_type] || { label: event.event_type, icon: Activity, variant: "outline" as const, color: "text-muted-foreground" };
                        const Icon = config.icon;
                        return (
                          <div key={event.id} className="flex items-start gap-3 rounded-lg p-3 bg-muted/40 text-sm">
                            <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${config.color}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">
                                  {config.label}
                                </Badge>
                                {event.campaigns?.name && (
                                  <span className="text-xs text-muted-foreground">Campanha: <span className="font-medium text-foreground">{event.campaigns.name}</span></span>
                                )}
                              </div>
                              {event.url && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">URL: {event.url}</p>
                              )}
                              {event.ip_address && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">IP: {event.ip_address}</p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(event.timestamp).toLocaleString("pt-BR")}
                            </span>
                          </div>
                        );
                      })}
                    {events.filter((e) => filterType === "all" || e.event_type === filterType).length === 0 && (
                      <div className="text-center text-muted-foreground py-8 text-sm">Nenhum evento deste tipo</div>
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
