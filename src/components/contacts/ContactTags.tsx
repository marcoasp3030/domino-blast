import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tags, Plus, X, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

type Tag = { id: string; name: string; color: string | null; company_id: string };

const TAG_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B",
  "#10B981", "#06B6D4", "#6366F1", "#F97316", "#64748B",
];

// Hook to fetch all tags
export function useTags() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ["tags", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("tags").select("*").order("name");
      return (data || []) as Tag[];
    },
    enabled: !!companyId,
  });
}

// Hook to fetch tags for specific contacts (batch)
export function useContactTags(contactIds: string[]) {
  return useQuery({
    queryKey: ["contact-tags", contactIds.sort().join(",")],
    queryFn: async () => {
      if (!contactIds.length) return {};
      const { data } = await supabase
        .from("contact_tags")
        .select("contact_id, tag_id, tags(id, name, color)")
        .in("contact_id", contactIds);
      const map: Record<string, Tag[]> = {};
      (data || []).forEach((ct: any) => {
        if (!map[ct.contact_id]) map[ct.contact_id] = [];
        if (ct.tags) map[ct.contact_id].push(ct.tags);
      });
      return map;
    },
    enabled: contactIds.length > 0,
  });
}

// Tag picker popover for a single contact
export function ContactTagPicker({ contactId, currentTags }: { contactId: string; currentTags: Tag[] }) {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const { data: allTags = [] } = useTags();
  const [open, setOpen] = useState(false);

  const currentTagIds = new Set(currentTags.map((t) => t.id));

  const addTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase.from("contact_tags").insert({ contact_id: contactId, tag_id: tagId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contact-tags"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase.from("contact_tags").delete().eq("contact_id", contactId).eq("tag_id", tagId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contact-tags"] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-1.5 gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
          <Tags className="h-3 w-3" />
          <Plus className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {allTags.map((tag) => {
            const isActive = currentTagIds.has(tag.id);
            return (
              <button
                key={tag.id}
                className={`flex items-center gap-2 w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${isActive ? "bg-muted" : "hover:bg-muted/50"}`}
                onClick={() => isActive ? removeTag.mutate(tag.id) : addTag.mutate(tag.id)}
              >
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: tag.color || "#3B82F6" }} />
                <span className="flex-1 truncate">{tag.name}</span>
                {isActive && <X className="h-3 w-3 text-muted-foreground" />}
              </button>
            );
          })}
          {allTags.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 text-center">Nenhuma tag criada</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Inline tag badges display
export function ContactTagBadges({ tags }: { tags: Tag[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex gap-1 flex-wrap mt-1">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center text-[10px] px-1.5 py-0 rounded-full font-medium text-white leading-relaxed"
          style={{ backgroundColor: tag.color || "#3B82F6" }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}

// Tag manager dialog (create, edit, delete tags)
export function TagManagerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const { data: tags = [] } = useTags();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);

  const createTag = useMutation({
    mutationFn: async () => {
      if (!companyId || !newName.trim()) throw new Error("Nome obrigatório");
      const { error } = await supabase.from("tags").insert({ company_id: companyId, name: newName.trim(), color: newColor });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tag criada!");
      setNewName("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["contact-tags"] });
      toast.success("Tag excluída!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Gerenciar Tags
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); createTag.mutate(); }}
          className="flex items-end gap-2"
        >
          <div className="flex-1">
            <Label className="text-xs">Nova tag</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da tag..."
              className="mt-1 h-9"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="h-9 w-9 rounded-md border border-border shrink-0" style={{ backgroundColor: newColor }} />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-5 gap-1.5">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-7 w-7 rounded-full border-2 transition-all ${newColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewColor(c)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button type="submit" size="sm" className="h-9" disabled={createTag.isPending || !newName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        <div className="space-y-1.5 mt-2 max-h-60 overflow-y-auto">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/40">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: tag.color || "#3B82F6" }} />
              <span className="flex-1 text-sm truncate">{tag.name}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteTag.mutate(tag.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tag criada ainda</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
