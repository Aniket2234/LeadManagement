import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../server/lib-vercel/db.js';
import { User } from '../../shared/schema.js';
import { corsHandler, withAuth } from '../../server/lib-vercel/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (corsHandler(req, res)) return;
  
  if (req.method !== 'GET') {
    console.error(`[Auth Me] Method ${req.method} not allowed`);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await withAuth(async (req, res, user) => {
    try {
      await connectDB();
      
      console.log(`[Auth Me] Fetching user data for: ${user.userId}`);
      
      const userData = await User.findById(user.userId);
      if (!userData) {
        console.error(`[Auth Me] User not found: ${user.userId}`);
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`[Auth Me] Successfully retrieved user: ${userData.email}`);
      res.json({
        user: { 
          id: userData._id.toString(), 
          name: userData.name, 
          email: userData.email 
        }
      });
    } catch (error: any) {
      console.error('[Auth Me] Error:', {
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