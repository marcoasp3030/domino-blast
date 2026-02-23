import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { CampaignPerformanceChart } from "@/components/dashboard/CampaignPerformanceChart";
import { RecentCampaigns } from "@/components/dashboard/RecentCampaigns";
import { EventBreakdown } from "@/components/dashboard/EventBreakdown";
import { EventLogPanel } from "@/components/dashboard/EventLogPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Store } from "lucide-react";

const Index = () => {
  const { companyId } = useAuth();
  const [storeFilter, setStoreFilter] = useState<string>("all");

  const { data: allStores = [] } = useQuery({
    queryKey: ["stores", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name").order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">Visão geral das suas campanhas de email marketing</p>
        </div>
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Loja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as lojas</SelectItem>
            <SelectItem value="none">Sem loja</SelectItem>
            {allStores.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2"><Store className="h-3 w-3" />{s.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <StatsCards storeFilter={storeFilter} />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CampaignPerformanceChart storeFilter={storeFilter} />
        </div>
        <EventBreakdown />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RecentCampaigns />
        <EventLogPanel />
      </div>
    </AppLayout>
  );
};

export default Index;
