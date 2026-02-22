import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Layout, Pencil, Trash2, Search, Sparkles, Eye, FileText, Grid3X3, LayoutList } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateEditorDialog } from "@/components/templates/TemplateEditorDialog";
import { STARTER_TEMPLATES, type StarterTemplate } from "@/components/templates/starterTemplates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const typeColors: Record<string, string> = {
  newsletter: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  promocional: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  transacional: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  automacao: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
  evento: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  feedback: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

const typeLabels: Record<string, string> = {
  newsletter: "Newsletter",
  promocional: "Promocional",
  transacional: "Transacional",
  automacao: "Automação",
  evento: "Evento",
  feedback: "Feedback",
};

export default function TemplatesPage() {
  const { companyId, user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [editorTemplate, setEditorTemplate] = useState<any>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<StarterTemplate | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("email_templates").select("*").order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const createFromStarter = useMutation({
    mutationFn: async ({ starter, name, type }: { starter: StarterTemplate; name: string; type: string }) => {
      if (!companyId) throw new Error("No company");
      
      // Generate unique IDs for blocks
      const blocks = starter.blocks.map(b => ({ ...b, id: crypto.randomUUID() }));
      
      const { error } = await supabase.from("email_templates").insert({
        company_id: companyId,
        name,
        type,
        created_by: user?.id,
        design_json: { blocks, settings: starter.settings },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template criado com sucesso!");
      setCreateOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (t: any) => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("email_templates").insert({
        company_id: companyId,
        name: `${t.name} (cópia)`,
        type: t.type,
        html_content: t.html_content,
        design_json: t.design_json,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template duplicado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template excluído!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEditor = (t: any) => {
    setEditorTemplate(t);
    setEditorOpen(true);
  };

  const filtered = templates.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || t.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Templates</h1>
          <p className="page-description">Crie e gerencie modelos de email profissionais</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Novo Template
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="newsletter">Newsletter</SelectItem>
            <SelectItem value="promocional">Promocional</SelectItem>
            <SelectItem value="transacional">Transacional</SelectItem>
            <SelectItem value="automacao">Automação</SelectItem>
            <SelectItem value="evento">Evento</SelectItem>
            <SelectItem value="feedback">Feedback</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button onClick={() => setViewMode("grid")} className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode("list")} className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            <LayoutList className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 && templates.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-16 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-primary/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum template criado</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Comece com um dos nossos modelos prontos profissionais ou crie do zero.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Criar Primeiro Template
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum template encontrado para esta busca.</div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <div key={t.id} className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300">
              {/* Preview thumbnail */}
              <div className="relative h-44 bg-gradient-to-br from-muted to-muted/50 border-b border-border overflow-hidden">
                {t.html_content ? (
                  <iframe
                    srcDoc={t.html_content}
                    className="w-full h-full pointer-events-none"
                    title={t.name}
                    style={{ transform: "scale(0.45)", transformOrigin: "top left", width: "222%", height: "222%" }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Layout className="h-12 w-12 text-muted-foreground/20" />
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <Button size="sm" variant="secondary" className="gap-1.5 shadow-lg" onClick={() => openEditor(t)}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button size="sm" variant="secondary" className="gap-1.5 shadow-lg" onClick={() => duplicateTemplate.mutate(t)}>
                      <Copy className="h-3.5 w-3.5" /> Duplicar
                    </Button>
                  </div>
                </div>
              </div>
              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm truncate flex-1">{t.name}</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${typeColors[t.type || "newsletter"] || typeColors.newsletter}`}>
                    {typeLabels[t.type || "newsletter"] || t.type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => { if (confirm("Excluir este template?")) deleteTemplate.mutate(t.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div key={t.id} className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all">
              <div className="w-20 h-14 rounded-lg bg-muted border border-border overflow-hidden flex-shrink-0">
                {t.html_content ? (
                  <iframe srcDoc={t.html_content} className="w-full h-full pointer-events-none" title={t.name} style={{ transform: "scale(0.15)", transformOrigin: "top left", width: "666%", height: "666%" }} />
                ) : (
                  <div className="flex items-center justify-center h-full"><Layout className="h-5 w-5 text-muted-foreground/20" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-sm truncate">{t.name}</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${typeColors[t.type || "newsletter"] || typeColors.newsletter}`}>
                    {typeLabels[t.type || "newsletter"] || t.type}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Atualizado em {new Date(t.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => openEditor(t)}><Pencil className="h-3 w-3" /> Editar</Button>
                <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => duplicateTemplate.mutate(t)}><Copy className="h-3 w-3" /> Duplicar</Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive/60 hover:text-destructive" onClick={() => { if (confirm("Excluir este template?")) deleteTemplate.mutate(t.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Dialog with Starter Templates */}
      <NewTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreateFromStarter={(starter, name, type) => createFromStarter.mutate({ starter, name, type })}
        saving={createFromStarter.isPending}
      />

      <TemplateEditorDialog open={editorOpen} onOpenChange={setEditorOpen} template={editorTemplate} />
    </AppLayout>
  );
}

// ── New Template Dialog ──
function NewTemplateDialog({
  open, onOpenChange, onCreateFromStarter, saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreateFromStarter: (s: StarterTemplate, name: string, type: string) => void;
  saving: boolean;
}) {
  const [selectedStarter, setSelectedStarter] = useState<StarterTemplate | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("newsletter");
  const [starterCategory, setStarterCategory] = useState("Todos");

  const categories = ["Todos", ...Array.from(new Set(STARTER_TEMPLATES.map(s => s.category)))];
  const filteredStarters = starterCategory === "Todos"
    ? STARTER_TEMPLATES
    : STARTER_TEMPLATES.filter(s => s.category === starterCategory);

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Digite um nome para o template");
      return;
    }
    const starter = selectedStarter || STARTER_TEMPLATES[0]; // blank
    onCreateFromStarter(starter, name, type);
    // Reset on next open
    setTimeout(() => {
      setSelectedStarter(null);
      setName("");
      setType("newsletter");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Criar Novo Template
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Name & Type */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs font-medium">Nome do template</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Newsletter Março 2026"
                className="mt-1"
              />
            </div>
            <div className="w-[180px]">
              <Label className="text-xs font-medium">Tipo</Label>
              <Select value={type} onValueChange={setType}>
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
          </div>

          {/* Starter Template Selection */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Escolha um modelo para começar</Label>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setStarterCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    starterCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Template Grid */}
          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredStarters.map((starter) => {
                const isSelected = selectedStarter?.id === starter.id;
                return (
                  <button
                    key={starter.id}
                    onClick={() => setSelectedStarter(isSelected ? null : starter)}
                    className={`group relative rounded-xl border-2 overflow-hidden text-left transition-all duration-200 ${
                      isSelected
                        ? "border-primary shadow-md ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40 hover:shadow-sm"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className={`h-28 flex items-center justify-center transition-colors ${
                      starter.id === "blank"
                        ? "bg-gradient-to-br from-muted to-muted/50"
                        : "bg-gradient-to-br from-muted/80 to-accent/20"
                    }`}>
                      {starter.id === "blank" ? (
                        <div className="flex flex-col items-center gap-1.5 text-muted-foreground/40">
                          <FileText className="h-8 w-8" />
                          <span className="text-[10px] font-medium">Em branco</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground/60">
                          <span className="text-3xl">{
                            starter.id === "newsletter-modern" ? "📬" :
                            starter.id === "promo-offer" ? "🔥" :
                            starter.id === "welcome-onboarding" ? "🎉" :
                            starter.id === "event-invite" ? "📅" :
                            starter.id === "feedback-survey" ? "💬" :
                            starter.id === "black-friday" ? "🖤" :
                            starter.id === "product-launch" ? "🚀" : "📄"
                          }</span>
                          <span className="text-[10px] font-medium text-muted-foreground">{starter.category}</span>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-2.5">
                      <p className="text-xs font-semibold truncate">{starter.name}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{starter.description}</p>
                    </div>
                    {/* Selected badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim()} className="gap-2">
            {saving ? "Criando..." : "Criar Template"} <Sparkles className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
