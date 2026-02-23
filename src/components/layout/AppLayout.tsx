import { ReactNode, useEffect, useRef } from "react";
import { AppSidebar } from "./AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const queryClient = useQueryClient();
  const sendingCampaigns = useRef<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase
      .channel("campaign-completion-toast")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campaigns" },
        (payload) => {
          const newRow = payload.new as { id: string; name: string; status: string; total_recipients: number | null };
          const oldRow = payload.old as { status?: string };

          // Track campaigns that enter "sending" state
          if (newRow.status === "sending") {
            sendingCampaigns.current.add(newRow.id);
          }

          // Notify only if we were tracking this campaign as sending
          if (oldRow.status === "sending" || sendingCampaigns.current.has(newRow.id)) {
            if (newRow.status === "completed") {
              sendingCampaigns.current.delete(newRow.id);
              toast.success(`Campanha "${newRow.name}" concluída!`, {
                description: `${newRow.total_recipients || 0} emails enviados com sucesso.`,
                duration: 8000,
              });
              queryClient.invalidateQueries({ queryKey: ["campaigns"] });
              queryClient.invalidateQueries({ queryKey: ["recent-campaigns"] });
            } else if (newRow.status === "error") {
              sendingCampaigns.current.delete(newRow.id);
              toast.error(`Campanha "${newRow.name}" falhou`, {
                description: "Ocorreu um erro durante o envio. Verifique os detalhes da campanha.",
                duration: 10000,
              });
              queryClient.invalidateQueries({ queryKey: ["campaigns"] });
              queryClient.invalidateQueries({ queryKey: ["recent-campaigns"] });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
