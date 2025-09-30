import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ActivityFeed from "./activity-feed";
import { useState } from "react";

interface Activity {
  id: string;
  action: "created" | "updated" | "status_changed" | "note_added";
  description: string;
  createdAt: string;
  metadata?: any;
}

interface ChartsProps {
  statusData: { status: string; count: number }[];
  sourceData: { source: string; count: number }[];
  conversionData: { date: string; count: number }[];
  activities: Activity[];
  onStatusPeriodChange?: (period: string) => void;
  onSourcePeriodChange?: (period: string) => void;
  onConversionPeriodChange?: (period: string) => void;
}

const STATUS_COLORS = {
  'New': '#64748b',
  'Contacted': '#0ea5e9', 
  'Qualified': '#7c3aed',
  'Converted': '#059669',
  'Lost': '#dc2626'
};

const STATUS_GRADIENTS = {
  'New': 'url(#newGradient)',
  'Contacted': 'url(#contactedGradient)', 
  'Qualified': 'url(#qualifiedGradient)',
  'Converted': 'url(#convertedGradient)',
  'Lost': 'url(#lostGradient)'
};

const SOURCE_COLORS = {
  'Website': '#0ea5e9',
  'Referral': '#059669',
  'Ad': '#7c3aed',
  'Other': '#ea580c'
};

