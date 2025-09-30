import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, hashPassword, verifyPassword, generateToken } from "./middleware/auth";
import { 
  insertUserSchema, 
  insertLeadSchema, 
  insertNoteSchema,
  insertReminderSchema,
  loginSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        name,
        email,
        password: hashedPassword
      });

      const token = generateToken({ userId: user.id, email: user.email });
      
      res.json({
        user: { id: user.id, name: user.name, email: user.email },
        token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken({ userId: user.id, email: user.email });
      
      res.json({
        user: { id: user.id, name: user.name, email: user.email },
        token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ id: user.id, name: user.name, email: user.email });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Lead routes
  app.get("/api/leads", authenticateToken, async (req, res) => {
    try {
      const {
        search,
        status,
        source,
        startDate,
        endDate,
        page = "1",
        limit = "10"
      } = req.query as Record<string, string>;

      const filters = {
        search,
        status,
        source,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await storage.getLeads(req.user!.userId, filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/leads/:id", authenticateToken, async (req, res) => {
    try {
      const lead = await storage.getLeadById(req.params.id, req.user!.userId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/leads", authenticateToken, async (req, res) => {
    try {
      const leadData = insertLeadSchema.parse({
        ...req.body,
        userId: req.user!.userId
      });
      
      const lead = await storage.createLead(leadData);
      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/leads/:id", authenticateToken, async (req, res) => {
    try {
      const leadData = insertLeadSchema.partial().omit({ userId: true }).parse(req.body);
      const lead = await storage.updateLead(req.params.id, leadData, req.user!.userId);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/leads/:id", authenticateToken, async (req, res) => {
    try {
      const success = await storage.deleteLead(req.params.id, req.user!.userId);
      if (!success) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Notes routes
  app.post("/api/leads/:leadId/notes", authenticateToken, async (req, res) => {
    try {
      // Verify the lead belongs to the current user before allowing note creation
      const leadExists = await storage.getLeadById(req.params.leadId, req.user!.userId);
      if (!leadExists) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const noteData = insertNoteSchema.parse({
        ...req.body,
        leadId: req.params.leadId,
        userId: req.user!.userId
      });
      
      const note = await storage.addNote(noteData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/leads/:leadId/notes", authenticateToken, async (req, res) => {
    try {
      const notes = await storage.getLeadNotes(req.params.leadId, req.user!.userId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reminders routes
  app.get("/api/reminders", authenticateToken, async (req, res) => {
    try {
      const { date, overdue, completed } = req.query as Record<string, string>;
      
      const filters = {
        date: date ? new Date(date) : undefined,
        overdue: overdue === "true",
        completed: completed !== undefined ? completed === "true" : undefined
      };

      const reminders = await storage.getReminders(req.user!.userId, filters);
      res.json(reminders);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/reminders", authenticateToken, async (req, res) => {
    try {
      // Verify the lead belongs to the current user if leadId is provided
      if (req.body.leadId) {
        const leadExists = await storage.getLeadById(req.body.leadId, req.user!.userId);
        if (!leadExists) {
          return res.status(404).json({ message: "Lead not found" });
        }
      }

      const reminderData = insertReminderSchema.parse({
        ...req.body,
        userId: req.user!.userId
      });
      
      const reminder = await storage.createReminder(reminderData);
      res.status(201).json(reminder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/reminders/:id", authenticateToken, async (req, res) => {
    try {
      const updates = insertReminderSchema.partial().omit({ userId: true }).parse(req.body);
      if (req.body.dueDate) {
        updates.dueDate = new Date(req.body.dueDate);
      }

      // Verify lead ownership if leadId is being updated
      if (updates.leadId) {
        const leadExists = await storage.getLeadById(updates.leadId, req.user!.userId);
        if (!leadExists) {
          return res.status(404).json({ message: "Lead not found" });
        }
      }
      
      const reminder = await storage.updateReminder(req.params.id, updates, req.user!.userId);
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }
      
      res.json(reminder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/reminders/:id/complete", authenticateToken, async (req, res) => {
    try {
      const success = await storage.completeReminder(req.params.id, req.user!.userId);
      if (!success) {
        return res.status(404).json({ message: "Reminder not found" });
      }
      res.json({ message: "Reminder completed" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Activity routes
  app.get("/api/activities", authenticateToken, async (req, res) => {
    try {
      const { limit = "10" } = req.query as Record<string, string>;
      const activities = await storage.getRecentActivities(req.user!.userId, parseInt(limit));
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/metrics", authenticateToken, async (req, res) => {
    try {
      const metrics = await storage.getLeadMetrics(req.user!.userId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/analytics/leads-by-status", authenticateToken, async (req, res) => {
    try {
      const { period } = req.query as Record<string, string>;
      const data = await storage.getLeadsByStatus(req.user!.userId, period);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/analytics/leads-by-source", authenticateToken, async (req, res) => {
    try {
      const { period } = req.query as Record<string, string>;
      const data = await storage.getLeadsBySource(req.user!.userId, period);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/analytics/conversion-trend", authenticateToken, async (req, res) => {
    try {
      const { days = "30" } = req.query as Record<string, string>;
      const data = await storage.getConversionTrend(req.user!.userId, parseInt(days));
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/analytics/metrics-trends", authenticateToken, async (req, res) => {
    try {
      const trends = await storage.getMetricsTrends(req.user!.userId);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/analytics/monthly-metrics", authenticateToken, async (req, res) => {
    try {
      const metrics = await storage.getMonthlyMetrics(req.user!.userId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Export route
  app.get("/api/leads/export/csv", authenticateToken, async (req, res) => {
    try {
      const { leads } = await storage.getLeads(req.user!.userId, { limit: 10000 });
      
      const csvHeaders = "Name,Email,Phone,Company,Source,Status,Created At\n";
      const csvData = leads.map(lead => 
        `"${lead.name}","${lead.email || ''}","${lead.phone || ''}","${lead.company || ''}","${lead.source}","${lead.status}","${lead.createdAt.toISOString()}"`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
      res.send(csvHeaders + csvData);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
