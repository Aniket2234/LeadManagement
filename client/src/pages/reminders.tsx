import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Topbar from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Plus, Bell, Clock, CheckCircle, X } from "lucide-react";

interface Reminder {
  id: string;
  title: string;
  message: string;
  dueDate: string;
  completed: boolean;
  leadId: string;
  createdAt: string;
}

interface RemindersProps {
  onMenuClick?: () => void;
}

export default function Reminders({ onMenuClick }: RemindersProps = {}) {
  const [addReminderModalOpen, setAddReminderModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    dueDate: "",
    leadId: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get reminders based on active tab
  const getRemindersFilter = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (activeTab) {
      case "today":
        return { date: today, completed: false };
      case "tomorrow":
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { date: tomorrow, completed: false };
      case "week":
        return { completed: false };
      case "overdue":
        return { overdue: true, completed: false };
      default:
        return { completed: false };
    }
  };

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['/api/reminders', activeTab],
    queryFn: () => api.getReminders(getRemindersFilter()),
  });

  const { data: leadsResponse } = useQuery({
    queryKey: ['/api/leads', { limit: 1000 }],
    queryFn: () => api.getLeads({ limit: 1000 }),
  });

  const createReminderMutation = useMutation({
    mutationFn: (reminderData: any) => api.createReminder(reminderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      toast({
        title: "Success",
        description: "Reminder created successfully",
      });
      setAddReminderModalOpen(false);
      setFormData({ title: "", message: "", dueDate: "", leadId: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create reminder",
        variant: "destructive",
      });
    },
  });

  const completeReminderMutation = useMutation({
    mutationFn: (reminderId: string) => api.completeReminder(reminderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      toast({
        title: "Success",
        description: "Reminder completed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete reminder",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.dueDate || !formData.leadId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createReminderMutation.mutate(formData);
  };

  const handleCompleteReminder = (reminderId: string) => {
    completeReminderMutation.mutate(reminderId);
  };

  const getStatus = (reminder: Reminder) => {
    const dueDate = new Date(reminder.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) return { label: "Overdue", variant: "destructive" as const };
    if (dueDate.getTime() === today.getTime()) return { label: "Today", variant: "secondary" as const };
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDate.getTime() === tomorrow.getTime()) return { label: "Tomorrow", variant: "default" as const };
    return { label: "Upcoming", variant: "outline" as const };
  };

  const formatDueTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString();
  };

  const getOverdueCount = () => {
    const now = new Date();
    return reminders.filter((reminder: Reminder) => 
      new Date(reminder.dueDate) < now && !reminder.completed
    ).length;
  };

  const leads = leadsResponse?.leads || [];

  return (
    <>
      <Topbar
        title="Follow-up Reminders"
        subtitle="Stay on top of your lead follow-ups and never miss an opportunity."
        onMenuClick={onMenuClick}
        actions={
          <Button onClick={() => setAddReminderModalOpen(true)} data-testid="button-add-reminder">
            <Plus className="w-4 h-4 mr-2" />
            Add Reminder
          </Button>
        }
      />

      <main className="flex-1 overflow-auto p-6">
        <Card className="p-6 shadow-sm border border-border">
          <CardHeader className="flex flex-row items-center justify-between p-0 mb-6">
            <CardTitle className="text-lg font-semibold text-foreground">Follow-up Reminders</CardTitle>
            {getOverdueCount() > 0 && (
              <Badge variant="destructive">
                {getOverdueCount()} Overdue
              </Badge>
            )}
          </CardHeader>
          
          <CardContent className="p-0">
            {/* Reminder Tabs */}
            <div className="flex space-x-4 mb-6">
              {[
                { key: "today", label: "Today" },
                { key: "tomorrow", label: "Tomorrow" },
                { key: "week", label: "This Week" },
                { key: "overdue", label: "Overdue" },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  variant={activeTab === tab.key ? "default" : "ghost"}
                  onClick={() => setActiveTab(tab.key)}
                  data-testid={`tab-${tab.key}`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
            
            {/* Reminders List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : reminders.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No reminders for {activeTab === "overdue" ? "overdue" : activeTab}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reminders.map((reminder: Reminder) => {
                  const status = getStatus(reminder);
                  const leadName = leads.find((lead: any) => lead.id === reminder.leadId)?.name || "Unknown Lead";
                  
                  return (
                    <div
                      key={reminder.id}
                      className="flex items-center p-4 border border-border rounded-lg"
                      data-testid={`reminder-${reminder.id}`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                        status.variant === "destructive" 
                          ? "bg-red-100" 
                          : status.variant === "secondary" 
                          ? "bg-yellow-100" 
                          : "bg-green-100"
                      }`}>
                        <Bell className={`${
                          status.variant === "destructive" 
                            ? "text-red-600" 
                            : status.variant === "secondary" 
                            ? "text-yellow-600" 
                            : "text-green-600"
                        }`} size={20} />
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{reminder.title}</h4>
                        <p className="text-sm text-muted-foreground mb-1">{reminder.message}</p>
                        <p className="text-sm text-muted-foreground">Lead: {leadName}</p>
                        <div className="flex items-center mt-2 space-x-4">
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            Due: {formatDueTime(reminder.dueDate)}
                          </span>
                          <Badge variant={status.variant} className="text-xs">
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCompleteReminder(reminder.id)}
                          disabled={completeReminderMutation.isPending}
                          data-testid={`button-complete-${reminder.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-snooze-${reminder.id}`}
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          Snooze
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add Reminder Modal */}
      <Dialog open={addReminderModalOpen} onOpenChange={setAddReminderModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Add New Reminder
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAddReminderModalOpen(false)}
                data-testid="button-close-reminder-modal"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title" className="text-sm font-medium text-foreground mb-2">
                Title *
              </Label>
              <Input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Follow up with client"
                data-testid="input-reminder-title"
              />
            </div>
            
            <div>
              <Label htmlFor="leadId" className="text-sm font-medium text-foreground mb-2">
                Lead *
              </Label>
              <Select value={formData.leadId} onValueChange={(value) => setFormData({ ...formData, leadId: value })}>
                <SelectTrigger data-testid="select-reminder-lead">
                  <SelectValue placeholder="Select a lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead: any) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name} {lead.company && `- ${lead.company}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="dueDate" className="text-sm font-medium text-foreground mb-2">
                Due Date & Time *
              </Label>
              <Input
                id="dueDate"
                type="datetime-local"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                data-testid="input-reminder-due-date"
              />
            </div>
            
            <div>
              <Label htmlFor="message" className="text-sm font-medium text-foreground mb-2">
                Message
              </Label>
              <Textarea
                id="message"
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Add details about what needs to be done..."
                data-testid="textarea-reminder-message"
              />
            </div>
            
            <div className="flex items-center justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddReminderModalOpen(false)}
                data-testid="button-cancel-reminder"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createReminderMutation.isPending}
                data-testid="button-create-reminder"
              >
                {createReminderMutation.isPending ? "Creating..." : "Create Reminder"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
