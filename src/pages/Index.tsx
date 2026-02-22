import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { CampaignPerformanceChart } from "@/components/dashboard/CampaignPerformanceChart";
import { RecentCampaigns } from "@/components/dashboard/RecentCampaigns";
import { EventBreakdown } from "@/components/dashboard/EventBreakdown";
import { EventLogPanel } from "@/components/dashboard/EventLogPanel";

const Index = () => {
  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Visão geral das suas campanhas de email marketing</p>
      </div>

      <StatsCards />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CampaignPerformanceChart />
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
