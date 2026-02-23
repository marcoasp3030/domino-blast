import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface CampaignProgressProps {
  campaignId: string;
  totalRecipients: number;
  compact?: boolean;
}

export function CampaignProgress({ campaignId, totalRecipients, compact = false }: CampaignProgressProps) {
  const queryClient = useQueryClient();
  const [sentCount, setSentCount] = useState(0);

  const { data: initialCount = 0 } = useQuery({
    queryKey: ["sends-count", campaignId],
    queryFn: async () => {
      const { count } = await supabase
        .from("sends")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .in("status", ["sent", "delivered"]);
      return count || 0;
    },
  });

  useEffect(() => {
    setSentCount(initialCount);
  }, [initialCount]);

  // Realtime subscription for new sends
  useEffect(() => {
    const channel = supabase
      .channel(`sends-progress-${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sends",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          // Refetch count on any change
          queryClient.invalidateQueries({ queryKey: ["sends-count", campaignId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, queryClient]);

  const total = totalRecipients || 1;
  const percent = Math.min(Math.round((sentCount / total) * 100), 100);

  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-[140px]">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
        <Progress value={percent} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {sentCount}/{total}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-primary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="font-medium">Enviando...</span>
        </div>
        <span className="text-muted-foreground">
          {sentCount} de {total} ({percent}%)
        </span>
      </div>
      <Progress value={percent} className="h-2" />
    </div>
  );
}
