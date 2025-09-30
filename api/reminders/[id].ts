import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../lib/db.js';
import * as storage from '../lib/storage.js';
import { corsHandler, withAuth } from '../lib/auth.js';
import { insertReminderSchema } from '../../shared/schema.js';
import { z } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[Reminders [id]] ========== NEW REQUEST ==========`);
  console.log(`[Reminders [id]] Method: ${req.method}`);
  console.log(`[Reminders [id]] URL: ${req.url}`);
  console.log(`[Reminders [id]] Query:`, req.query);
  
  if (corsHandler(req, res)) {
    console.log(`[Reminders [id]] CORS preflight handled`);
    return;
  }

  // Only handle PUT method (update reminder)
  if (req.method !== 'PUT') {
    console.log(`[Reminders [id]] Method ${req.method} not allowed`);
    return res.status(405).json({ 
      message: 'Method not allowed',
      allowedMethods: ['PUT'],
      receivedMethod: req.method,
      note: 'Use POST to /api/reminders/[id]/complete to complete a reminder'
    });
  }

  await withAuth(async (req, res, user) => {
    try {
      console.log(`[Reminders [id]] Auth successful for user: ${user.userId}`);
      await connectDB();
      console.log(`[Reminders [id]] DB connected`);
      
      // Extract reminder ID from query (Vercel passes dynamic segments as query params)
      const reminderId = req.query.id as string;
      console.log(`[Reminders [id]] Reminder ID: ${reminderId}`);
      
      if (!reminderId || reminderId === 'undefined') {
        console.error(`[Reminders [id]] Invalid reminder ID: ${reminderId}`);
        return res.status(400).json({ 
          message: "Invalid reminder ID",
          receivedId: reminderId
        });
      }
      
      console.log(`[Reminders [id]] Updating reminder: ${reminderId} with body:`, req.body);
      const updates = insertReminderSchema.partial().omit({ userId: true }).parse(req.body);
      
      if (req.body.dueDate) {
        updates.dueDate = new Date(req.body.dueDate);
        console.log(`[Reminders [id]] Parsed due date: ${updates.dueDate}`);
      }
      
      const reminder = await storage.updateReminder(reminderId, updates, user.userId);
      
      if (!reminder) {
        console.error(`[Reminders [id]] Reminder not found: ${reminderId}`);
        return res.status(404).json({ message: "Reminder not found" });
      }
      
      console.log(`[Reminders [id]] Successfully updated reminder: ${reminderId}`);
      return res.json(reminder);
    } catch (error: any) {
      console.error('[Reminders [id]] ERROR:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      
      if (error instanceof z.ZodError) {
        console.error('[Reminders [id]] Validation errors:', error.errors);
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      return res.status(500).json({ 
        message: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  })(req, res);
}
