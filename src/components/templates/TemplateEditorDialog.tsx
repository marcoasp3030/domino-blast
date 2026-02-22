import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Type, Image, Columns, Minus, Square, ArrowUp, ArrowDown, Trash2, 
  Eye, Code, Save, GripVertical, MousePointerClick 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type BlockType = "heading" | "text" | "image" | "button" | "divider" | "columns";

interface Block {
  id: string;
  type: BlockType;
  content: Record<string, string>;
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: typeof Type }[] = [
  { type: "heading", label: "Título", icon: Type },
  { type: "text", label: "Texto", icon: Type },
  { type: "image", label: "Imagem", icon: Image },
  { type: "button", label: "Botão", icon: MousePointerClick },
  { type: "divider", label: "Divisor", icon: Minus },
  { type: "columns", label: "2 Colunas", icon: Columns },
];

function defaultContent(type: BlockType): Record<string, string> {
  switch (type) {
    case "heading": return { text: "Seu título aqui", align: "center", size: "24" };
    case "text": return { text: "Seu texto aqui. Escreva o conteúdo do seu email.", align: "left" };
    case "image": return { src: "https://placehold.co/600x200/0EA5E9/FFF?text=Sua+Imagem", alt: "Imagem", width: "100" };
    case "button": return { text: "Clique Aqui", url: "https://", bgColor: "#0EA5E9", color: "#FFFFFF", align: "center" };
    case "divider": return { color: "#e5e7eb", height: "1" };
    case "columns": return { left: "Coluna esquerda", right: "Coluna direita" };
  }
}

function blockToHtml(block: Block): string {
  const c = block.content;
  switch (block.type) {
    case "heading":
      return `<h1 style="font-size:${c.size || 24}px;text-align:${c.align || "center"};margin:0;padding:16px 0;font-family:Arial,sans-serif;">${c.text}</h1>`;
    case "text":
      return `<p style="font-size:16px;line-height:1.6;text-align:${c.align || "left"};margin:0;padding:8px 0;font-family:Arial,sans-serif;color:#333333;">${c.text}</p>`;
    case "image":
      return `<div style="text-align:center;padding:8px 0;"><img src="${c.src}" alt="${c.alt}" style="max-width:${c.width || 100}%;height:auto;border-radius:8px;" /></div>`;
    case "button":
      return `<div style="text-align:${c.align || "center"};padding:16px 0;"><a href="${c.url}" style="background:${c.bgColor || "#0EA5E9"};color:${c.color || "#FFF"};padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;font-family:Arial,sans-serif;">${c.text}</a></div>`;
    case "divider":
      return `<hr style="border:none;border-top:${c.height || 1}px solid ${c.color || "#e5e7eb"};margin:16px 0;" />`;
    case "columns":
      return `<table width="100%" cellpadding="0" cellspacing="0" style="padding:8px 0;"><tr><td width="50%" style="padding-right:8px;font-size:16px;font-family:Arial,sans-serif;color:#333;">${c.left}</td><td width="50%" style="padding-left:8px;font-size:16px;font-family:Arial,sans-serif;color:#333;">${c.right}</td></tr></table>`;
  }
}

