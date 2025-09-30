import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../server/lib-vercel/db.js';
import * as storage from '../../server/lib-vercel/storage.js';
import { corsHandler, withAuth } from '../../server/lib-vercel/auth.js';
import { insertReminderSchema } from '../../shared/schema.js';
import { z } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[Reminders Index] ========== NEW REQUEST ==========`);
  console.log(`[Reminders Index] Method: ${req.method}`);
  console.log(`[Reminders Index] URL: ${req.url}`);
  console.log(`[Reminders Index] Query:`, req.query);
  console.log(`[Reminders Index] Headers:`, {
    authorization: req.headers.authorization ? 'Bearer ***' : 'None',
    contentType: req.headers['content-type']
  });
  
  if (corsHandler(req, res)) {
    console.log(`[Reminders Index] CORS preflight handled`);
    return;
  }

  await withAuth(async (req, res, user) => {
    try {
      console.log(`[Reminders Index] Auth successful for user: ${user.userId}`);
      await connectDB();
      console.log(`[Reminders Index] DB connected`);
      
      // GET /api/reminders - List reminders
      if (req.method === 'GET') {
        const { date, overdue, completed } = req.query as Record<string, string>;
        const filters: any = {};
        
        if (date) {
          filters.date = new Date(date);
          console.log(`[Reminders Index] Date filter: ${date} -> ${filters.date}`);
        }
        if (overdue) {
          filters.overdue = overdue === 'true';
          console.log(`[Reminders Index] Overdue filter: ${filters.overdue}`);
        }
        if (completed !== undefined) {
          filters.completed = completed === 'true';
          console.log(`[Reminders Index] Completed filter: ${filters.completed}`);
        }
        
        console.log(`[Reminders Index] Fetching reminders with filters:`, filters);
        const reminders = await storage.getReminders(user.userId, filters);
        console.log(`[Reminders Index] Found ${reminders.length} reminders`);
        return res.json(reminders);
      }
      
      // POST /api/reminders - Create reminder
      if (req.method === 'POST') {
        console.log(`[Reminders Index] Creating new reminder with body:`, req.body);
        const reminderData = insertReminderSchema.parse({
          ...req.body,
          userId: user.userId
        });
        console.log(`[Reminders Index] Validated reminder data:`, reminderData);
        const reminder = await storage.createReminder(reminderData);
        console.log(`[Reminders Index] Created reminder with ID: ${reminder._id}`);
        return res.status(201).json(reminder);
      }
      
      console.log(`[Reminders Index] Method ${req.method} not allowed for base route`);
      return res.status(405).json({ 
        message: 'Method not allowed',
        allowedMethods: ['GET', 'POST'],
        receivedMethod: req.method
      });
    } catch (error: any) {
      console.error('[Reminders Index] ERROR:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      
      if (error instanceof z.ZodError) {
        console.error('[Reminders Index] Validation errors:', error.errors);
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      return res.status(500).json({ 
        message: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  })(req, res);
}
