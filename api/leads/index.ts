import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../server/lib-vercel/db.js';
import * as storage from '../../server/lib-vercel/storage.js';
import { corsHandler, withAuth } from '../../server/lib-vercel/auth.js';
import { insertLeadSchema } from '../../shared/schema.js';
import { z } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (corsHandler(req, res)) return;
  
  if (req.method === 'GET') {
    // Get leads
    await withAuth(async (req, res, user) => {
      try {
        await connectDB();
        
        const {
          search,
          status,
          source,
          startDate,
          endDate,
          page = '1',
          limit = '10'
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

        console.log(`[Leads GET] Fetching leads for user: ${user.userId}, filters:`, filters);
        const result = await storage.getLeads(user.userId, filters);
        console.log(`[Leads GET] Found ${result.leads.length} leads, total: ${result.total}`);
        res.json(result);
      } catch (error: any) {
        console.error('[Leads GET] Error:', {
          message: error?.message,
          stack: error?.stack
        });
        res.status(500).json({ 
          message: "Internal server error",
          details: process.env.NODE_ENV === 'development' ? error?.message : undefined
        });
      }
    })(req, res);
  } else if (req.method === 'POST') {
    // Create lead
    await withAuth(async (req, res, user) => {
      try {
        await connectDB();
        
        console.log(`[Leads POST] Creating lead for user: ${user.userId}`);
        const leadData = insertLeadSchema.parse({
          ...req.body,
          userId: user.userId
        });

        const lead = await storage.createLead(leadData);
        console.log(`[Leads POST] Successfully created lead: ${lead._id}`);
        res.status(201).json(lead);
      } catch (error: any) {
        console.error('[Leads POST] Error:', {
          message: error?.message,
          stack: error?.stack
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
  } else {
    console.error(`[Leads] Method ${req.method} not allowed`);
    res.status(405).json({ message: 'Method not allowed' });
  }
}