function blocksToFullHtml(blocks: Block[]): string {
  const inner = blocks.map(blockToHtml).join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f4f5;"><div style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px;border-radius:8px;">${inner}</div></body></html>`;
}

function BlockEditor({ block, onChange }: { block: Block; onChange: (c: Record<string, string>) => void }) {
  const c = block.content;
  const update = (key: string, val: string) => onChange({ ...c, [key]: val });

  switch (block.type) {
    case "heading":
      return (
        <div className="space-y-2">
          <Input value={c.text} onChange={(e) => update("text", e.target.value)} placeholder="Título" />
          <div className="flex gap-2">
            <Input type="number" value={c.size} onChange={(e) => update("size", e.target.value)} className="w-20" />
            <select className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={c.align} onChange={(e) => update("align", e.target.value)}>
              <option value="left">Esquerda</option>
              <option value="center">Centro</option>
              <option value="right">Direita</option>
            </select>
          </div>
        </div>
      );
    case "text":
      return (
        <div className="space-y-2">
          <Textarea value={c.text} onChange={(e) => update("text", e.target.value)} rows={3} />
          <select className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={c.align} onChange={(e) => update("align", e.target.value)}>
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </select>
        </div>
      );
    case "image":
      return (
        <div className="space-y-2">
          <Input value={c.src} onChange={(e) => update("src", e.target.value)} placeholder="URL da imagem" />
          <Input value={c.alt} onChange={(e) => update("alt", e.target.value)} placeholder="Texto alternativo" />
          <div className="flex items-center gap-2">
            <Label className="text-xs">Largura (%)</Label>
            <Input type="number" value={c.width} onChange={(e) => update("width", e.target.value)} className="w-20" min="10" max="100" />
          </div>
        </div>
      );
    case "button":
      return (
        <div className="space-y-2">
          <Input value={c.text} onChange={(e) => update("text", e.target.value)} placeholder="Texto do botão" />
          <Input value={c.url} onChange={(e) => update("url", e.target.value)} placeholder="URL de destino" />
          <div className="flex gap-2">
            <div className="flex items-center gap-1"><Label className="text-xs">Fundo</Label><input type="color" value={c.bgColor} onChange={(e) => update("bgColor", e.target.value)} className="h-8 w-8 cursor-pointer rounded" /></div>
            <div className="flex items-center gap-1"><Label className="text-xs">Texto</Label><input type="color" value={c.color} onChange={(e) => update("color", e.target.value)} className="h-8 w-8 cursor-pointer rounded" /></div>
          </div>
        </div>
      );
    case "divider":
      return (
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1"><Label className="text-xs">Cor</Label><input type="color" value={c.color} onChange={(e) => update("color", e.target.value)} className="h-8 w-8 cursor-pointer rounded" /></div>
          <div className="flex items-center gap-1"><Label className="text-xs">Altura</Label><Input type="number" value={c.height} onChange={(e) => update("height", e.target.value)} className="w-16" min="1" max="10" /></div>
        </div>
      );
    case "columns":
      return (
        <div className="space-y-2">
          <div><Label className="text-xs">Coluna esquerda</Label><Textarea value={c.left} onChange={(e) => update("left", e.target.value)} rows={2} /></div>
          <div><Label className="text-xs">Coluna direita</Label><Textarea value={c.right} onChange={(e) => update("right", e.target.value)} rows={2} /></div>
        </div>
      );
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: { id: string; name: string; html_content: string | null; design_json: any } | null;
}

export function TemplateEditorDialog({ open, onOpenChange, template }: Props) {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (template?.design_json && Array.isArray((template.design_json as any)?.blocks)) {
      return (template.design_json as any).blocks;
    }
    return [];
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"editor" | "preview" | "code">("editor");
  const [saving, setSaving] = useState(false);

  const addBlock = (type: BlockType) => {
    const newBlock: Block = { id: crypto.randomUUID(), type, content: defaultContent(type) };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedId(newBlock.id);
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const next = [...blocks];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setBlocks(next);
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateBlock = (id: string, content: Record<string, string>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const html = blocksToFullHtml(blocks);

  const save = async () => {
    if (!template?.id || !companyId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("email_templates").update({
        html_content: html,
        design_json: { blocks } as any,
      }).eq("id", template.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template salvo!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedBlock = blocks.find((b) => b.id === selectedId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Editor de Template — {template?.name}</DialogTitle>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(["editor", "preview", "code"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                    {v === "editor" ? "Editor" : v === "preview" ? "Preview" : "HTML"}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
                <Save className="h-3.5 w-3.5" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {view === "editor" && (
            <>
              {/* Block palette */}
              <div className="w-48 border-r border-border p-3 flex-shrink-0 overflow-y-auto">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Blocos</p>
                <div className="grid grid-cols-2 gap-2">
                  {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
                    <button key={type} onClick={() => addBlock(type)} className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-2.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors">
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Canvas */}
              <div className="flex-1 overflow-y-auto bg-muted/50 p-6">
                <div className="mx-auto max-w-[600px] bg-card rounded-lg border border-border min-h-[400px]">
                  {blocks.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                      Arraste blocos da barra lateral para começar
                    </div>
                  ) : (
                    blocks.map((block, idx) => (
                      <div
                        key={block.id}
                        onClick={() => setSelectedId(block.id)}
                        className={`group relative border-2 transition-colors cursor-pointer ${selectedId === block.id ? "border-primary" : "border-transparent hover:border-primary/30"}`}
                      >
                        <div className="absolute -right-1 -top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, -1); }} className="rounded bg-card border border-border p-0.5 hover:bg-muted"><ArrowUp className="h-3 w-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, 1); }} className="rounded bg-card border border-border p-0.5 hover:bg-muted"><ArrowDown className="h-3 w-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="rounded bg-destructive/10 border border-destructive/20 p-0.5 hover:bg-destructive/20"><Trash2 className="h-3 w-3 text-destructive" /></button>
                        </div>
                        <div className="p-4" dangerouslySetInnerHTML={{ __html: blockToHtml(block) }} />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Properties panel */}
              <div className="w-64 border-l border-border p-4 flex-shrink-0 overflow-y-auto">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Propriedades</p>
                {selectedBlock ? (
                  <BlockEditor block={selectedBlock} onChange={(c) => updateBlock(selectedBlock.id, c)} />
                ) : (
                  <p className="text-sm text-muted-foreground">Selecione um bloco para editar</p>
                )}
              </div>
            </>
          )}

          {view === "preview" && (
            <div className="flex-1 overflow-y-auto bg-muted/50 p-6">
              <div className="mx-auto max-w-[600px]">
                <iframe srcDoc={html} className="w-full h-[600px] rounded-lg border border-border bg-white" title="Preview" />
              </div>
            </div>
          )}

          {view === "code" && (
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all">{html}</pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
