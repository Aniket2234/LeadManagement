import { useQuery } from "@tanstack/react-query";
import Topbar from "@/components/layout/topbar";
import MetricsCards from "@/components/dashboard/metrics-cards";
import Charts from "@/components/dashboard/charts";
import ActivityFeed from "@/components/dashboard/activity-feed";
import RemindersWidget from "@/components/dashboard/reminders-widget";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Download, Plus } from "lucide-react";
import { useState } from "react";
import AddLeadModal from "@/components/leads/add-lead-modal";

interface DashboardProps {
  onMenuClick?: () => void;
}

export default function Dashboard({ onMenuClick }: DashboardProps = {}) {
  const [addLeadModalOpen, setAddLeadModalOpen] = useState(false);
  const [statusPeriod, setStatusPeriod] = useState<string>('month');
  const [sourcePeriod, setSourcePeriod] = useState<string>('month');
  const [conversionPeriod, setConversionPeriod] = useState<string>('monthly');

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/analytics/metrics'],
    queryFn: api.getMetrics,
  });

  const { data: statusData = [] } = useQuery({
    queryKey: ['/api/analytics/leads-by-status', statusPeriod],
    queryFn: () => api.getLeadsByStatus(statusPeriod),
  });

  const { data: sourceData = [] } = useQuery({
    queryKey: ['/api/analytics/leads-by-source', sourcePeriod],
    queryFn: () => api.getLeadsBySource(sourcePeriod),
  });

  const { data: conversionData = [] } = useQuery({
    queryKey: ['/api/analytics/conversion-trend', conversionPeriod],
    queryFn: () => {
      const days = conversionPeriod === 'daily' ? 7 : conversionPeriod === 'weekly' ? 30 : 90;
      return api.getConversionTrend(days);
    },
  });

  const { data: trends } = useQuery({
    queryKey: ['/api/analytics/metrics-trends'],
    queryFn: api.getMetricsTrends,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['/api/activities'],
    queryFn: () => api.getActivities(10),
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['/api/reminders'],
    queryFn: () => api.getReminders({ date: new Date(), completed: false }),
  });

  const handleExport = () => {
    api.exportLeadsCSV();
  };

  if (metricsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle="Welcome back! Here's your lead overview."
        onMenuClick={onMenuClick}
        actions={
          <>
            <Button variant="secondary" onClick={handleExport} data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setAddLeadModalOpen(true)} data-testid="button-add-lead">
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </>
        }
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Metrics Cards */}
          {metrics && (
            <MetricsCards
              totalLeads={metrics.totalLeads}
              newToday={metrics.newToday}
              convertedThisWeek={metrics.convertedThisWeek}
              lostThisMonth={metrics.lostThisMonth}
              trends={trends}
            />
          )}

          {/* Charts */}
          <Charts
            statusData={statusData}
            sourceData={sourceData}
            conversionData={conversionData}
            activities={activities}
            onStatusPeriodChange={setStatusPeriod}
            onSourcePeriodChange={setSourcePeriod}
            onConversionPeriodChange={setConversionPeriod}
          />

          {/* Today's Reminders Widget */}
          <RemindersWidget reminders={reminders} />
        </div>
      </main>

      <AddLeadModal
        open={addLeadModalOpen}
        onOpenChange={setAddLeadModalOpen}
      />
    </>
  );
}
