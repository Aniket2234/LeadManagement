import { Card, CardContent } from "@/components/ui/card";
import { Users, Plus, Trophy, X, TrendingUp, TrendingDown } from "lucide-react";

interface MetricsCardsProps {
  totalLeads: number;
  newToday: number;
  convertedThisWeek: number;
  lostThisMonth: number;
  trends?: {
    totalLeadsTrend: number;
    newTodayTrend: number;
    convertedWeekTrend: number;
    lostMonthTrend: number;
  };
}

export default function MetricsCards({ 
  totalLeads, 
  newToday, 
  convertedThisWeek, 
  lostThisMonth,
  trends 
}: MetricsCardsProps) {
  const metrics = [
    {
      title: "Total Leads",
      value: totalLeads,
      icon: Users,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      trend: { 
        value: Math.abs(trends?.totalLeadsTrend || 0), 
        direction: (trends?.totalLeadsTrend || 0) >= 0 ? "up" : "down" 
      }
    },
    {
      title: "New Today",
      value: newToday,
      icon: Plus,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      trend: { 
        value: Math.abs(trends?.newTodayTrend || 0), 
        direction: (trends?.newTodayTrend || 0) >= 0 ? "up" : "down" 
      }
    },
    {
      title: "Converted This Week",
      value: convertedThisWeek,
      icon: Trophy,
      bgColor: "bg-yellow-100",
      iconColor: "text-yellow-600",
      trend: { 
        value: Math.abs(trends?.convertedWeekTrend || 0), 
        direction: (trends?.convertedWeekTrend || 0) >= 0 ? "up" : "down" 
      }
    },
    {
      title: "Lost This Month",
      value: lostThisMonth,
      icon: X,
      bgColor: "bg-red-100",
      iconColor: "text-red-600",
      trend: { 
        value: Math.abs(trends?.lostMonthTrend || 0), 
        direction: (trends?.lostMonthTrend || 0) >= 0 ? "down" : "up" 
      }
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const TrendIcon = metric.trend.direction === "up" ? TrendingUp : TrendingDown;
        
        return (
          <Card key={index} className="p-6 shadow-sm border border-border">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">{metric.title}</p>
                  <p className="text-3xl font-bold text-foreground" data-testid={`metric-${metric.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    {metric.value.toLocaleString()}
                  </p>
                </div>
                <div className={`w-12 h-12 ${metric.bgColor} rounded-xl flex items-center justify-center`}>
                  <Icon className={`${metric.iconColor}`} size={24} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className={`${metric.trend.direction === 'up' ? 'text-green-600' : 'text-red-600'} flex items-center`}>
                  <TrendIcon className="w-4 h-4 mr-1" />
                  {metric.trend.value}%
                </span>
                <span className="text-muted-foreground ml-2">vs last month</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
