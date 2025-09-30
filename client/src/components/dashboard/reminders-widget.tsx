import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Reminder {
  id?: string;
  _id?: string;
  title: string;
  message: string;
  dueDate: string;
  completed: boolean;
}

interface RemindersWidgetProps {
  reminders: Reminder[];
}

export default function RemindersWidget({ reminders }: RemindersWidgetProps) {
  const now = new Date();
  const todayReminders = reminders.filter(reminder => {
    const dueDate = new Date(reminder.dueDate);
    return dueDate.toDateString() === now.toDateString() && !reminder.completed;
  });
  
  const overdueReminders = reminders.filter(reminder => {
    const dueDate = new Date(reminder.dueDate);
    return dueDate < now && !reminder.completed;
  });

  const getStatus = (reminder: Reminder) => {
    const dueDate = new Date(reminder.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) return { label: "Overdue", variant: "destructive" as const };
    if (dueDate.getTime() === today.getTime()) return { label: "Today", variant: "secondary" as const };
    return { label: "Upcoming", variant: "default" as const };
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Card className="p-6 shadow-sm border border-border">
      <CardHeader className="flex flex-row items-center justify-between p-0 mb-6">
        <CardTitle className="text-lg font-semibold text-foreground">Today's Reminders</CardTitle>
        {overdueReminders.length > 0 && (
          <Badge variant="destructive">
            {overdueReminders.length} Overdue
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {reminders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No reminders for today</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reminders.slice(0, 6).map((reminder) => {
              const status = getStatus(reminder);
              
              return (
                <div key={reminder.id || reminder._id} className="p-4 border border-border rounded-lg" data-testid={`reminder-${reminder.id || reminder._id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground line-clamp-1">
                      {reminder.title}
                    </span>
                    <Badge variant={status.variant} className="text-xs">
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {reminder.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Due: {status.label === "Today" ? formatTime(reminder.dueDate) : 
                          new Date(reminder.dueDate).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
