import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trophy, MessageSquare, Bell } from "lucide-react";

interface Activity {
  id: string;
  action: "created" | "updated" | "status_changed" | "note_added";
  description: string;
  createdAt: string;
  metadata?: any;
}

interface ActivityFeedProps {
  activities: Activity[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityIcon = (action: string) => {
    switch (action) {
      case "created":
        return { icon: Plus, bgColor: "bg-green-100", iconColor: "text-green-600" };
      case "updated":
        return { icon: Edit, bgColor: "bg-blue-100", iconColor: "text-blue-600" };
      case "status_changed":
        return { icon: Trophy, bgColor: "bg-yellow-100", iconColor: "text-yellow-600" };
      case "note_added":
        return { icon: MessageSquare, bgColor: "bg-purple-100", iconColor: "text-purple-600" };
      default:
        return { icon: Bell, bgColor: "bg-gray-100", iconColor: "text-gray-600" };
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  if (!activities.length) {
    return (
      <Card className="p-6 shadow-sm border border-border">
        <CardHeader className="p-0 mb-6">
          <CardTitle className="text-lg font-semibold text-foreground">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-center py-8">
            <p className="text-muted-foreground">No recent activity to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-sm border border-border">
      <CardHeader className="p-0 mb-6">
        <CardTitle className="text-lg font-semibold text-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-4">
          {activities.map((activity) => {
            const { icon: Icon, bgColor, iconColor } = getActivityIcon(activity.action);
            
            return (
              <div key={activity.id} className="flex items-start space-x-3" data-testid={`activity-${activity.id}`}>
                <div className={`w-8 h-8 ${bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`${iconColor} text-xs`} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <Button
          variant="ghost"
          className="w-full mt-4 text-center text-primary hover:text-primary/80 text-sm"
          data-testid="button-view-all-activity"
        >
          View all activity
        </Button>
      </CardContent>
    </Card>
  );
}
