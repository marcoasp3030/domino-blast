import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Plus, Search, ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Trash2, Download, Tags, Zap, RefreshCw, Store } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CsvImportDialog } from "@/components/contacts/CsvImportDialog";
import { ContactActivityDialog } from "@/components/contacts/ContactActivityDialog";
import { useContactTags, useTags, ContactTagBadges, ContactTagPicker, TagManagerDialog } from "@/components/contacts/ContactTags";
import { BulkTagPicker } from "@/components/contacts/BulkTagPicker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const PAGE_SIZES = [25, 50, 100];

const statusClass: Record<string, string> = {
  active: "badge-success",
  inactive: "badge-neutral",
  unsubscribed: "badge-warning",
  bounced: "badge-danger",
};
const statusLabel: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  unsubscribed: "Descadastrado",
  bounced: "Bounced",
};

type ContactStatus = "active" | "inactive" | "unsubscribed" | "bounced";

function ScoreBadge({ score }: { score: number }) {
  let color: string;
  let label: string;
  if (score >= 70) { color = "text-emerald-600"; label = "Quente"; }
  else if (score >= 40) { color = "text-amber-500"; label = "Morno"; }
  else if (score > 0) { color = "text-orange-500"; label = "Frio"; }
  else { color = "text-muted-foreground"; label = "Inativo"; }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 min-w-[70px]">
          <Zap className={`h-3.5 w-3.5 shrink-0 ${color}`} />
          <Progress value={score} className="h-1.5 flex-1 max-w-[40px]" />
          <span className={`text-xs font-semibold ${color}`}>{score}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs">Score: {score}/100 — {label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function ContactsPage() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", origin: "Manual", store_id: "" });
  const [activityContact, setActivityContact] = useState<{ id: string; name: string | null; email: string } | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Edit state
  const [editContact, setEditContact] = useState<{ id: string; name: string; email: string; phone: string; status: string; store_id: string } | null>(null);
  // Delete state
  const [deleteContact, setDeleteContact] = useState<{ id: string; name: string | null; email: string } | null>(null);
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [recalculating, setRecalculating] = useState(false);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const invalidateContacts = () => {
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    queryClient.invalidateQueries({ queryKey: ["contacts-count"] });
  };

  // Helper: get contact IDs matching tag filter
  const { data: tagFilteredIds, isLoading: isTagFilterLoading } = useQuery({
    queryKey: ["contacts-by-tag", tagFilter],
    queryFn: async () => {
      if (tagFilter === "all") return null;
      const { data } = await supabase
        .from("contact_tags")
        .select("contact_id")
        .eq("tag_id", tagFilter);
      return (data || []).map((r) => r.contact_id);
    },
    enabled: !!companyId,
  });

  // When tag filter is active but no contacts match, use impossible ID to get 0 results
  const applyTagFilter = (q: any) => {
    if (tagFilter !== "all" && tagFilteredIds !== null && tagFilteredIds !== undefined) {
      if (tagFilteredIds.length === 0) {
        q = q.in("id", ["00000000-0000-0000-0000-000000000000"]);
      } else {
        q = q.in("id", tagFilteredIds);
      }
    }
    return q;
  };

  const applyScoreFilter = (q: any) => {
    if (scoreFilter === "hot") q = q.gte("engagement_score", 70);
    else if (scoreFilter === "warm") q = q.gte("engagement_score", 40).lt("engagement_score", 70);
    else if (scoreFilter === "cold") q = q.gt("engagement_score", 0).lt("engagement_score", 40);
    else if (scoreFilter === "inactive") q = q.eq("engagement_score", 0);
    return q;
  };

  const applyStoreFilter = (q: any) => {
    if (storeFilter === "none") q = q.is("store_id", null);
    else if (storeFilter !== "all") q = q.eq("store_id", storeFilter);
    return q;
  };

  // Fetch stores for filter
  const { data: allStores = [] } = useQuery({
    queryKey: ["stores", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name").order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: totalCount = 0 } = useQuery({
    queryKey: ["contacts-count", companyId, search, statusFilter, tagFilter, tagFilteredIds, scoreFilter, storeFilter],
    queryFn: async () => {
      let q = supabase.from("contacts").select("*", { count: "exact", head: true });
      if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      if (statusFilter !== "all") q = q.eq("status", statusFilter as ContactStatus);
      q = applyTagFilter(q);
      q = applyScoreFilter(q);
      q = applyStoreFilter(q);
      const { count } = await q;
      return count || 0;
    },
    enabled: !!companyId && (tagFilter === "all" || tagFilteredIds !== undefined),
  });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", companyId, search, page, pageSize, statusFilter, tagFilter, tagFilteredIds, scoreFilter, storeFilter],
    queryFn: async () => {
      let q = supabase
        .from("contacts")
        .select("*, stores(name)")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      if (statusFilter !== "all") q = q.eq("status", statusFilter as ContactStatus);
      q = applyTagFilter(q);
      q = applyScoreFilter(q);
      q = applyStoreFilter(q);
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId && (tagFilter === "all" || tagFilteredIds !== undefined),
  });

  // Fetch tags for current page contacts
  const contactIds = contacts.map((c) => c.id);
  const { data: contactTagsMap = {} } = useContactTags(contactIds);
  const { data: allTags = [] } = useTags();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const addContactMut = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("contacts").insert({
        company_id: companyId,
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        origin: form.origin,
        store_id: form.store_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateContacts();
      toast.success("Contato adicionado!");
      setOpen(false);
      setForm({ name: "", email: "", phone: "", origin: "Manual", store_id: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateContactMut = useMutation({
    mutationFn: async () => {
      if (!editContact) throw new Error("No contact");
      const { error } = await supabase.from("contacts").update({
        name: editContact.name,
        email: editContact.email,
        phone: editContact.phone || null,
        status: editContact.status as ContactStatus,
        store_id: editContact.store_id || null,
      }).eq("id", editContact.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateContacts();
      toast.success("Contato atualizado!");
      setEditContact(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteContactMut = useMutation({
    mutationFn: async () => {
      if (!deleteContact) throw new Error("No contact");
      const { error } = await supabase.from("contacts").delete().eq("id", deleteContact.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateContacts();
      toast.success("Contato excluído!");
      setDeleteContact(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedIds);
      if (!ids.length) throw new Error("Nenhum contato selecionado");
      const { error } = await supabase.from("contacts").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateContacts();
      toast.success(`${selectedIds.size} contato(s) excluído(s)!`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (contacts.length > 0 && contacts.every((c) => selectedIds.has(c.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const allSelected = contacts.length > 0 && contacts.every((c) => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;

  const exportCsv = async () => {
    toast.info("Exportando contatos...");
    let q = supabase.from("contacts").select("name, email, phone, status, origin, created_at").order("created_at", { ascending: false });
    if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    if (statusFilter !== "all") q = q.eq("status", statusFilter as ContactStatus);
    const { data } = await q.limit(5000);
    if (!data || data.length === 0) { toast.error("Nenhum contato para exportar"); return; }
    const header = "Nome,Email,Telefone,Status,Origem,Cadastro\n";
    const rows = data.map((c) =>
      [c.name || "", c.email, c.phone || "", statusLabel[c.status] || c.status, c.origin || "", new Date(c.created_at).toLocaleDateString("pt-BR")]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contatos${statusFilter !== "all" ? `-${statusFilter}` : ""}${search ? `-${search}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${data.length} contatos exportados!`);
  };

  const recalculateScores = async () => {
    if (!companyId) return;
    setRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke("recalculate-scores");
      if (error) throw error;
      invalidateContacts();
      toast.success(`Scores recalculados para ${data?.total_updated || 0} contatos!`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao recalcular scores");
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Contatos</h1>
          <p className="page-description">Gerencie sua base de contatos e leads ({totalCount})</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setTagManagerOpen(true)}><Tags className="h-4 w-4" /> Tags</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}><Download className="h-4 w-4" /> Exportar</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Importar</Button>
          <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Novo Contato</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Contato</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addContactMut.mutate(); }} className="space-y-4">
                <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1" /></div>
                <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
                <div>
                  <Label>Loja</Label>
                  <Select value={form.store_id || "none"} onValueChange={(v) => setForm({ ...form, store_id: v === "none" ? "" : v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {allStores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={addContactMut.isPending} className="w-full">{addContactMut.isPending ? "Salvando..." : "Adicionar"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." className="pl-9" value={search} onChange={(e) => handleSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
            <SelectItem value="unsubscribed">Descadastrado</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tagFilter} onValueChange={(v) => { setTagFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as tags</SelectItem>
            {allTags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.color || "#3B82F6" }} />
                  {t.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={scoreFilter} onValueChange={(v) => { setScoreFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os scores</SelectItem>
            <SelectItem value="hot">🔥 Quente (70+)</SelectItem>
            <SelectItem value="warm">🌤 Morno (40-69)</SelectItem>
            <SelectItem value="cold">❄️ Frio (1-39)</SelectItem>
            <SelectItem value="inactive">⬜ Inativo (0)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={storeFilter} onValueChange={(v) => { setStoreFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Loja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as lojas</SelectItem>
            <SelectItem value="none">Sem loja</SelectItem>
            {allStores.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  <Store className="h-3 w-3" />
                  {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={recalculateScores} disabled={recalculating}>
              <RefreshCw className={`h-4 w-4 ${recalculating ? "animate-spin" : ""}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Recalcular scores</TooltipContent>
        </Tooltip>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border border-border bg-muted/50">
          <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
          <BulkTagPicker selectedIds={selectedIds} />
          <Button variant="destructive" size="sm" className="gap-2" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Excluir selecionados
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Limpar seleção</Button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="px-3 py-3 w-10"><Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Selecionar todos" /></th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Contato</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Loja</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Origem</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Cadastro</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Ações</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading || (tagFilter !== "all" && isTagFilterLoading) ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                   <td className="px-3 py-4"><Skeleton className="h-4 w-4 rounded" /></td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                      <div className="flex gap-1"><Skeleton className="h-5 w-14 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /></div>
                    </div>
                  </td>
                  <td className="px-4 py-4"><Skeleton className="h-3 w-16" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 rounded ml-auto" /></td>
                  <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 rounded ml-auto" /></td>
                </tr>
              ))
            ) : contacts.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Nenhum contato encontrado</td></tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className={`border-t border-border hover:bg-muted/50 transition-colors cursor-pointer ${selectedIds.has(c.id) ? "bg-muted/40" : ""}`} onClick={() => setActivityContact({ id: c.id, name: c.name, email: c.email })}>
                  <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} aria-label={`Selecionar ${c.name || c.email}`} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className="min-w-0">
                        <p className="font-medium">{c.name || "-"}</p>
                        <p className="text-sm text-muted-foreground">{c.email}</p>
                        <ContactTagBadges tags={contactTagsMap[c.id] || []} />
                      </div>
                      <ContactTagPicker contactId={c.id} currentTags={contactTagsMap[c.id] || []} />
                    </div>
                  </td>
                  <td className="px-4 py-4"><ScoreBadge score={(c as any).engagement_score || 0} /></td>
                  <td className="px-6 py-4"><span className={statusClass[c.status] || "badge-neutral"}>{statusLabel[c.status] || c.status}</span></td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{(c as any).stores?.name || "-"}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{c.origin || "-"}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditContact({ id: c.id, name: c.name || "", email: c.email, phone: c.phone || "", status: c.status, store_id: (c as any).store_id || "" }); }}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteContact({ id: c.id, name: c.name, email: c.email }); }}>
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Exibir</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
            <SelectTrigger className="w-[70px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>por página</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {totalCount > 0
              ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, totalCount)} de ${totalCount}`
              : "0 resultados"}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editContact} onOpenChange={(o) => !o && setEditContact(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Contato</DialogTitle></DialogHeader>
          {editContact && (
            <form onSubmit={(e) => { e.preventDefault(); updateContactMut.mutate(); }} className="space-y-4">
              <div><Label>Nome</Label><Input value={editContact.name} onChange={(e) => setEditContact({ ...editContact, name: e.target.value })} required className="mt-1" /></div>
              <div><Label>Email</Label><Input type="email" value={editContact.email} onChange={(e) => setEditContact({ ...editContact, email: e.target.value })} required className="mt-1" /></div>
              <div><Label>Telefone</Label><Input value={editContact.phone} onChange={(e) => setEditContact({ ...editContact, phone: e.target.value })} className="mt-1" /></div>
              <div>
                <Label>Status</Label>
                <Select value={editContact.status} onValueChange={(v) => setEditContact({ ...editContact, status: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="unsubscribed">Descadastrado</SelectItem>
                    <SelectItem value="bounced">Bounced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Loja</Label>
                <Select value={editContact.store_id || "none"} onValueChange={(v) => setEditContact({ ...editContact, store_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {allStores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={updateContactMut.isPending} className="w-full">{updateContactMut.isPending ? "Salvando..." : "Salvar"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteContact} onOpenChange={(o) => !o && setDeleteContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <span className="font-medium text-foreground">{deleteContact?.name || deleteContact?.email}</span>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteContactMut.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteContactMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} contato(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} contato(s) selecionado(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => bulkDeleteMut.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkDeleteMut.isPending ? "Excluindo..." : `Excluir ${selectedIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ContactActivityDialog open={!!activityContact} onOpenChange={(o) => !o && setActivityContact(null)} contact={activityContact} />
      <TagManagerDialog open={tagManagerOpen} onOpenChange={setTagManagerOpen} />
    </AppLayout>
  );
}