export default function Charts({ 
  statusData, 
  sourceData, 
  conversionData,
  activities,
  onStatusPeriodChange,
  onSourcePeriodChange,
  onConversionPeriodChange
}: ChartsProps) {
  const [statusPeriod, setStatusPeriod] = useState("month");
  const [sourcePeriod, setSourcePeriod] = useState("month");
  const [conversionPeriod, setConversionPeriod] = useState("monthly");

  const handleStatusPeriodChange = (period: string) => {
    setStatusPeriod(period);
    onStatusPeriodChange?.(period);
  };

  const handleSourcePeriodChange = (period: string) => {
    setSourcePeriod(period);
    onSourcePeriodChange?.(period);
  };

  const handleConversionPeriodChange = (period: string) => {
    setConversionPeriod(period);
    onConversionPeriodChange?.(period);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm p-4 border border-border rounded-xl shadow-xl animate-in fade-in-0 zoom-in-95">
          <p className="text-foreground font-semibold text-base mb-2">
            {label || payload[0].payload.status || payload[0].payload.source}
          </p>
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: payload[0].color || '#0ea5e9' }}
            />
            <p className="text-foreground font-medium">
              {`${payload[0].name || 'Count'}: ${payload[0].value}`}
            </p>
          </div>
          {payload[0].payload.percentage && (
            <p className="text-muted-foreground text-sm mt-1 ml-5">
              {`${payload[0].payload.percentage.toFixed(1)}% of total`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const EmptyChart = ({ message }: { message: string }) => (
    <div className="h-64 flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
          <div className="w-8 h-8 bg-muted-foreground/20 rounded-full" />
        </div>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );

  // Add percentage calculation for status data
  const statusDataWithPercentage = statusData.map(item => {
    const total = statusData.reduce((sum, d) => sum + d.count, 0);
    return {
      ...item,
      percentage: total > 0 ? (item.count / total) * 100 : 0
    };
  });

  const sourceDataWithPercentage = sourceData.map(item => {
    const total = sourceData.reduce((sum, d) => sum + d.count, 0);
    return {
      ...item,
      percentage: total > 0 ? (item.count / total) * 100 : 0
    };
  });

  return (
    <>
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Leads by Status Chart */}
        <Card className="p-6 shadow-sm border border-border">
          <CardHeader className="flex flex-row items-center justify-between p-0 mb-6">
            <CardTitle className="text-lg font-semibold text-foreground">Leads by Status</CardTitle>
            <Select value={statusPeriod} onValueChange={handleStatusPeriodChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="today">Today</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-64" data-testid="chart-status">
              {statusDataWithPercentage.length === 0 ? (
                <EmptyChart message="No status data available for this period" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <linearGradient id="newGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#64748b" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#475569" stopOpacity={0.8}/>
                      </linearGradient>
                      <linearGradient id="contactedGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#0284c7" stopOpacity={0.8}/>
                      </linearGradient>
                      <linearGradient id="qualifiedGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.8}/>
                      </linearGradient>
                      <linearGradient id="convertedGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#059669" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#047857" stopOpacity={0.8}/>
                      </linearGradient>
                      <linearGradient id="lostGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#dc2626" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <Pie
                      data={statusDataWithPercentage}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={105}
                      paddingAngle={3}
                      dataKey="count"
                      label={({ status, percentage }) => percentage > 5 ? `${percentage.toFixed(0)}%` : ''}
                      labelLine={false}
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {statusDataWithPercentage.map((entry, index) => (
                        <Cell 
                          key={`status-cell-${index}`} 
                          fill={STATUS_GRADIENTS[entry.status as keyof typeof STATUS_GRADIENTS] || STATUS_GRADIENTS.New}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={40}
                      iconType="circle"
                      formatter={(value, entry) => (
                        <span style={{ color: entry.color, fontWeight: 500 }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Leads by Source Chart */}
        <Card className="p-6 shadow-sm border border-border">
          <CardHeader className="flex flex-row items-center justify-between p-0 mb-6">
            <CardTitle className="text-lg font-semibold text-foreground">Leads by Source</CardTitle>
            <Select value={sourcePeriod} onValueChange={handleSourcePeriodChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="today">Today</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-64" data-testid="chart-source">
              {sourceDataWithPercentage.length === 0 ? (
                <EmptyChart message="No source data available for this period" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={sourceDataWithPercentage} 
                    margin={{ top: 25, right: 30, left: 20, bottom: 60 }}
                  >
                    <defs>
                      {Object.entries(SOURCE_COLORS).map(([key, color]) => (
                        <linearGradient key={key} id={`${key}Gradient`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={1}/>
                          <stop offset="100%" stopColor={color} stopOpacity={0.6}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="#e2e8f0" 
                      vertical={false}
                      opacity={0.6}
                    />
                    <XAxis 
                      dataKey="source" 
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="count" 
                      radius={[6, 6, 0, 0]}
                      animationDuration={800}
                      animationBegin={200}
                    >
                      {sourceDataWithPercentage.map((entry, index) => (
                        <Cell 
                          key={`source-cell-${index}`} 
                          fill={`url(#${entry.source}Gradient)`}
                          stroke={SOURCE_COLORS[entry.source as keyof typeof SOURCE_COLORS] || '#0ea5e9'}
                          strokeWidth={1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 shadow-sm border border-border">
          <CardHeader className="flex flex-row items-center justify-between p-0 mb-6">
            <CardTitle className="text-lg font-semibold text-foreground">Conversion Trend</CardTitle>
            <div className="flex items-center space-x-2">
              <button 
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  conversionPeriod === 'monthly' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                onClick={() => handleConversionPeriodChange('monthly')}
                data-testid="button-monthly"
              >
                Monthly
              </button>
              <button 
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  conversionPeriod === 'weekly' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                onClick={() => handleConversionPeriodChange('weekly')}
                data-testid="button-weekly"
              >
                Weekly
              </button>
              <button 
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  conversionPeriod === 'daily' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                onClick={() => handleConversionPeriodChange('daily')}
                data-testid="button-daily"
              >
                Daily
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-64" data-testid="chart-conversion">
              {conversionData.length === 0 ? (
                <EmptyChart message="No conversion data available for this period" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={conversionData} 
                    margin={{ top: 25, right: 30, left: 20, bottom: 25 }}
                  >
                    <defs>
                      <linearGradient id="conversionAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#059669" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="#e2e8f0" 
                      vertical={false}
                      opacity={0.6}
                    />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={{ stroke: '#e2e8f0' }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background/95 backdrop-blur-sm p-4 border border-border rounded-xl shadow-xl animate-in fade-in-0 zoom-in-95">
                              <p className="text-foreground font-semibold text-base mb-2">
                                {new Date(label).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </p>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-600" />
                                <p className="text-foreground font-medium">
                                  Conversions: {payload[0].value}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#059669" 
                      strokeWidth={3}
                      dot={{ 
                        fill: '#059669', 
                        strokeWidth: 3, 
                        r: 5,
                        stroke: '#ffffff'
                      }}
                      activeDot={{ 
                        r: 7, 
                        stroke: '#059669', 
                        strokeWidth: 3,
                        fill: '#ffffff'
                      }}
                      animationDuration={1000}
                      animationBegin={400}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Activity Feed */}
        <div className="lg:col-span-1">
          <ActivityFeed activities={activities} />
        </div>
      </div>
    </>
  );
}
