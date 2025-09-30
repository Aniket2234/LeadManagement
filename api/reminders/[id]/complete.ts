import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../../server/lib-vercel/db.js';
import * as storage from '../../../server/lib-vercel/storage.js';
import { corsHandler, withAuth } from '../../../server/lib-vercel/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[Reminders Complete] ========== NEW REQUEST ==========`);
  console.log(`[Reminders Complete] Method: ${req.method}`);
  console.log(`[Reminders Complete] URL: ${req.url}`);
  console.log(`[Reminders Complete] Query:`, req.query);
  
  if (corsHandler(req, res)) {
    console.log(`[Reminders Complete] CORS preflight handled`);
    return;
  }

  // Support both POST and PUT for backward compatibility
  if (req.method !== 'POST' && req.method !== 'PUT') {
    console.log(`[Reminders Complete] Method ${req.method} not allowed`);
    return res.status(405).json({ 
      message: 'Method not allowed',
      allowedMethods: ['POST', 'PUT'],
      receivedMethod: req.method
    });
  }

  await withAuth(async (req, res, user) => {
    try {
      console.log(`[Reminders Complete] Auth successful for user: ${user.userId}`);
      await connectDB();
      console.log(`[Reminders Complete] DB connected`);
      
      // Extract reminder ID from query (Vercel passes dynamic segments as query params)
      const reminderId = req.query.id as string;
      console.log(`[Reminders Complete] Reminder ID: ${reminderId}`);
      
      if (!reminderId || reminderId === 'undefined') {
        console.error(`[Reminders Complete] Invalid reminder ID: ${reminderId}`);
        return res.status(400).json({ 
          message: "Invalid reminder ID",
          receivedId: reminderId,
          query: req.query
        });
      }
      
      console.log(`[Reminders Complete] Completing reminder: ${reminderId}`);
      const success = await storage.completeReminder(reminderId, user.userId);
      
      if (!success) {
        console.error(`[Reminders Complete] Reminder not found: ${reminderId}`);
        return res.status(404).json({ message: "Reminder not found" });
      }
      
      // Fetch the updated reminder to return it
      const updatedReminder = await storage.getReminders(user.userId, {});
      const reminder = updatedReminder.find(r => r._id.toString() === reminderId);
      
      console.log(`[Reminders Complete] Successfully completed reminder: ${reminderId}`);
      return res.json(reminder || { message: "Reminder completed" });
    } catch (error: any) {
      console.error('[Reminders Complete] ERROR:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      
      return res.status(500).json({ 
        message: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  })(req, res);
}
