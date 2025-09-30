import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../../server/lib-vercel/db.js';
import * as storage from '../../../server/lib-vercel/storage.js';
import { corsHandler, withAuth } from '../../../server/lib-vercel/auth.js';
import { insertNoteSchema } from '../../../shared/schema.js';
import { z } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[Lead Notes] ========== NEW REQUEST ==========`);
  console.log(`[Lead Notes] Method: ${req.method}`);
  console.log(`[Lead Notes] URL: ${req.url}`);
  console.log(`[Lead Notes] Query:`, req.query);
  
  if (corsHandler(req, res)) {
    console.log(`[Lead Notes] CORS preflight handled`);
    return;
  }

  await withAuth(async (req, res, user) => {
    try {
      console.log(`[Lead Notes] Auth successful for user: ${user.userId}`);
      await connectDB();
      console.log(`[Lead Notes] DB connected`);
      
      // Extract lead ID from query (Vercel passes dynamic segments as query params)
      const leadId = req.query.id as string;
      console.log(`[Lead Notes] Lead ID: ${leadId}`);
      
      if (!leadId || leadId === 'undefined') {
        console.error(`[Lead Notes] Invalid lead ID: ${leadId}`);
        return res.status(400).json({ 
          message: "Invalid lead ID",
          receivedId: leadId
        });
      }
      
      // GET /api/leads/[id]/notes - Get all notes for a lead
      if (req.method === 'GET') {
        console.log(`[Lead Notes] Fetching notes for lead: ${leadId}`);
        const notes = await storage.getLeadNotes(leadId, user.userId);
        console.log(`[Lead Notes] Found ${notes.length} notes`);
        return res.json(notes);
      }
      
      // POST /api/leads/[id]/notes - Add a note to a lead
      if (req.method === 'POST') {
        console.log(`[Lead Notes] Adding note to lead: ${leadId} with body:`, req.body);
        
        // Verify the lead belongs to the current user
        const leadExists = await storage.getLeadById(leadId, user.userId);
        if (!leadExists) {
          console.error(`[Lead Notes] Lead not found: ${leadId}`);
          return res.status(404).json({ message: "Lead not found" });
        }
        
        const noteData = insertNoteSchema.parse({
          ...req.body,
          leadId: leadId,
          userId: user.userId
        });
        console.log(`[Lead Notes] Validated note data:`, noteData);
        
        const note = await storage.addNote(noteData);
        console.log(`[Lead Notes] Created note with ID: ${note._id}`);
        return res.status(201).json(note);
      }
      
      console.log(`[Lead Notes] Method ${req.method} not allowed`);
      return res.status(405).json({ 
        message: 'Method not allowed',
        allowedMethods: ['GET', 'POST'],
        receivedMethod: req.method
      });
    } catch (error: any) {
      console.error('[Lead Notes] ERROR:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      
      if (error instanceof z.ZodError) {
        console.error('[Lead Notes] Validation errors:', error.errors);
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      return res.status(500).json({ 
        message: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  })(req, res);
}
