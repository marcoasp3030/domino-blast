import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTags } from "@/components/contacts/ContactTags";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tags, Check } from "lucide-react";
import { toast } from "sonner";

export function BulkTagPicker({
  selectedIds,
  onDone,
}: {
  selectedIds: Set<string>;
  onDone?: () => void;
}) {
  const { data: allTags = [] } = useTags();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const bulkAddTag = useMutation({
    mutationFn: async (tagId: string) => {
      const contactIds = Array.from(selectedIds);
      // Get existing associations to avoid duplicates
      const { data: existing } = await supabase
        .from("contact_tags")
        .select("contact_id")
        .eq("tag_id", tagId)
        .in("contact_id", contactIds);

      const existingSet = new Set((existing || []).map((e) => e.contact_id));
      const toInsert = contactIds
        .filter((id) => !existingSet.has(id))
        .map((contact_id) => ({ contact_id, tag_id: tagId }));

      if (toInsert.length === 0) {
        toast.info("Todos os contatos já possuem esta tag");
        return;
      }

      const { error } = await supabase.from("contact_tags").insert(toInsert);
      if (error) throw error;
      return toInsert.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["contact-tags"] });
      if (count) toast.success(`Tag atribuída a ${count} contato(s)!`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkRemoveTag = useMutation({
    mutationFn: async (tagId: string) => {
      const contactIds = Array.from(selectedIds);
      const { error } = await supabase
        .from("contact_tags")
        .delete()
        .eq("tag_id", tagId)
        .in("contact_id", contactIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-tags"] });
      toast.success("Tag removida dos contatos selecionados!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (allTags.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Tags className="h-4 w-4" /> Tags
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Atribuir tag a {selectedIds.size} contato(s)
        </p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {allTags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-1">
              <button
                className="flex items-center gap-2 flex-1 text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                onClick={() => bulkAddTag.mutate(tag.id)}
                disabled={bulkAddTag.isPending}
              >
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color || "#3B82F6" }}
                />
                <span className="flex-1 truncate">{tag.name}</span>
                <Check className="h-3 w-3 text-muted-foreground" />
              </button>
              <button
                className="text-[10px] text-muted-foreground hover:text-destructive px-1.5 py-1 rounded"
                onClick={() => bulkRemoveTag.mutate(tag.id)}
                disabled={bulkRemoveTag.isPending}
                title="Remover tag dos selecionados"
              >
                remover
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
