import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Topbar from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Download, TrendingUp, TrendingDown, Target, Users } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend } from "recharts";

interface ReportsProps {
  onMenuClick?: () => void;
}

export default function Reports({ onMenuClick }: ReportsProps = {}) {
  const [timeRange, setTimeRange] = useState("30");

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/analytics/metrics'],
    queryFn: api.getMetrics,
  });

  const { data: statusData = [] } = useQuery({
    queryKey: ['/api/analytics/leads-by-status'],
    queryFn: () => api.getLeadsByStatus(),
  });

  const { data: sourceData = [] } = useQuery({
    queryKey: ['/api/analytics/leads-by-source'],
    queryFn: () => api.getLeadsBySource(),
  });

  const { data: monthlyMetrics } = useQuery({
    queryKey: ['/api/analytics/monthly-metrics'],
    queryFn: api.getMonthlyMetrics,
  });

  const { data: conversionData = [] } = useQuery({
    queryKey: ['/api/analytics/conversion-trend', timeRange],
    queryFn: () => api.getConversionTrend(parseInt(timeRange)),
  });

  const { data: leadsResponse } = useQuery({
    queryKey: ['/api/leads', { limit: 1000 }],
    queryFn: () => api.getLeads({ limit: 1000 }),
  });

  const handleExport = async () => {
    try {
      await api.exportLeadsCSV();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleExportAnalytics = async () => {
    try {
      // Create analytics data
      const analyticsData = {
        metrics,
        statusData,
        sourceData,
        conversionData,
        timeRange,
        generatedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Analytics export failed:', error);
    }
  };

  const handleExportMonthlySummary = async () => {
    try {
      // Calculate proper monthly conversion rate
      const monthlyConversionRate = monthlyMetrics && monthlyMetrics.totalLeadsThisMonth > 0 
        ? ((monthlyMetrics.convertedThisMonth / monthlyMetrics.totalLeadsThisMonth) * 100).toFixed(1)
        : '0';
      
      // Calculate proper monthly lost rate
      const monthlyLostRate = monthlyMetrics && monthlyMetrics.totalLeadsThisMonth > 0 
        ? ((monthlyMetrics.lostThisMonth / monthlyMetrics.totalLeadsThisMonth) * 100).toFixed(1)
        : '0';
      
      const summaryData = {
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        totalLeads: monthlyMetrics?.totalLeadsThisMonth || 0,
        newLeads: monthlyMetrics?.newLeadsThisMonth || 0,
        convertedLeads: monthlyMetrics?.convertedThisMonth || 0,
        lostLeads: monthlyMetrics?.lostThisMonth || 0,
        conversionRate: monthlyConversionRate,
        lostRate: monthlyLostRate,
        bestSource: getBestSource(),
        statusBreakdown: statusData,
        sourceBreakdown: sourceData,
        generatedAt: new Date().toISOString()
      };
      
      const csvContent = [
        'Metric,Value',
        `Month,${summaryData.month}`,
        `Total Leads,${summaryData.totalLeads}`,
        `New Leads This Month,${summaryData.newLeads}`,
        `Converted This Month,${summaryData.convertedLeads}`,
        `Lost This Month,${summaryData.lostLeads}`,
        `Monthly Conversion Rate,${summaryData.conversionRate}%`,
        `Monthly Lost Rate,${summaryData.lostRate}%`,
        `Best Source,${summaryData.bestSource}`,
        '',
        'Status Breakdown',
        'Status,Count',
        ...statusData.map((item: any) => `${item.status},${item.count}`),
        '',
        'Source Breakdown',
        'Source,Count',
        ...sourceData.map((item: any) => `${item.source},${item.count}`)
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monthly-summary-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Monthly summary export failed:', error);
    }
  };

  const calculateConversionRate = () => {
    if (!metrics) return 0;
    return metrics.totalLeads > 0 ? ((metrics.convertedThisWeek / metrics.totalLeads) * 100).toFixed(1) : 0;
  };

  const calculateGrowthRate = () => {
    if (!metrics) return 0;
    // Calculate growth rate based on new leads this month vs last month
    const currentMonthLeads = metrics.newToday; // This represents new leads today
    const growthRate = currentMonthLeads > 0 ? ((currentMonthLeads / Math.max(metrics.totalLeads - currentMonthLeads, 1)) * 100) : 0;
    return growthRate.toFixed(1);
  };

  const calculateAvgDaysToConvert = () => {
    if (!leadsResponse?.leads) return '0';
    
    const convertedLeads = leadsResponse.leads.filter((lead: any) => lead.status === 'Converted');
    if (convertedLeads.length === 0) return '0';
    
    const totalDays = convertedLeads.reduce((sum: number, lead: any) => {
      const created = new Date(lead.createdAt);
      const updated = new Date(lead.updatedAt);
      const daysDiff = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return sum + daysDiff;
    }, 0);
    
    return (totalDays / convertedLeads.length).toFixed(1);
  };

  const getBestSource = () => {
    if (sourceData.length === 0) return "Website";
    return sourceData.reduce((prev: any, current: any) => (prev.count > current.count) ? prev : current).source;
  };

  const getLostRate = () => {
    if (!metrics) return 0;
    return metrics.totalLeads > 0 ? ((metrics.lostThisMonth / metrics.totalLeads) * 100).toFixed(1) : 0;
  };

  // Prepare data for source performance radar chart
  const sourcePerformanceData = sourceData.map((source: any) => {
    const maxCount = sourceData.length > 0 ? Math.max(...sourceData.map((s: any) => s.count)) : 1;
    const sourceLeads = leadsResponse?.leads?.filter((lead: any) => lead.source === source.source) || [];
    const convertedLeads = sourceLeads.filter((lead: any) => lead.status === 'Converted').length;
    const qualifiedLeads = sourceLeads.filter((lead: any) => lead.status === 'Qualified' || lead.status === 'Converted').length;
    
    // Calculate real performance metrics
    const volume = Math.min(100, (source.count / maxCount) * 100);
    const conversion = sourceLeads.length > 0 ? (convertedLeads / sourceLeads.length) * 100 : 0;
    const quality = sourceLeads.length > 0 ? (qualifiedLeads / sourceLeads.length) * 100 : 0;
    // Cost effectiveness (inverse of lead count - fewer leads might mean higher cost per lead)
    const cost = Math.max(0, 100 - volume);
    // Speed (based on how quickly leads progress - simplified calculation)
    const speed = quality; // Using quality as a proxy for speed
    
    return {
      source: source.source,
      volume: Math.round(volume),
      conversion: Math.round(conversion),
      quality: Math.round(quality),
      cost: Math.round(cost),
      speed: Math.round(speed),
    };
  });

  const COLORS = ['#e5e7eb', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'];

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
        title="Reports & Analytics"
        subtitle="Comprehensive insights and analytics for your lead management."
        onMenuClick={onMenuClick}
        actions={
          <>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40" data-testid="select-time-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 3 Months</SelectItem>
                <SelectItem value="365">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} data-testid="button-export-report">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </>
        }
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border border-border">
              <CardHeader className="flex flex-row items-center justify-between p-0 mb-4">
                <CardTitle className="font-semibold text-foreground">Lead Generation</CardTitle>
                <TrendingUp className="text-blue-600" size={24} />
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Leads</span>
                    <span className="font-medium" data-testid="metric-total-leads">
                      {metrics?.totalLeads.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">New This Month</span>
                    <span className="font-medium text-green-600">
                      +{metrics?.newToday || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Growth Rate</span>
                    <span className="font-medium text-green-600">+{calculateGrowthRate()}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="p-6 border border-border">
              <CardHeader className="flex flex-row items-center justify-between p-0 mb-4">
                <CardTitle className="font-semibold text-foreground">Conversion</CardTitle>
                <Target className="text-yellow-600" size={24} />
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Conversion Rate</span>
                    <span className="font-medium" data-testid="metric-conversion-rate">
                      {calculateConversionRate()}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Converted</span>
                    <span className="font-medium text-green-600">
                      {metrics?.convertedThisWeek || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg. Days to Convert</span>
                    <span className="font-medium">{calculateAvgDaysToConvert()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="p-6 border border-border">
              <CardHeader className="flex flex-row items-center justify-between p-0 mb-4">
                <CardTitle className="font-semibold text-foreground">Performance</CardTitle>
                <Users className="text-purple-600" size={24} />
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Best Source</span>
                    <span className="font-medium">{getBestSource()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Leads</span>
                    <span className="font-medium text-blue-600">
                      {(metrics?.totalLeads || 0) - (metrics?.convertedThisWeek || 0) - (metrics?.lostThisMonth || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Lost Rate</span>
                    <span className="font-medium text-red-600">{getLostRate()}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Status Distribution */}
            <Card className="border border-border p-6">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="font-semibold text-foreground">Lead Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-64" data-testid="chart-status-distribution">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="status"
                        label={({ status, count, value }) => `${status}: ${count}`}
                        labelLine={false}
                      >
                        {statusData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: any) => [value, name]}
                        labelFormatter={(label: any) => `Status: ${label}`}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  {statusData.map((entry: any, index: number) => (
                    <div key={entry.status} className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{entry.status}: {entry.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Source Performance */}
            <Card className="border border-border p-6">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="font-semibold text-foreground">Source Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-64" data-testid="chart-source-performance">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="source" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: any, name: any) => [value, 'Count']}
                        labelFormatter={(label: any) => `Source: ${label}`}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #ccc',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Trend */}
          <Card className="border border-border p-6">
            <CardHeader className="flex flex-row items-center justify-between p-0 mb-4">
              <CardTitle className="font-semibold text-foreground">Conversion Trend</CardTitle>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {conversionData.reduce((sum: number, item: any) => sum + item.count, 0)} total conversions
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-64" data-testid="chart-conversion-trend">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={conversionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: any) => [value, 'Conversions']}
                      labelFormatter={(label: any) => {
                        const date = new Date(label);
                        return date.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        });
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Source Analysis Radar */}
          {sourcePerformanceData.length > 0 && (
            <Card className="border border-border p-6">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="font-semibold text-foreground">Source Analysis</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-80" data-testid="chart-source-analysis">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={sourcePerformanceData[0] ? [
                      { subject: 'Volume', value: sourcePerformanceData[0].volume },
                      { subject: 'Conversion', value: sourcePerformanceData[0].conversion },
                      { subject: 'Quality', value: sourcePerformanceData[0].quality },
                      { subject: 'Cost Efficiency', value: 100 - sourcePerformanceData[0].cost },
                      { subject: 'Speed', value: sourcePerformanceData[0].speed },
                    ] : []}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        name="Performance"
                        dataKey="value"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Summary */}
          <Card className="border border-border p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="font-semibold text-foreground">Export Options</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" onClick={handleExport} className="justify-start" data-testid="button-export-leads-csv">
                  <Download className="w-4 h-4 mr-2" />
                  Export Leads as CSV
                </Button>
                <Button variant="outline" onClick={handleExportAnalytics} className="justify-start" data-testid="button-export-analytics">
                  <Download className="w-4 h-4 mr-2" />
                  Export Analytics
                </Button>
                <Button variant="outline" onClick={handleExportMonthlySummary} className="justify-start" data-testid="button-export-summary">
                  <Download className="w-4 h-4 mr-2" />
                  Monthly Summary
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
