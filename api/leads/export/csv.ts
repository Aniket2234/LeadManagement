import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../lib/db.js';
import * as storage from '../../lib/storage.js';
import { corsHandler, withAuth } from '../../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (corsHandler(req, res)) return;
  
  if (req.method !== 'GET') {
    console.error(`[Export CSV] Method ${req.method} not allowed`);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await withAuth(async (req, res, user) => {
    try {
      await connectDB();
      
      console.log(`[Export CSV] Exporting leads for user: ${user.userId}`);
      
      const { leads } = await storage.getLeads(user.userId, { limit: 10000 });
      
      console.log(`[Export CSV] Found ${leads.length} leads to export`);
      
      const csvHeaders = "Name,Email,Phone,Company,Source,Status,Created At\n";
      const csvData = leads.map(lead => 
        `"${lead.name}","${lead.email || ''}","${lead.phone || ''}","${lead.company || ''}","${lead.source}","${lead.status}","${lead.createdAt?.toISOString ? lead.createdAt.toISOString() : lead.createdAt}"`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
      res.status(200).send(csvHeaders + csvData);
      
      console.log(`[Export CSV] Successfully exported ${leads.length} leads`);
    } catch (error: any) {
      console.error('[Export CSV] Error processing request:', {
        message: error?.message,
        stack: error?.stack
      });
      res.status(500).json({ 
        message: "Failed to export leads",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  })(req, res);
}
