import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Copy, Layout } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const typeColors: Record<string, string> = {
  newsletter: "badge-info", promocional: "badge-warning", transacional: "badge-success",
  automacao: "badge-neutral", evento: "badge-info", feedback: "badge-neutral",
};

export default function TemplatesPage() {
  const { companyId, user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "newsletter" });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("email_templates").select("*").order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const addTemplate = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("email_templates").insert({
        company_id: companyId,
        name: form.name,
        type: form.type,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template criado!");
      setOpen(false);
      setForm({ name: "", type: "newsletter" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Templates</h1>
          <p className="page-description">Crie e gerencie seus modelos de email</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Novo Template</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Template</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addTemplate.mutate(); }} className="space-y-4">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="promocional">Promocional</SelectItem>
                    <SelectItem value="transacional">Transacional</SelectItem>
                    <SelectItem value="automacao">Automação</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={addTemplate.isPending} className="w-full">{addTemplate.isPending ? "Criando..." : "Criar Template"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          Nenhum template criado. Clique em "Novo Template" para começar.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-all cursor-pointer group">
              <div className="h-40 bg-muted flex items-center justify-center border-b border-border">
                <Layout className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{t.name}</h3>
                  <span className={typeColors[t.type || "newsletter"] || "badge-neutral"}>{t.type || "newsletter"}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Atualizado em {new Date(t.updated_at).toLocaleDateString("pt-BR")}</p>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" className="gap-1 flex-1"><Eye className="h-3 w-3" /> Preview</Button>
                  <Button variant="outline" size="sm" className="gap-1 flex-1"><Copy className="h-3 w-3" /> Duplicar</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
