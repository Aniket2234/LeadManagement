import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Topbar from "@/components/layout/topbar";
import AddLeadModal from "@/components/leads/add-lead-modal";
import LeadDetail from "@/components/leads/lead-detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Plus, Download, Search, Filter, Eye, Edit, Trash2 } from "lucide-react";

interface LeadsProps {
  onMenuClick?: () => void;
}

export default function Leads({ onMenuClick }: LeadsProps = {}) {
  const [addLeadModalOpen, setAddLeadModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadDetailOpen, setLeadDetailOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    source: "all",
    page: 1,
    limit: 10,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leadsResponse, isLoading } = useQuery({
    queryKey: ['/api/leads', filters],
    queryFn: () => api.getLeads({
      ...filters,
      status: filters.status === "all" ? "" : filters.status,
      source: filters.source === "all" ? "" : filters.source,
    }),
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (leadId: string) => api.deleteLead(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lead",
        variant: "destructive",
      });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, page: 1 });
  };

  const handleViewLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setLeadDetailOpen(true);
  };

  const handleDeleteLead = (leadId: string) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      deleteLeadMutation.mutate(leadId);
    }
  };

  const handleEditLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    // You can implement edit functionality here
    // For now, we'll open the lead detail in edit mode
    setLeadDetailOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New": return "default";
      case "Contacted": return "secondary";
      case "Qualified": return "outline";
      case "Converted": return "default";
      case "Lost": return "destructive";
      default: return "default";
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "Website": return "bg-blue-100 text-blue-800";
      case "Referral": return "bg-green-100 text-green-800";
      case "Ad": return "bg-orange-100 text-orange-800";
      case "Other": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <>
      <Topbar
        title="Leads Management"
        subtitle="Manage and track all your leads in one place."
        onMenuClick={onMenuClick}
        actions={
          <>
            <Button variant="secondary" onClick={() => api.exportLeadsCSV()} data-testid="button-export-leads">
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
          {/* Search and Filters */}
          <Card className="p-6 shadow-sm border border-border">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search leads by name, email, or phone..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </form>
                <div className="flex items-center space-x-3">
                  <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value, page: 1 })}>
                    <SelectTrigger className="w-32" data-testid="select-status-filter">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Contacted">Contacted</SelectItem>
                      <SelectItem value="Qualified">Qualified</SelectItem>
                      <SelectItem value="Converted">Converted</SelectItem>
                      <SelectItem value="Lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.source} onValueChange={(value) => setFilters({ ...filters, source: value, page: 1 })}>
                    <SelectTrigger className="w-32" data-testid="select-source-filter">
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Ad">Ad</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" data-testid="button-more-filters">
                    <Filter className="w-4 h-4 mr-2" />
                    More Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leads Table */}
          <Card className="shadow-sm border border-border overflow-hidden">
            <CardHeader className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground">All Leads</CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground" data-testid="text-leads-count">
                    {leadsResponse?.total || 0} leads
                  </span>
                  <Button variant="outline" size="sm" onClick={() => api.exportLeadsCSV()}>
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <Checkbox />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leadsResponse?.leads?.map((lead: any) => (
                      <tr key={lead.id} className="hover:bg-muted/50" data-testid={`row-lead-${lead.id}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Checkbox />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-3">
                              <span className="text-sm font-medium text-primary-foreground">
                                {lead.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">{lead.name}</div>
                              {lead.email && <div className="text-sm text-muted-foreground">{lead.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {lead.company || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={`text-xs font-medium rounded-full ${getSourceColor(lead.source)}`}>
                            {lead.source}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getStatusColor(lead.status)} className="text-xs font-medium rounded-full">
                            {lead.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewLead(lead.id)}
                              data-testid={`button-view-${lead.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditLead(lead.id)}
                              data-testid={`button-edit-${lead.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLead(lead.id)}
                              data-testid={`button-delete-${lead.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )) || []}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* Pagination */}
            {leadsResponse && (
              <div className="px-6 py-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((filters.page - 1) * filters.limit) + 1} to{" "}
                    {Math.min(filters.page * filters.limit, leadsResponse.total)} of {leadsResponse.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page <= 1}
                      onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                      data-testid="button-previous"
                    >
                      Previous
                    </Button>
                    <span className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
                      {filters.page}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page * filters.limit >= leadsResponse.total}
                      onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                      data-testid="button-next"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
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
