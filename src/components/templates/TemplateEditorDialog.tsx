import { useState, useEffect, useMemo } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { 
  Type, Image, Columns, Minus, ArrowUp, ArrowDown, Trash2, 
  Save, MousePointerClick, Smartphone, Monitor, Copy,
  ListOrdered, Quote, Video, MapPin, Share2, Star, Clock, 
  Palette, AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp,
  LayoutGrid, Heading1, Heading2, Link, Box, Layers, Timer, GripVertical
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type BlockType = 
  | "heading" | "text" | "image" | "button" | "divider" | "columns" 
  | "spacer" | "social" | "list" | "quote" | "video" | "hero"
  | "footer" | "countdown" | "image-text" | "three-columns";

interface Block {
  id: string;
  type: BlockType;
  content: Record<string, string>;
}

interface BlockCategory {
  label: string;
  blocks: { type: BlockType; label: string; icon: typeof Type }[];
}

const BLOCK_CATEGORIES: BlockCategory[] = [
  {
    label: "Conteúdo",
    blocks: [
      { type: "heading", label: "Título", icon: Heading1 },
      { type: "text", label: "Texto", icon: Type },
      { type: "list", label: "Lista", icon: ListOrdered },
      { type: "quote", label: "Citação", icon: Quote },
    ],
  },
  {
    label: "Mídia",
    blocks: [
      { type: "image", label: "Imagem", icon: Image },
      { type: "video", label: "Vídeo", icon: Video },
      { type: "hero", label: "Hero Banner", icon: Box },
    ],
  },
  {
    label: "Ações",
    blocks: [
      { type: "button", label: "Botão", icon: MousePointerClick },
      { type: "social", label: "Redes Sociais", icon: Share2 },
      { type: "countdown", label: "Countdown", icon: Timer },
    ],
  },
  {
    label: "Layout",
    blocks: [
      { type: "divider", label: "Divisor", icon: Minus },
      { type: "spacer", label: "Espaço", icon: Layers },
      { type: "columns", label: "2 Colunas", icon: Columns },
      { type: "three-columns", label: "3 Colunas", icon: LayoutGrid },
      { type: "image-text", label: "Imagem + Texto", icon: Heading2 },
      { type: "footer", label: "Rodapé", icon: AlignCenter },
    ],
  },
];

function defaultContent(type: BlockType): Record<string, string> {
  switch (type) {
    case "heading": return { text: "Seu título aqui", align: "center", size: "28", color: "#1a1a2e", weight: "700", font: "Arial" };
    case "text": return { text: "Seu texto aqui. Escreva o conteúdo do seu email com parágrafos ricos e formatação.", align: "left", size: "16", color: "#333333", lineHeight: "1.6" };
    case "image": return { src: "https://placehold.co/600x300/0EA5E9/FFF?text=Sua+Imagem", alt: "Imagem", width: "100", borderRadius: "8", link: "" };
    case "button": return { text: "Clique Aqui", url: "https://", bgColor: "#0EA5E9", color: "#FFFFFF", align: "center", borderRadius: "8", size: "16", fullWidth: "false", padding: "14" };
    case "divider": return { color: "#e5e7eb", height: "1", style: "solid", width: "100" };
    case "columns": return { left: "Conteúdo da coluna esquerda com informações importantes.", right: "Conteúdo da coluna direita com mais detalhes." };
    case "spacer": return { height: "32" };
    case "social": return { facebook: "", instagram: "", twitter: "", linkedin: "", youtube: "", align: "center", iconSize: "32", iconStyle: "colored" };
    case "list": return { items: "Primeiro item da lista\nSegundo item da lista\nTerceiro item da lista", style: "bullet", color: "#0EA5E9", textColor: "#333333" };
    case "quote": return { text: "Uma citação inspiradora ou depoimento de cliente que agrega valor.", author: "Autor", borderColor: "#0EA5E9", bgColor: "#f8f9fa" };
    case "video": return { thumbnailUrl: "https://placehold.co/600x340/1a1a2e/FFF?text=▶+Assistir+Vídeo", videoUrl: "https://", alt: "Vídeo" };
    case "hero": return { bgColor: "#1a1a2e", bgImage: "", title: "Título Principal", subtitle: "Subtítulo descritivo do seu conteúdo", buttonText: "Saiba Mais", buttonUrl: "https://", buttonColor: "#0EA5E9", titleColor: "#FFFFFF", subtitleColor: "#cccccc", padding: "60", align: "center" };
    case "footer": return { text: "© 2026 Sua Empresa. Todos os direitos reservados.", address: "Rua Exemplo, 123 — São Paulo, SP", unsubscribeText: "Descadastrar", unsubscribeUrl: "{{unsubscribe_url}}", color: "#999999", bgColor: "#f4f4f5" };
    case "countdown": return { date: "2026-03-31T23:59:59", title: "Oferta termina em:", bgColor: "#1a1a2e", titleColor: "#FFFFFF", numberColor: "#0EA5E9" };
    case "image-text": return { imageSrc: "https://placehold.co/280x280/0EA5E9/FFF?text=Imagem", imageAlt: "Imagem", imagePosition: "left", title: "Título da Seção", text: "Descrição complementar com detalhes sobre o conteúdo ao lado da imagem.", buttonText: "", buttonUrl: "" };
    case "three-columns": return { col1: "Coluna 1", col2: "Coluna 2", col3: "Coluna 3", col1Icon: "⭐", col2Icon: "🚀", col3Icon: "💎" };
  }
}

function blockToHtml(block: Block): string {
  const c = block.content;
  switch (block.type) {
    case "heading":
      return `<h1 style="font-size:${c.size || 28}px;text-align:${c.align || "center"};margin:0;padding:16px 0;font-family:${c.font || "Arial"},sans-serif;font-weight:${c.weight || "700"};color:${c.color || "#1a1a2e"};">${c.text}</h1>`;
    case "text":
      return `<p style="font-size:${c.size || 16}px;line-height:${c.lineHeight || "1.6"};text-align:${c.align || "left"};margin:0;padding:8px 0;font-family:Arial,sans-serif;color:${c.color || "#333333"};">${(c.text || "").replace(/\n/g, "<br/>")}</p>`;
    case "image": {
      const img = `<img src="${c.src}" alt="${c.alt}" style="max-width:${c.width || 100}%;height:auto;border-radius:${c.borderRadius || 8}px;display:block;margin:0 auto;" />`;
      return `<div style="text-align:center;padding:8px 0;">${c.link ? `<a href="${c.link}" target="_blank">${img}</a>` : img}</div>`;
    }
    case "button": {
      const fw = c.fullWidth === "true";
      return `<div style="text-align:${c.align || "center"};padding:16px 0;"><a href="${c.url}" style="background:${c.bgColor || "#0EA5E9"};color:${c.color || "#FFF"};padding:${c.padding || 14}px 32px;border-radius:${c.borderRadius || 8}px;text-decoration:none;font-weight:600;font-size:${c.size || 16}px;display:${fw ? "block" : "inline-block"};font-family:Arial,sans-serif;text-align:center;">${c.text}</a></div>`;
    }
    case "divider":
      return `<div style="padding:8px 0;"><hr style="border:none;border-top:${c.height || 1}px ${c.style || "solid"} ${c.color || "#e5e7eb"};margin:0;width:${c.width || 100}%;margin-left:auto;margin-right:auto;" /></div>`;
    case "columns":
      return `<table width="100%" cellpadding="0" cellspacing="0" style="padding:8px 0;"><tr><td width="50%" style="padding:8px 12px 8px 0;font-size:15px;font-family:Arial,sans-serif;color:#333;vertical-align:top;">${(c.left || "").replace(/\n/g, "<br/>")}</td><td width="50%" style="padding:8px 0 8px 12px;font-size:15px;font-family:Arial,sans-serif;color:#333;vertical-align:top;">${(c.right || "").replace(/\n/g, "<br/>")}</td></tr></table>`;
    case "spacer":
      return `<div style="height:${c.height || 32}px;"></div>`;
    case "social": {
      const networks = [
        { key: "facebook", label: "Facebook", color: "#1877F2" },
        { key: "instagram", label: "Instagram", color: "#E4405F" },
        { key: "twitter", label: "X", color: "#000000" },
        { key: "linkedin", label: "LinkedIn", color: "#0A66C2" },
        { key: "youtube", label: "YouTube", color: "#FF0000" },
      ];
      const size = c.iconSize || "32";
      const colored = c.iconStyle !== "mono";
      const icons = networks
        .filter((n) => c[n.key])
        .map((n) => `<a href="${c[n.key]}" style="display:inline-block;margin:0 6px;text-decoration:none;" target="_blank"><div style="width:${size}px;height:${size}px;border-radius:50%;background:${colored ? n.color : "#666"};display:flex;align-items:center;justify-content:center;color:#fff;font-size:${parseInt(size)/2.5}px;font-weight:bold;font-family:Arial;">${n.label[0]}</div></a>`)
        .join("");
      return `<div style="text-align:${c.align || "center"};padding:16px 0;">${icons || '<span style="color:#999;font-size:13px;">Configure suas redes sociais</span>'}</div>`;
    }
    case "list": {
      const items = (c.items || "").split("\n").filter(Boolean);
      const isBullet = c.style !== "numbered";
      const listHtml = items.map((item, i) => {
        const marker = isBullet 
          ? `<span style="color:${c.color || "#0EA5E9"};font-size:18px;margin-right:8px;">•</span>` 
          : `<span style="color:${c.color || "#0EA5E9"};font-weight:700;margin-right:8px;">${i + 1}.</span>`;
        return `<div style="display:flex;align-items:baseline;padding:4px 0;font-size:15px;font-family:Arial,sans-serif;color:${c.textColor || "#333"};">${marker}<span>${item}</span></div>`;
      }).join("");
      return `<div style="padding:8px 0;">${listHtml}</div>`;
    }
    case "quote":
      return `<div style="padding:16px 0;"><div style="border-left:4px solid ${c.borderColor || "#0EA5E9"};padding:20px 24px;background:${c.bgColor || "#f8f9fa"};border-radius:0 8px 8px 0;"><p style="font-size:16px;font-style:italic;line-height:1.6;margin:0 0 8px;font-family:Georgia,serif;color:#333;">"${c.text}"</p>${c.author ? `<p style="font-size:13px;margin:0;color:#666;font-family:Arial,sans-serif;">— ${c.author}</p>` : ""}</div></div>`;
    case "video":
      return `<div style="text-align:center;padding:8px 0;"><a href="${c.videoUrl}" target="_blank" style="display:inline-block;position:relative;"><img src="${c.thumbnailUrl}" alt="${c.alt}" style="max-width:100%;height:auto;border-radius:8px;" /><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:64px;height:64px;background:rgba(0,0,0,0.7);border-radius:50%;display:flex;align-items:center;justify-content:center;"><div style="width:0;height:0;border-left:22px solid #fff;border-top:13px solid transparent;border-bottom:13px solid transparent;margin-left:4px;"></div></div></a></div>`;
    case "hero":
      return `<div style="background:${c.bgImage ? `url(${c.bgImage}) center/cover no-repeat` : c.bgColor || "#1a1a2e"};padding:${c.padding || 60}px 32px;text-align:${c.align || "center"};border-radius:8px;"><h1 style="font-size:32px;font-weight:800;color:${c.titleColor || "#FFF"};margin:0 0 12px;font-family:Arial,sans-serif;">${c.title}</h1><p style="font-size:17px;color:${c.subtitleColor || "#ccc"};margin:0 0 24px;font-family:Arial,sans-serif;line-height:1.5;">${c.subtitle}</p>${c.buttonText ? `<a href="${c.buttonUrl}" style="background:${c.buttonColor || "#0EA5E9"};color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;font-family:Arial,sans-serif;">${c.buttonText}</a>` : ""}</div>`;
    case "footer":
      return `<div style="background:${c.bgColor || "#f4f4f5"};padding:24px 32px;text-align:center;border-radius:8px;"><p style="font-size:13px;color:${c.color || "#999"};margin:0 0 8px;font-family:Arial,sans-serif;">${c.text}</p>${c.address ? `<p style="font-size:12px;color:${c.color || "#999"};margin:0 0 8px;font-family:Arial,sans-serif;">${c.address}</p>` : ""}${c.unsubscribeText ? `<a href="${c.unsubscribeUrl || "#"}" style="font-size:12px;color:${c.color || "#999"};font-family:Arial,sans-serif;">${c.unsubscribeText}</a>` : ""}</div>`;
    case "countdown":
      return `<div style="background:${c.bgColor || "#1a1a2e"};padding:32px;text-align:center;border-radius:8px;"><p style="font-size:16px;color:${c.titleColor || "#FFF"};margin:0 0 16px;font-family:Arial,sans-serif;font-weight:600;">${c.title}</p><table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>${["Dias", "Horas", "Min", "Seg"].map((label) => `<td style="padding:0 10px;text-align:center;"><div style="font-size:36px;font-weight:800;color:${c.numberColor || "#0EA5E9"};font-family:Arial,sans-serif;">00</div><div style="font-size:11px;color:${c.titleColor || "#FFF"};font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;">${label}</div></td>`).join("")}</tr></table></div>`;
    case "image-text": {
      const isLeft = c.imagePosition !== "right";
      const imgCell = `<td width="45%" style="padding:${isLeft ? "0 16px 0 0" : "0 0 0 16px"};vertical-align:top;"><img src="${c.imageSrc}" alt="${c.imageAlt}" style="width:100%;height:auto;border-radius:8px;" /></td>`;
      const textCell = `<td width="55%" style="vertical-align:top;padding:8px 0;font-family:Arial,sans-serif;"><h3 style="font-size:20px;font-weight:700;margin:0 0 8px;color:#1a1a2e;">${c.title}</h3><p style="font-size:15px;line-height:1.6;color:#333;margin:0 0 12px;">${c.text}</p>${c.buttonText ? `<a href="${c.buttonUrl || "#"}" style="background:#0EA5E9;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">${c.buttonText}</a>` : ""}</td>`;
      return `<table width="100%" cellpadding="0" cellspacing="0" style="padding:16px 0;"><tr>${isLeft ? imgCell + textCell : textCell + imgCell}</tr></table>`;
    }
    case "three-columns":
      return `<table width="100%" cellpadding="0" cellspacing="0" style="padding:16px 0;"><tr>${[["col1", "col1Icon"], ["col2", "col2Icon"], ["col3", "col3Icon"]].map(([col, icon]) => `<td width="33.33%" style="text-align:center;vertical-align:top;padding:8px 12px;"><div style="font-size:32px;margin-bottom:8px;">${c[icon] || "⭐"}</div><p style="font-size:15px;font-family:Arial,sans-serif;color:#333;margin:0;line-height:1.5;">${c[col]}</p></td>`).join("")}</tr></table>`;
  }
}

function blocksToFullHtml(blocks: Block[], bodyBg: string, contentBg: string, contentWidth: string): string {
  const inner = blocks.map(blockToHtml).join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:${bodyBg};"><div style="max-width:${contentWidth}px;margin:0 auto;background:${contentBg};padding:32px;border-radius:8px;">${inner}</div></body></html>`;
}

// ── Align Selector ──
function AlignSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      {[
        { val: "left", icon: AlignLeft },
        { val: "center", icon: AlignCenter },
        { val: "right", icon: AlignRight },
      ].map(({ val, icon: Icon }) => (
        <button key={val} onClick={() => onChange(val)} className={`p-1.5 transition-colors ${value === val ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

// ── Color Input ──
function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-7 cursor-pointer rounded border border-border p-0.5" />
      <Label className="text-xs text-muted-foreground">{label}</Label>
    </div>
  );
}

// ── Block Editor ──
function BlockEditor({ block, onChange }: { block: Block; onChange: (c: Record<string, string>) => void }) {
  const c = block.content;
  const update = (key: string, val: string) => onChange({ ...c, [key]: val });
  const SectionTitle = ({ children }: { children: string }) => <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-3 mb-1.5 first:mt-0">{children}</p>;

  switch (block.type) {
    case "heading":
      return (
        <div className="space-y-3">
          <div><SectionTitle>Conteúdo</SectionTitle><Input value={c.text} onChange={(e) => update("text", e.target.value)} placeholder="Título" /></div>
          <div><SectionTitle>Estilo</SectionTitle>
            <div className="flex gap-2 items-center mb-2">
              <div className="flex-1"><Label className="text-xs">Tamanho</Label><Input type="number" value={c.size} onChange={(e) => update("size", e.target.value)} className="mt-1" min="14" max="64" /></div>
              <div className="flex-1"><Label className="text-xs">Peso</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm mt-1" value={c.weight} onChange={(e) => update("weight", e.target.value)}>
                  <option value="400">Normal</option><option value="600">Semi-bold</option><option value="700">Bold</option><option value="800">Extra-bold</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <ColorInput label="Cor" value={c.color} onChange={(v) => update("color", v)} />
              <AlignSelect value={c.align} onChange={(v) => update("align", v)} />
            </div>
          </div>
        </div>
      );
    case "text":
      return (
        <div className="space-y-3">
          <div><SectionTitle>Conteúdo</SectionTitle><Textarea value={c.text} onChange={(e) => update("text", e.target.value)} rows={4} placeholder="Seu texto..." /></div>
          <div><SectionTitle>Estilo</SectionTitle>
            <div className="flex gap-2 mb-2">
              <div className="flex-1"><Label className="text-xs">Tamanho</Label><Input type="number" value={c.size} onChange={(e) => update("size", e.target.value)} className="mt-1" min="12" max="24" /></div>
              <div className="flex-1"><Label className="text-xs">Altura linha</Label><Input value={c.lineHeight} onChange={(e) => update("lineHeight", e.target.value)} className="mt-1" /></div>
            </div>
            <div className="flex items-center justify-between">
              <ColorInput label="Cor" value={c.color} onChange={(v) => update("color", v)} />
              <AlignSelect value={c.align} onChange={(v) => update("align", v)} />
            </div>
          </div>
        </div>
      );
    case "image":
      return (
        <div className="space-y-3">
          <SectionTitle>Imagem</SectionTitle>
          <Input value={c.src} onChange={(e) => update("src", e.target.value)} placeholder="URL da imagem" />
          <Input value={c.alt} onChange={(e) => update("alt", e.target.value)} placeholder="Texto alternativo" />
          <Input value={c.link} onChange={(e) => update("link", e.target.value)} placeholder="Link ao clicar (opcional)" />
          <div className="flex gap-2">
            <div className="flex-1"><Label className="text-xs">Largura (%)</Label><Input type="number" value={c.width} onChange={(e) => update("width", e.target.value)} className="mt-1" min="10" max="100" /></div>
            <div className="flex-1"><Label className="text-xs">Borda (px)</Label><Input type="number" value={c.borderRadius} onChange={(e) => update("borderRadius", e.target.value)} className="mt-1" min="0" max="50" /></div>
          </div>
        </div>
      );
    case "button":
      return (
        <div className="space-y-3">
          <SectionTitle>Conteúdo</SectionTitle>
          <Input value={c.text} onChange={(e) => update("text", e.target.value)} placeholder="Texto do botão" />
          <Input value={c.url} onChange={(e) => update("url", e.target.value)} placeholder="URL de destino" />
          <SectionTitle>Estilo</SectionTitle>
          <div className="flex gap-2 flex-wrap">
            <ColorInput label="Fundo" value={c.bgColor} onChange={(v) => update("bgColor", v)} />
            <ColorInput label="Texto" value={c.color} onChange={(v) => update("color", v)} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1"><Label className="text-xs">Tamanho</Label><Input type="number" value={c.size} onChange={(e) => update("size", e.target.value)} className="mt-1" min="12" max="24" /></div>
            <div className="flex-1"><Label className="text-xs">Borda</Label><Input type="number" value={c.borderRadius} onChange={(e) => update("borderRadius", e.target.value)} className="mt-1" min="0" max="50" /></div>
            <div className="flex-1"><Label className="text-xs">Padding</Label><Input type="number" value={c.padding} onChange={(e) => update("padding", e.target.value)} className="mt-1" min="6" max="24" /></div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={c.fullWidth === "true"} onChange={(e) => update("fullWidth", e.target.checked ? "true" : "false")} className="rounded" />
              Largura total
            </label>
            <AlignSelect value={c.align} onChange={(v) => update("align", v)} />
          </div>
        </div>
      );
    case "divider":
      return (
        <div className="space-y-3">
          <SectionTitle>Estilo</SectionTitle>
          <div className="flex gap-2 items-end">
            <ColorInput label="Cor" value={c.color} onChange={(v) => update("color", v)} />
            <div className="flex-1"><Label className="text-xs">Altura</Label><Input type="number" value={c.height} onChange={(e) => update("height", e.target.value)} className="mt-1" min="1" max="10" /></div>
          </div>
          <div><Label className="text-xs">Estilo</Label>
            <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm mt-1" value={c.style} onChange={(e) => update("style", e.target.value)}>
              <option value="solid">Sólido</option><option value="dashed">Tracejado</option><option value="dotted">Pontilhado</option>
            </select>
          </div>
          <div><Label className="text-xs">Largura (%)</Label><Input type="number" value={c.width} onChange={(e) => update("width", e.target.value)} className="mt-1" min="10" max="100" /></div>
        </div>
      );
    case "spacer":
      return (
        <div className="space-y-2">
          <SectionTitle>Espaçamento</SectionTitle>
          <Label className="text-xs">{c.height}px</Label>
          <Slider value={[parseInt(c.height || "32")]} onValueChange={([v]) => update("height", String(v))} min={8} max={120} step={4} />
        </div>
      );
    case "columns":
      return (
        <div className="space-y-3">
          <div><SectionTitle>Coluna esquerda</SectionTitle><Textarea value={c.left} onChange={(e) => update("left", e.target.value)} rows={3} /></div>
          <div><SectionTitle>Coluna direita</SectionTitle><Textarea value={c.right} onChange={(e) => update("right", e.target.value)} rows={3} /></div>
        </div>
      );
    case "three-columns":
      return (
        <div className="space-y-3">
          {[["col1", "col1Icon", "Coluna 1"], ["col2", "col2Icon", "Coluna 2"], ["col3", "col3Icon", "Coluna 3"]].map(([col, icon, label]) => (
            <div key={col}>
              <SectionTitle>{label}</SectionTitle>
              <div className="flex gap-2">
                <Input value={c[icon]} onChange={(e) => update(icon, e.target.value)} placeholder="Emoji" className="w-16" />
                <Input value={c[col]} onChange={(e) => update(col, e.target.value)} placeholder="Texto" className="flex-1" />
              </div>
            </div>
          ))}
        </div>
      );
    case "social":
      return (
        <div className="space-y-3">
          <SectionTitle>Links das redes</SectionTitle>
          {[["facebook", "Facebook"], ["instagram", "Instagram"], ["twitter", "X / Twitter"], ["linkedin", "LinkedIn"], ["youtube", "YouTube"]].map(([key, label]) => (
            <Input key={key} value={c[key]} onChange={(e) => update(key, e.target.value)} placeholder={`URL ${label}`} />
          ))}
          <SectionTitle>Estilo</SectionTitle>
          <div className="flex items-center justify-between">
            <div className="flex-1"><Label className="text-xs">Tamanho</Label><Input type="number" value={c.iconSize} onChange={(e) => update("iconSize", e.target.value)} className="mt-1" min="20" max="48" /></div>
            <AlignSelect value={c.align} onChange={(v) => update("align", v)} />
          </div>
          <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={c.iconStyle} onChange={(e) => update("iconStyle", e.target.value)}>
            <option value="colored">Colorido</option><option value="mono">Monocromático</option>
          </select>
        </div>
      );
    case "list":
      return (
        <div className="space-y-3">
          <SectionTitle>Itens (um por linha)</SectionTitle>
          <Textarea value={c.items} onChange={(e) => update("items", e.target.value)} rows={4} placeholder="Item 1&#10;Item 2&#10;Item 3" />
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Label className="text-xs">Estilo</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm mt-1" value={c.style} onChange={(e) => update("style", e.target.value)}>
                <option value="bullet">Marcadores</option><option value="numbered">Numerada</option>
              </select>
            </div>
            <ColorInput label="Marcador" value={c.color} onChange={(v) => update("color", v)} />
            <ColorInput label="Texto" value={c.textColor} onChange={(v) => update("textColor", v)} />
          </div>
        </div>
      );
    case "quote":
      return (
        <div className="space-y-3">
          <SectionTitle>Citação</SectionTitle>
          <Textarea value={c.text} onChange={(e) => update("text", e.target.value)} rows={3} />
          <Input value={c.author} onChange={(e) => update("author", e.target.value)} placeholder="Autor" />
          <SectionTitle>Estilo</SectionTitle>
          <div className="flex gap-2">
            <ColorInput label="Borda" value={c.borderColor} onChange={(v) => update("borderColor", v)} />
            <ColorInput label="Fundo" value={c.bgColor} onChange={(v) => update("bgColor", v)} />
          </div>
        </div>
      );
    case "video":
      return (
        <div className="space-y-3">
          <SectionTitle>Vídeo</SectionTitle>
          <Input value={c.thumbnailUrl} onChange={(e) => update("thumbnailUrl", e.target.value)} placeholder="URL da thumbnail" />
          <Input value={c.videoUrl} onChange={(e) => update("videoUrl", e.target.value)} placeholder="URL do vídeo" />
          <Input value={c.alt} onChange={(e) => update("alt", e.target.value)} placeholder="Texto alternativo" />
        </div>
      );
    case "hero":
      return (
        <div className="space-y-3">
          <SectionTitle>Conteúdo</SectionTitle>
          <Input value={c.title} onChange={(e) => update("title", e.target.value)} placeholder="Título" />
          <Textarea value={c.subtitle} onChange={(e) => update("subtitle", e.target.value)} rows={2} placeholder="Subtítulo" />
          <Input value={c.buttonText} onChange={(e) => update("buttonText", e.target.value)} placeholder="Texto do botão" />
          <Input value={c.buttonUrl} onChange={(e) => update("buttonUrl", e.target.value)} placeholder="URL do botão" />
          <SectionTitle>Estilo</SectionTitle>
          <Input value={c.bgImage} onChange={(e) => update("bgImage", e.target.value)} placeholder="URL imagem de fundo (opcional)" />
          <div className="flex gap-2 flex-wrap">
            <ColorInput label="Fundo" value={c.bgColor} onChange={(v) => update("bgColor", v)} />
            <ColorInput label="Título" value={c.titleColor} onChange={(v) => update("titleColor", v)} />
            <ColorInput label="Subtítulo" value={c.subtitleColor} onChange={(v) => update("subtitleColor", v)} />
            <ColorInput label="Botão" value={c.buttonColor} onChange={(v) => update("buttonColor", v)} />
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Label className="text-xs">Padding</Label><Input type="number" value={c.padding} onChange={(e) => update("padding", e.target.value)} className="mt-1" min="20" max="120" /></div>
            <AlignSelect value={c.align} onChange={(v) => update("align", v)} />
          </div>
        </div>
      );
    case "footer":
      return (
        <div className="space-y-3">
          <SectionTitle>Conteúdo</SectionTitle>
          <Input value={c.text} onChange={(e) => update("text", e.target.value)} placeholder="Copyright" />
          <Input value={c.address} onChange={(e) => update("address", e.target.value)} placeholder="Endereço" />
          <Input value={c.unsubscribeText} onChange={(e) => update("unsubscribeText", e.target.value)} placeholder="Texto descadastrar" />
          <Input value={c.unsubscribeUrl} onChange={(e) => update("unsubscribeUrl", e.target.value)} placeholder="URL descadastrar" />
          <SectionTitle>Estilo</SectionTitle>
          <div className="flex gap-2">
            <ColorInput label="Texto" value={c.color} onChange={(v) => update("color", v)} />
            <ColorInput label="Fundo" value={c.bgColor} onChange={(v) => update("bgColor", v)} />
          </div>
        </div>
      );
    case "countdown":
      return (
        <div className="space-y-3">
          <SectionTitle>Configuração</SectionTitle>
          <Input value={c.title} onChange={(e) => update("title", e.target.value)} placeholder="Título" />
          <Input type="datetime-local" value={c.date} onChange={(e) => update("date", e.target.value)} />
          <SectionTitle>Estilo</SectionTitle>
          <div className="flex gap-2 flex-wrap">
            <ColorInput label="Fundo" value={c.bgColor} onChange={(v) => update("bgColor", v)} />
            <ColorInput label="Título" value={c.titleColor} onChange={(v) => update("titleColor", v)} />
            <ColorInput label="Números" value={c.numberColor} onChange={(v) => update("numberColor", v)} />
          </div>
        </div>
      );
    case "image-text":
      return (
        <div className="space-y-3">
          <SectionTitle>Imagem</SectionTitle>
          <Input value={c.imageSrc} onChange={(e) => update("imageSrc", e.target.value)} placeholder="URL da imagem" />
          <div><Label className="text-xs">Posição</Label>
            <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm mt-1" value={c.imagePosition} onChange={(e) => update("imagePosition", e.target.value)}>
              <option value="left">Esquerda</option><option value="right">Direita</option>
            </select>
          </div>
          <SectionTitle>Texto</SectionTitle>
          <Input value={c.title} onChange={(e) => update("title", e.target.value)} placeholder="Título" />
          <Textarea value={c.text} onChange={(e) => update("text", e.target.value)} rows={3} placeholder="Descrição" />
          <Input value={c.buttonText} onChange={(e) => update("buttonText", e.target.value)} placeholder="Texto botão (opcional)" />
          {c.buttonText && <Input value={c.buttonUrl} onChange={(e) => update("buttonUrl", e.target.value)} placeholder="URL do botão" />}
        </div>
      );
  }

  return <p className="text-xs text-muted-foreground">Bloco sem editor</p>;
}

// ── Sortable Block Item ──
function SortableBlockItem({ 
  block, idx, selectedId, setSelectedId, blockLabel, moveBlock, duplicateBlock, removeBlock 
}: {
  block: Block; idx: number; selectedId: string | null;
  setSelectedId: (id: string) => void;
  blockLabel: (type: BlockType) => string;
  moveBlock: (idx: number, dir: -1 | 1) => void;
  duplicateBlock: (block: Block) => void;
  removeBlock: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => setSelectedId(block.id)}
      className={`group relative border-2 transition-colors cursor-pointer ${selectedId === block.id ? "border-primary" : "border-transparent hover:border-primary/30"}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-grab active:cursor-grabbing p-1 rounded-l-md bg-muted border border-r-0 border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {/* Block label */}
      <div className="absolute left-0 -top-0.5 translate-y-[-100%] bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-medium rounded-t opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {blockLabel(block.type)}
      </div>
      {/* Actions */}
      <div className="absolute -right-1 -top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, -1); }} className="rounded bg-card border border-border p-0.5 hover:bg-muted" title="Mover para cima"><ArrowUp className="h-3 w-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, 1); }} className="rounded bg-card border border-border p-0.5 hover:bg-muted" title="Mover para baixo"><ArrowDown className="h-3 w-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); duplicateBlock(block); }} className="rounded bg-card border border-border p-0.5 hover:bg-muted" title="Duplicar"><Copy className="h-3 w-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="rounded bg-destructive/10 border border-destructive/20 p-0.5 hover:bg-destructive/20" title="Remover"><Trash2 className="h-3 w-3 text-destructive" /></button>
      </div>
      <div className="p-4" dangerouslySetInnerHTML={{ __html: blockToHtml(block) }} />
    </div>
  );
}

