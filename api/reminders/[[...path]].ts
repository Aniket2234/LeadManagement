import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../lib/db.js';
import * as storage from '../lib/storage.js';
import { corsHandler, withAuth } from '../lib/auth.js';
import { insertReminderSchema } from '../../shared/schema.js';
import { z } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (corsHandler(req, res)) return;

  await withAuth(async (req, res, user) => {
    try {
      await connectDB();
      
      // Parse the URL to extract reminder ID and action
      // URLs can be: /api/reminders, /api/reminders/[id], /api/reminders/[id]/complete
      const pathMatch = req.url?.match(/\/api\/reminders(?:\/([^/?]+))?(?:\/([^/?]+))?/);
      const reminderId = pathMatch ? pathMatch[1] : null;
      const action = pathMatch ? pathMatch[2] : null;
      
      console.log(`[Reminders] ${req.method} request - ID: ${reminderId}, action: ${action}, URL: ${req.url}`);
      
      // GET /api/reminders - List reminders
      if (req.method === 'GET' && !reminderId) {
        const { date, overdue, completed } = req.query as Record<string, string>;
        const filters: any = {};
        if (date) filters.date = new Date(date);
        if (overdue) filters.overdue = overdue === 'true';
        if (completed !== undefined) filters.completed = completed === 'true';
        
        console.log(`[Reminders] Fetching reminders with filters:`, filters);
        const reminders = await storage.getReminders(user.userId, filters);
        console.log(`[Reminders] Found ${reminders.length} reminders`);
        return res.json(reminders);
      }
      
      // POST /api/reminders - Create reminder
      if (req.method === 'POST' && !reminderId) {
        console.log(`[Reminders] Creating new reminder`);
        const reminderData = insertReminderSchema.parse({
          ...req.body,
          userId: user.userId
        });
        const reminder = await storage.createReminder(reminderData);
        console.log(`[Reminders] Created reminder with ID: ${reminder._id}`);
        return res.status(201).json(reminder);
      }
      
      // POST or PUT /api/reminders/[id]/complete - Complete reminder (support both for backward compatibility)
      if ((req.method === 'POST' || req.method === 'PUT') && reminderId && action === 'complete') {
        if (!reminderId || reminderId === 'undefined') {
          console.error(`[Reminders] Invalid reminder ID for complete action: ${reminderId}`);
          return res.status(400).json({ 
            message: "Invalid reminder ID",
            receivedId: reminderId
          });
        }
        
        console.log(`[Reminders] Completing reminder: ${reminderId}`);
        const success = await storage.completeReminder(reminderId, user.userId);
        if (!success) {
          console.error(`[Reminders] Reminder not found: ${reminderId}`);
          return res.status(404).json({ message: "Reminder not found" });
        }
        
        // Fetch the updated reminder to return it
        const updatedReminder = await storage.getReminders(user.userId, {});
        const reminder = updatedReminder.find(r => r._id.toString() === reminderId);
        
        console.log(`[Reminders] Successfully completed reminder: ${reminderId}`);
        return res.json(reminder || { message: "Reminder completed" });
      }
      
      // PUT /api/reminders/[id] - Update reminder
      if (req.method === 'PUT' && reminderId && !action) {
        if (!reminderId || reminderId === 'undefined') {
          console.error(`[Reminders] Invalid reminder ID for update: ${reminderId}`);
          return res.status(400).json({ 
            message: "Invalid reminder ID",
            receivedId: reminderId
          });
        }
        
        console.log(`[Reminders] Updating reminder: ${reminderId}`);
        const updates = insertReminderSchema.partial().omit({ userId: true }).parse(req.body);
        if (req.body.dueDate) {
          updates.dueDate = new Date(req.body.dueDate);
        }
        
        const reminder = await storage.updateReminder(reminderId, updates, user.userId);
        if (!reminder) {
          console.error(`[Reminders] Reminder not found: ${reminderId}`);
          return res.status(404).json({ message: "Reminder not found" });
        }
        console.log(`[Reminders] Successfully updated reminder: ${reminderId}`);
        return res.json(reminder);
      }
      
      console.error(`[Reminders] No matching route - Method: ${req.method}, ID: ${reminderId}, action: ${action}`);
      return res.status(405).json({ 
        message: 'Method not allowed or invalid route',
        method: req.method,
        reminderId,
        action
      });
    } catch (error: any) {
      console.error('[Reminders] Error processing request:', {
        message: error?.message,
        stack: error?.stack,
        url: req.url
      });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ 
        message: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  })(req, res);
}
