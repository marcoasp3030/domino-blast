import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Store, MoreHorizontal, Pencil, Trash2, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";

export default function StoresPage() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editStore, setEditStore] = useState<{ id: string; name: string; description: string } | null>(null);
  const [deleteStore, setDeleteStore] = useState<{ id: string; name: string } | null>(null);

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["stores", companyId, search],
    queryFn: async () => {
      let q = supabase.from("stores").select("*").order("name");
      if (search) q = q.ilike("name", `%${search}%`);
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Get contact count per store
  const { data: storeCounts = {} } = useQuery({
    queryKey: ["store-counts", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("store_id")
        .not("store_id", "is", null);
      const counts: Record<string, number> = {};
      (data || []).forEach((c) => {
        if (c.store_id) counts[c.store_id] = (counts[c.store_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!companyId,
  });

  const addMut = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("stores").insert({
        company_id: companyId,
        name: form.name,
        description: form.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      toast.success("Loja criada!");
      setOpen(false);
      setForm({ name: "", description: "" });
    },
    onError: (e: any) => toast.error(e.message?.includes("duplicate") ? "Já existe uma loja com esse nome" : e.message),
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editStore) throw new Error("No store");
      const { error } = await supabase.from("stores").update({
        name: editStore.name,
        description: editStore.description || null,
      }).eq("id", editStore.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      toast.success("Loja atualizada!");
      setEditStore(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!deleteStore) throw new Error("No store");
      const { error } = await supabase.from("stores").delete().eq("id", deleteStore.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Loja excluída!");
      setDeleteStore(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Lojas</h1>
          <p className="page-description">Gerencie suas lojas para segmentar contatos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nova Loja</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Loja</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addMut.mutate(); }} className="space-y-4">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" placeholder="Ex: Loja Centro" /></div>
              <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" placeholder="Opcional" /></div>
              <Button type="submit" disabled={addMut.isPending} className="w-full">{addMut.isPending ? "Salvando..." : "Criar Loja"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar loja..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-48 mb-3" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))
        ) : stores.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Store className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma loja cadastrada</p>
            <p className="text-sm mt-1">Crie lojas para segmentar seus contatos</p>
          </div>
        ) : (
          stores.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{s.name}</h3>
                    {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditStore({ id: s.id, name: s.name, description: s.description || "" })}>
                      <Pencil className="h-4 w-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteStore({ id: s.id, name: s.name })}>
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">{storeCounts[s.id] || 0} contatos</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editStore} onOpenChange={(o) => !o && setEditStore(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Loja</DialogTitle></DialogHeader>
          {editStore && (
            <form onSubmit={(e) => { e.preventDefault(); updateMut.mutate(); }} className="space-y-4">
              <div><Label>Nome</Label><Input value={editStore.name} onChange={(e) => setEditStore({ ...editStore, name: e.target.value })} required className="mt-1" /></div>
              <div><Label>Descrição</Label><Input value={editStore.description} onChange={(e) => setEditStore({ ...editStore, description: e.target.value })} className="mt-1" /></div>
              <Button type="submit" disabled={updateMut.isPending} className="w-full">{updateMut.isPending ? "Salvando..." : "Salvar"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteStore} onOpenChange={(o) => !o && setDeleteStore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir loja?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <span className="font-medium text-foreground">{deleteStore?.name}</span>? Os contatos não serão excluídos, apenas desvinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMut.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