// ── DnD Canvas ──
function DndCanvas({
  blocks, setBlocks, selectedId, setSelectedId, emailSettings, blockLabel, moveBlock, duplicateBlock, removeBlock,
}: {
  blocks: Block[]; setBlocks: (b: Block[]) => void;
  selectedId: string | null; setSelectedId: (id: string) => void;
  emailSettings: { bodyBg: string; contentBg: string; contentWidth: string };
  blockLabel: (type: BlockType) => string;
  moveBlock: (idx: number, dir: -1 | 1) => void;
  duplicateBlock: (block: Block) => void;
  removeBlock: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const blockIds = useMemo(() => blocks.map(b => b.id), [blocks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);
      setBlocks(arrayMove(blocks, oldIndex, newIndex));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-muted/50 p-6">
      <div className="mx-auto bg-card rounded-lg border border-border min-h-[400px]" style={{ maxWidth: `${emailSettings.contentWidth}px` }}>
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-sm gap-2">
            <Layers className="h-8 w-8 opacity-30" />
            <p>Clique nos blocos à esquerda para adicionar</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
              {blocks.map((block, idx) => (
                <SortableBlockItem
                  key={block.id}
                  block={block}
                  idx={idx}
                  selectedId={selectedId}
                  setSelectedId={setSelectedId}
                  blockLabel={blockLabel}
                  moveBlock={moveBlock}
                  duplicateBlock={duplicateBlock}
                  removeBlock={removeBlock}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: { id: string; name: string; html_content: string | null; design_json: any } | null;
}

export function TemplateEditorDialog({ open, onOpenChange, template }: Props) {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"editor" | "preview" | "code">("editor");
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [emailSettings, setEmailSettings] = useState({ bodyBg: "#f4f4f5", contentBg: "#ffffff", contentWidth: "600" });

  // Reset blocks when template changes
  useEffect(() => {
    if (template?.design_json && Array.isArray((template.design_json as any)?.blocks)) {
      setBlocks((template.design_json as any).blocks);
      if ((template.design_json as any)?.settings) {
        setEmailSettings((template.design_json as any).settings);
      }
    } else {
      setBlocks([]);
    }
    setSelectedId(null);
    setView("editor");
  }, [template?.id]);

  const addBlock = (type: BlockType) => {
    const newBlock: Block = { id: crypto.randomUUID(), type, content: defaultContent(type) };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedId(newBlock.id);
  };

  const duplicateBlock = (block: Block) => {
    const dup: Block = { id: crypto.randomUUID(), type: block.type, content: { ...block.content } };
    const idx = blocks.findIndex((b) => b.id === block.id);
    const next = [...blocks];
    next.splice(idx + 1, 0, dup);
    setBlocks(next);
    setSelectedId(dup.id);
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

  const html = blocksToFullHtml(blocks, emailSettings.bodyBg, emailSettings.contentBg, emailSettings.contentWidth);

  const save = async () => {
    if (!template?.id || !companyId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("email_templates").update({
        html_content: html,
        design_json: { blocks, settings: emailSettings } as any,
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

  const toggleCategory = (label: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const selectedBlock = blocks.find((b) => b.id === selectedId);
  const blockLabel = (type: BlockType) => BLOCK_CATEGORIES.flatMap((c) => c.blocks).find((b) => b.type === type)?.label || type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">Editor — {template?.name}</DialogTitle>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(["editor", "preview", "code"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                    {v === "editor" ? "Editor" : v === "preview" ? "Preview" : "HTML"}
                  </button>
                ))}
              </div>
              {view === "preview" && (
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button onClick={() => setPreviewMode("desktop")} className={`p-1.5 transition-colors ${previewMode === "desktop" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><Monitor className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setPreviewMode("mobile")} className={`p-1.5 transition-colors ${previewMode === "mobile" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><Smartphone className="h-3.5 w-3.5" /></button>
                </div>
              )}
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
              <div className="w-52 border-r border-border flex-shrink-0 overflow-y-auto">
                {BLOCK_CATEGORIES.map((cat) => {
                  const collapsed = collapsedCategories.has(cat.label);
                  return (
                    <div key={cat.label}>
                      <button onClick={() => toggleCategory(cat.label)} className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50">
                        {cat.label}
                        {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                      </button>
                      {!collapsed && (
                        <div className="grid grid-cols-2 gap-1.5 px-2 pb-2">
                          {cat.blocks.map(({ type, label, icon: Icon }) => (
                            <button key={type} onClick={() => addBlock(type)} className="flex flex-col items-center gap-1 rounded-lg border border-border p-2 text-[11px] hover:bg-accent hover:text-accent-foreground transition-colors">
                              <Icon className="h-4 w-4" />
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Email settings */}
                <div className="border-t border-border p-3 mt-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Palette className="h-3 w-3" /> Email</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="color" value={emailSettings.bodyBg} onChange={(e) => setEmailSettings({ ...emailSettings, bodyBg: e.target.value })} className="h-6 w-6 cursor-pointer rounded border border-border p-0.5" />
                      <Label className="text-[11px]">Fundo</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="color" value={emailSettings.contentBg} onChange={(e) => setEmailSettings({ ...emailSettings, contentBg: e.target.value })} className="h-6 w-6 cursor-pointer rounded border border-border p-0.5" />
                      <Label className="text-[11px]">Conteúdo</Label>
                    </div>
                    <div><Label className="text-[11px]">Largura (px)</Label><Input type="number" value={emailSettings.contentWidth} onChange={(e) => setEmailSettings({ ...emailSettings, contentWidth: e.target.value })} className="mt-1 h-7 text-xs" min="400" max="800" /></div>
                  </div>
                </div>
              </div>

              {/* Canvas */}
              <DndCanvas
                blocks={blocks}
                setBlocks={setBlocks}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                emailSettings={emailSettings}
                blockLabel={blockLabel}
                moveBlock={moveBlock}
                duplicateBlock={duplicateBlock}
                removeBlock={removeBlock}
              />

              {/* Properties panel */}
              <div className="w-72 border-l border-border flex-shrink-0 overflow-y-auto">
                <div className="p-4">
                  {selectedBlock ? (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">{blockLabel(selectedBlock.type)}</p>
                        <button onClick={() => setSelectedId(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                      </div>
                      <BlockEditor block={selectedBlock} onChange={(c) => updateBlock(selectedBlock.id, c)} />
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Palette className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">Selecione um bloco para editar suas propriedades</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {view === "preview" && (
            <div className="flex-1 overflow-y-auto bg-muted/50 p-6">
              <div className="mx-auto transition-all duration-300" style={{ maxWidth: previewMode === "mobile" ? "375px" : "100%" }}>
                <iframe srcDoc={html} className="w-full rounded-lg border border-border bg-white" style={{ height: previewMode === "mobile" ? "700px" : "600px" }} title="Preview" />
              </div>
            </div>
          )}

          {view === "code" && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { navigator.clipboard.writeText(html); toast.success("HTML copiado!"); }}>
                  <Copy className="h-3.5 w-3.5" /> Copiar HTML
                </Button>
              </div>
              <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed">{html}</pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
