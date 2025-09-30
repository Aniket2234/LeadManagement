import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../server/lib-vercel/db.js';
import * as storage from '../server/lib-vercel/storage.js';
import { corsHandler, withAuth } from '../server/lib-vercel/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (corsHandler(req, res)) return;
  
  if (req.method !== 'GET') {
    console.error(`[Activities] Method ${req.method} not allowed`);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await withAuth(async (req, res, user) => {
    try {
      await connectDB();
      
      const { limit } = req.query as Record<string, string>;
      const limitValue = limit ? parseInt(limit) : undefined;
      
      console.log(`[Activities] Fetching activities for user: ${user.userId}, limit: ${limitValue}`);
      const activities = await storage.getActivities(user.userId, limitValue);
      console.log(`[Activities] Found ${activities.length} activities`);
      res.json(activities);
    } catch (error: any) {
      console.error('[Activities] Error:', {
        message: error?.message,
        stack: error?.stack
      });
      res.status(500).json({ 
        message: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  })(req, res);
}
