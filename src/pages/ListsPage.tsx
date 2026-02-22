import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users, Trash2, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ListDetailDialog } from "@/components/lists/ListDetailDialog";

export default function ListsPage() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", type: "static" });
  const [detailList, setDetailList] = useState<{ id: string; name: string } | null>(null);

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["lists", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("lists").select("*, list_members(id)").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const addList = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("lists").insert({
        company_id: companyId,
        name: form.name,
        description: form.description || null,
        type: form.type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      toast.success("Lista criada!");
      setOpen(false);
      setForm({ name: "", description: "", type: "static" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      toast.success("Lista excluída!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Listas & Segmentos</h1>
          <p className="page-description">Organize seus contatos em listas e segmentos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nova Lista</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Lista</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addList.mutate(); }} className="space-y-4">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" /></div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
              <Button type="submit" disabled={addList.isPending} className="w-full">{addList.isPending ? "Criando..." : "Criar Lista"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : lists.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          Nenhuma lista criada. Clique em "Nova Lista" para começar.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((l: any) => (
            <div key={l.id} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Users className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="flex items-center gap-1">
                  <span className={l.type === "dynamic" ? "badge-info" : "badge-neutral"}>{l.type === "dynamic" ? "Dinâmica" : "Fixa"}</span>
                </div>
              </div>
              <h3 className="font-semibold mb-1">{l.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{l.description || "Sem descrição"}</p>
              <p className="text-sm mb-3">
                <span className="font-semibold">{l.list_members?.length || 0}</span>
                <span className="text-muted-foreground"> contatos</span>
              </p>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => setDetailList({ id: l.id, name: l.name })}>
                  <Eye className="h-3 w-3" /> Gerenciar
                </Button>
                <Button variant="outline" size="sm" className="gap-1 px-2 text-destructive hover:text-destructive" onClick={() => { if (confirm("Excluir esta lista?")) deleteList.mutate(l.id); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ListDetailDialog open={!!detailList} onOpenChange={(o) => !o && setDetailList(null)} list={detailList} />
    </AppLayout>
  );
}
