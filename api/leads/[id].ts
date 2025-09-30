import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../lib/db.js';
import * as storage from '../lib/storage.js';
import { corsHandler, withAuth } from '../lib/auth.js';
import { insertLeadSchema, insertNoteSchema } from '../../shared/schema.js';
import { z } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (corsHandler(req, res)) return;
  
  const pathParts = req.url?.split('?')[0].split('/') || [];
  const id = pathParts[3]; // /api/leads/[id]
  const subPath = pathParts[4]; // notes

  console.log(`[Lead ${req.method}] ID: ${id}, subPath: ${subPath}, URL: ${req.url}`);

  await withAuth(async (req, res, user) => {
    try {
      await connectDB();
      
      // Handle /api/leads/[id]/notes
      if (subPath === 'notes') {
        if (req.method === 'GET') {
          console.log(`[Lead Notes GET] Fetching notes for lead: ${id}`);
          const notes = await storage.getLeadNotes(id);
          console.log(`[Lead Notes GET] Found ${notes.length} notes`);
          return res.json(notes);
        } else if (req.method === 'POST') {
          console.log(`[Lead Notes POST] Adding note to lead: ${id}`);
          const noteData = insertNoteSchema.parse({
            ...req.body,
            leadId: id,
            userId: user.userId
          });
          const note = await storage.addNote(noteData);
          console.log(`[Lead Notes POST] Note added: ${note._id}`);
          return res.status(201).json(note);
        }
        console.error(`[Lead Notes] Method ${req.method} not allowed`);
        return res.status(405).json({ message: 'Method not allowed' });
      }

      // Handle /api/leads/[id]
      if (req.method === 'GET') {
        console.log(`[Lead GET] Fetching lead: ${id} for user: ${user.userId}`);
        const lead = await storage.getLeadById(id, user.userId);
        if (!lead) {
          console.error(`[Lead GET] Lead not found: ${id}`);
          return res.status(404).json({ message: "Lead not found" });
        }
        console.log(`[Lead GET] Successfully retrieved lead: ${id}`);
        return res.json(lead);
      }
      
      if (req.method === 'PUT') {
        console.log(`[Lead PUT] Updating lead: ${id}`);
        const updates = insertLeadSchema.partial().parse(req.body);
        const lead = await storage.updateLead(id, updates, user.userId);
        if (!lead) {
          console.error(`[Lead PUT] Lead not found: ${id}`);
          return res.status(404).json({ message: "Lead not found" });
        }
        console.log(`[Lead PUT] Successfully updated lead: ${id}`);
        return res.json(lead);
      }
      
      if (req.method === 'DELETE') {
        console.log(`[Lead DELETE] Deleting lead: ${id}`);
        const success = await storage.deleteLead(id, user.userId);
        if (!success) {
          console.error(`[Lead DELETE] Lead not found: ${id}`);
          return res.status(404).json({ message: "Lead not found" });
        }
        console.log(`[Lead DELETE] Successfully deleted lead: ${id}`);
        return res.json({ message: "Lead deleted successfully" });
      }
      
      console.error(`[Lead] Method ${req.method} not allowed`);
      return res.status(405).json({ message: 'Method not allowed' });
    } catch (error: any) {
      console.error('[Lead Operation] Error:', {
        message: error?.message,
        stack: error?.stack,
        leadId: id
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