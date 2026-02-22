import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Activity, Mail, MousePointerClick, Eye, AlertTriangle, ShieldX, UserMinus, ArrowDownCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Tables } from "@/integrations/supabase/types";

type Event = Tables<"events">;

const eventConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  delivered: { label: "Entregue", icon: Mail, variant: "default" },
  open: { label: "Aberto", icon: Eye, variant: "secondary" },
  click: { label: "Clicado", icon: MousePointerClick, variant: "outline" },
  bounce: { label: "Bounce", icon: AlertTriangle, variant: "destructive" },
  spam: { label: "Spam", icon: ShieldX, variant: "destructive" },
  unsubscribe: { label: "Unsub", icon: UserMinus, variant: "destructive" },
  dropped: { label: "Dropped", icon: ArrowDownCircle, variant: "destructive" },
};

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s atrás`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  return new Date(date).toLocaleDateString("pt-BR");
}

export function EventLogPanel() {
  const { companyId } = useAuth();
  const [realtimeEvents, setRealtimeEvents] = useState<Event[]>([]);

  const { data: initialEvents = [] } = useQuery({
    queryKey: ["event-log", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*, contacts(email, name)")
        .order("timestamp", { ascending: false })
        .limit(50);
      return (data || []) as (Event & { contacts: { email: string; name: string | null } | null })[];
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel("event-log-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        async (payload) => {
          const newEvent = payload.new as Event;
          // Fetch contact info
          if (newEvent.contact_id) {
            const { data: contact } = await supabase
              .from("contacts")
              .select("email, name")
              .eq("id", newEvent.contact_id)
              .single();
            (newEvent as any).contacts = contact;
          }
          setRealtimeEvents((prev) => [newEvent, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  const allEvents = [...realtimeEvents, ...initialEvents].slice(0, 50);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-1">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold">Eventos em Tempo Real</h3>
        {realtimeEvents.length > 0 && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">Últimos 50 eventos do webhook</p>

      {allEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
          <Activity className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">Nenhum evento registrado ainda</p>
        </div>
      ) : (
        <ScrollArea className="h-[360px]">
          <div className="space-y-2 pr-3">
            {allEvents.map((event, i) => {
              const config = eventConfig[event.event_type] || { label: event.event_type, icon: Activity, variant: "outline" as const };
              const Icon = config.icon;
              const contact = (event as any).contacts;
              const isNew = i < realtimeEvents.length;

              return (
                <div
                  key={event.id + "-" + i}
                  className={`flex items-center gap-3 rounded-lg p-3 text-sm transition-colors ${
                    isNew ? "bg-primary/5 border border-primary/20" : "bg-muted/40"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">
                        {config.label}
                      </Badge>
                      <span className="truncate text-foreground font-medium">
                        {contact?.email || "—"}
                      </span>
                    </div>
                    {event.url && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{event.url}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(event.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
