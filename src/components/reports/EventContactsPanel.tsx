import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["event_type"];
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft, ChevronRight, Download, Mail, MousePointerClick, Eye, AlertTriangle, ShieldAlert, UserMinus } from "lucide-react";

const EVENT_TABS = [
  { value: "open", label: "Aberturas", icon: Eye, color: "hsl(262, 83%, 58%)" },
  { value: "click", label: "Cliques", icon: MousePointerClick, color: "hsl(38, 92%, 50%)" },
  { value: "delivered", label: "Entregas", icon: Mail, color: "hsl(152, 69%, 40%)" },
  { value: "bounce", label: "Bounces", icon: AlertTriangle, color: "hsl(0, 72%, 51%)" },
  { value: "spam", label: "Spam", icon: ShieldAlert, color: "hsl(350, 80%, 55%)" },
  { value: "unsubscribe", label: "Unsub", icon: UserMinus, color: "hsl(220, 10%, 46%)" },
] as const;

const PAGE_SIZE = 15;

export function EventContactsPanel() {
  const { companyId } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("open");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const handleTabChange = (v: string) => {
    setActiveTab(v);
    setSearch("");
    setPage(0);
  };

  const { data: totalCount = 0 } = useQuery({
    queryKey: ["event-contacts-count", companyId, activeTab, search],
    queryFn: async () => {
      let q = supabase
        .from("events")
        .select("contact_id, contacts!inner(name, email)", { count: "exact", head: true })
        .eq("event_type", activeTab as EventType);

      if (search) {
        q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`, { referencedTable: "contacts" });
      }

      const { count } = await q;
      return count || 0;
    },
    enabled: !!companyId,
  });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["event-contacts", companyId, activeTab, search, page],
    queryFn: async () => {
      let q = supabase
        .from("events")
        .select("contact_id, timestamp, url, contacts!inner(name, email, status), campaigns(name)")
        .eq("event_type", activeTab as EventType)
        .order("timestamp", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`, { referencedTable: "contacts" });
      }

      const { data } = await q;
      return (data || []).map((e: any) => ({
        contactId: e.contact_id,
        name: e.contacts?.name || "-",
        email: e.contacts?.email || "-",
        status: e.contacts?.status || "active",
        campaign: e.campaigns?.name || "-",
        timestamp: e.timestamp,
        url: e.url,
      }));
    },
    enabled: !!companyId,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const statusLabel: Record<string, string> = {
    active: "Ativo",
    inactive: "Inativo",
    unsubscribed: "Descadastrado",
    bounced: "Bounced",
  };
  const statusClass: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    inactive: "bg-muted text-muted-foreground",
    unsubscribed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    bounced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  const activeTabMeta = EVENT_TABS.find((t) => t.value === activeTab)!;

  const exportCsv = async () => {
    let q = supabase
      .from("events")
      .select("contact_id, timestamp, url, contacts!inner(name, email, status), campaigns(name)")
      .eq("event_type", activeTab as EventType)
      .order("timestamp", { ascending: false })
      .limit(5000);

    if (search) {
      q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`, { referencedTable: "contacts" });
    }

    const { data } = await q;
    if (!data || data.length === 0) return;

    const header = "Nome,Email,Campanha,Data,URL\n";
    const rows = data.map((e: any) =>
      [
        e.contacts?.name || "",
        e.contacts?.email || "",
        e.campaigns?.name || "",
        new Date(e.timestamp).toLocaleString("pt-BR"),
        e.url || "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    ).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contatos-${activeTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 pb-0">
          <div>
            <h3 className="text-base font-semibold">Contatos por Evento</h3>
            <p className="text-sm text-muted-foreground">Veja quem interagiu com suas campanhas</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar contato..."
                className="pl-8 h-8 w-48 text-sm"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        </div>

        <TabsList className="w-full justify-start gap-0 rounded-none border-b border-border bg-transparent px-4 h-auto flex-wrap">
          {EVENT_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2.5 text-xs font-medium"
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {EVENT_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Contato</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Campanha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Data</th>
                    {(activeTab === "click") && (
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">URL</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="px-4 py-3"><div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-40" /></div></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                        {activeTab === "click" && <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>}
                      </tr>
                    ))
                  ) : contacts.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === "click" ? 5 : 4} className="px-4 py-12 text-center text-muted-foreground">
                        <activeTabMeta.icon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        Nenhum contato com evento de {activeTabMeta.label.toLowerCase()}
                      </td>
                    </tr>
                  ) : (
                    contacts.map((c, i) => (
                      <tr key={`${c.contactId}-${c.timestamp}-${i}`} className="border-b border-border hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass[c.status] || "bg-muted text-muted-foreground"}`}>
                            {statusLabel[c.status] || c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{c.campaign}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(c.timestamp).toLocaleString("pt-BR")}</td>
                        {activeTab === "click" && (
                          <td className="px-4 py-3 max-w-[200px] truncate text-muted-foreground" title={c.url || ""}>
                            {c.url ? (
                              <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{c.url}</a>
                            ) : "-"}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {totalCount > 0
                  ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalCount)} de ${totalCount}`
                  : "0 resultados"}
              </span>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground px-1">{page + 1} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
