import { getAuthHeaders } from "./auth";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new ApiError(response.status, error.message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  // Leads
  getLeads: (filters?: Record<string, any>) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return apiCall(`/api/leads?${params.toString()}`);
  },

  getLead: (id: string) => apiCall(`/api/leads/${id}`),

  createLead: (leadData: any) =>
    apiCall("/api/leads", {
      method: "POST",
      body: JSON.stringify(leadData),
    }),

  updateLead: (id: string, leadData: any) =>
    apiCall(`/api/leads/${id}`, {
      method: "PUT",
      body: JSON.stringify(leadData),
    }),

  deleteLead: (id: string) =>
    apiCall(`/api/leads/${id}`, {
      method: "DELETE",
    }),

  // Notes
  addNote: (leadId: string, text: string) =>
    apiCall(`/api/leads/${leadId}/notes`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  getLeadNotes: (leadId: string) => apiCall(`/api/leads/${leadId}/notes`),

  // Reminders
  getReminders: (filters?: Record<string, any>) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return apiCall(`/api/reminders?${params.toString()}`);
  },

  createReminder: (reminderData: any) =>
    apiCall("/api/reminders", {
      method: "POST",
      body: JSON.stringify(reminderData),
    }),

  updateReminder: (id: string, reminderData: any) =>
    apiCall(`/api/reminders/${id}`, {
      method: "PUT",
      body: JSON.stringify(reminderData),
    }),

  completeReminder: (id: string) =>
    apiCall(`/api/reminders/${id}/complete`, {
      method: "POST",
    }),

  // Activities
  getActivities: (limit?: number) => {
    const params = limit ? `?limit=${limit}` : "";
    return apiCall(`/api/activities${params}`);
  },

  // Analytics
  getMetrics: () => apiCall("/api/analytics/metrics"),
  getLeadsByStatus: (period?: string) => {
    const params = period ? `?period=${period}` : "";
    return apiCall(`/api/analytics/leads-by-status${params}`);
  },
  getLeadsBySource: (period?: string) => {
    const params = period ? `?period=${period}` : "";
    return apiCall(`/api/analytics/leads-by-source${params}`);
  },
  getConversionTrend: (days?: number) => {
    const params = days ? `?days=${days}` : "";
    return apiCall(`/api/analytics/conversion-trend${params}`);
  },
  getMetricsTrends: () => apiCall("/api/analytics/metrics-trends"),
  getMonthlyMetrics: () => apiCall("/api/analytics/monthly-metrics"),

  // Export
  exportLeadsCSV: async () => {
    try {
      const response = await fetch('/api/leads/export/csv', {
        headers: {
          ...getAuthHeaders()
        }
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      throw error;
    }
  },
};
