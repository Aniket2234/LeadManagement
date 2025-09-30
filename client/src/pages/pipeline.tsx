import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Topbar from "@/components/layout/topbar";
import AddLeadModal from "@/components/leads/add-lead-modal";
import LeadDetail from "@/components/leads/lead-detail";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Plus, Eye, Edit, Globe, Users, Target } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source: "Website" | "Referral" | "Ad" | "Other";
  status: "New" | "Contacted" | "Qualified" | "Converted" | "Lost";
  createdAt: string;
}

interface PipelineProps {
  onMenuClick?: () => void;
}

export default function Pipeline({ onMenuClick }: PipelineProps = {}) {
  const [addLeadModalOpen, setAddLeadModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadDetailOpen, setLeadDetailOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leadsResponse, isLoading } = useQuery({
    queryKey: ['/api/leads', { limit: 1000 }],
    queryFn: () => api.getLeads({ limit: 1000 }),
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: string }) => 
      api.updateLead(leadId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      toast({
        title: "Success",
        description: "Lead status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lead status",
        variant: "destructive",
      });
    },
  });

  const handleViewLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setLeadDetailOpen(true);
  };

  const handleStatusChange = (leadId: string, newStatus: string) => {
    updateLeadMutation.mutate({ leadId, status: newStatus });
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "Website": return Globe;
      case "Referral": return Users;
      case "Ad": return Target;
      default: return Globe;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "Website": return "bg-blue-100 text-blue-600";
      case "Referral": return "bg-green-100 text-green-600";
      case "Ad": return "bg-orange-100 text-orange-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const groupLeadsByStatus = (leads: Lead[]) => {
    const statusGroups = {
      New: leads.filter(lead => lead.status === "New"),
      Contacted: leads.filter(lead => lead.status === "Contacted"),
      Qualified: leads.filter(lead => lead.status === "Qualified"),
      Converted: leads.filter(lead => lead.status === "Converted"),
      Lost: leads.filter(lead => lead.status === "Lost"),
    };
    return statusGroups;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New": return "bg-gray-200 text-gray-700";
      case "Contacted": return "bg-blue-200 text-blue-700";
      case "Qualified": return "bg-purple-200 text-purple-700";
      case "Converted": return "bg-green-200 text-green-700";
      case "Lost": return "bg-red-200 text-red-700";
      default: return "bg-gray-200 text-gray-700";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return `${Math.floor(diffInDays / 7)} weeks ago`;
  };

  const leads = leadsResponse?.leads || [];
  const groupedLeads = groupLeadsByStatus(leads);

  return (
    <>
      <Topbar
        title="Lead Pipeline"
        subtitle="Visualize and manage your lead progression through the sales pipeline."
        onMenuClick={onMenuClick}
        actions={
          <>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-32" data-testid="select-time-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setAddLeadModalOpen(true)} data-testid="button-add-lead">
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </>
        }
      />

      <main className="flex-1 overflow-auto p-6">
        <Card className="p-6 shadow-sm border border-border">
          <CardHeader className="flex flex-row items-center justify-between p-0 mb-6">
            <CardTitle className="text-lg font-semibold text-foreground">Lead Pipeline</CardTitle>
            <div className="text-sm text-muted-foreground">
              {leads.length} total leads
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" data-testid="kanban-board">
                {Object.entries(groupedLeads).map(([status, statusLeads]) => (
                  <div key={status} className="bg-muted p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-foreground">{status}</h4>
                      <Badge className={`text-xs rounded-full ${getStatusColor(status)}`}>
                        {statusLeads.length}
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {statusLeads.map((lead) => {
                        const SourceIcon = getSourceIcon(lead.source);
                        
                        return (
                          <div
                            key={lead.id}
                            className="bg-card p-3 rounded-lg border border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                            data-testid={`lead-card-${lead.id}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-foreground text-sm truncate">
                                {lead.name}
                              </h5>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${getSourceColor(lead.source)}`}>
                                <SourceIcon className="w-3 h-3" />
                              </div>
                            </div>
                            
                            {lead.company && (
                              <p className="text-xs text-muted-foreground mb-1 truncate">
                                {lead.company}
                              </p>
                            )}
                            
                            {lead.email && (
                              <p className="text-xs text-muted-foreground mb-2 truncate">
                                {lead.email}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(lead.createdAt)}
                              </span>
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleViewLead(lead.id)}
                                  data-testid={`button-view-lead-${lead.id}`}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  data-testid={`button-edit-lead-${lead.id}`}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Status transition buttons */}
                            {status !== "Converted" && status !== "Lost" && (
                              <div className="mt-2 flex space-x-1">
                                {status === "New" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-6 px-2"
                                    onClick={() => handleStatusChange(lead.id, "Contacted")}
                                    disabled={updateLeadMutation.isPending}
                                    data-testid={`button-contact-${lead.id}`}
                                  >
                                    Contact
                                  </Button>
                                )}
                                {status === "Contacted" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-6 px-2"
                                    onClick={() => handleStatusChange(lead.id, "Qualified")}
                                    disabled={updateLeadMutation.isPending}
                                    data-testid={`button-qualify-${lead.id}`}
                                  >
                                    Qualify
                                  </Button>
                                )}
                                {status === "Qualified" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-6 px-2"
                                    onClick={() => handleStatusChange(lead.id, "Converted")}
                                    disabled={updateLeadMutation.isPending}
                                    data-testid={`button-convert-${lead.id}`}
                                  >
                                    Convert
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {statusLeads.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No leads in {status.toLowerCase()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AddLeadModal
        open={addLeadModalOpen}
        onOpenChange={setAddLeadModalOpen}
      />

      <LeadDetail
        leadId={selectedLeadId}
        open={leadDetailOpen}
        onOpenChange={setLeadDetailOpen}
      />
    </>
  );
}
