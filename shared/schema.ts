import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// MongoDB Schema Definitions
const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const leadSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  company: { type: String },
  source: { 
    type: String, 
    required: true,
    enum: ['Website', 'Referral', 'Ad', 'Other']
  },
  status: { 
    type: String, 
    required: true, 
    default: 'New',
    enum: ['New', 'Contacted', 'Qualified', 'Converted', 'Lost']
  },
  tags: { type: [String], default: [] },
  statusHistory: [{
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
});

const noteSchema = new Schema({
  text: { type: String, required: true },
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

const activitySchema = new Schema({
  action: { 
    type: String, 
    required: true,
    enum: ['created', 'updated', 'status_changed', 'note_added']
  },
  description: { type: String, required: true },
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

const reminderSchema = new Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  dueDate: { type: Date, required: true },
  completed: { type: Boolean, default: false },
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

// Document Interfaces
export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

export interface ILead extends Document {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source: 'Website' | 'Referral' | 'Ad' | 'Other';
  status: 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost';
  tags: string[];
  statusHistory: Array<{
    status: string;
    changedAt: Date;
    changedBy?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface INote extends Document {
  _id: string;
  text: string;
  leadId: string;
  userId: string;
  createdAt: Date;
}

export interface IActivity extends Document {
  _id: string;
  action: 'created' | 'updated' | 'status_changed' | 'note_added';
  description: string;
  leadId?: string;
  userId: string;
  metadata?: any;
  createdAt: Date;
}

export interface IReminder extends Document {
  _id: string;
  title: string;
  message: string;
  dueDate: Date;
  completed: boolean;
  leadId: string;
  userId: string;
  createdAt: Date;
}

// MongoDB Models
export const User = mongoose.model<IUser>('User', userSchema);
export const Lead = mongoose.model<ILead>('Lead', leadSchema);
export const Note = mongoose.model<INote>('Note', noteSchema);
export const Activity = mongoose.model<IActivity>('Activity', activitySchema);
export const Reminder = mongoose.model<IReminder>('Reminder', reminderSchema);

// Zod validation schemas
export const insertUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

export const insertLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.enum(['Website', 'Referral', 'Ad', 'Other']),
  status: z.enum(['New', 'Contacted', 'Qualified', 'Converted', 'Lost']).default('New'),
  tags: z.array(z.string()).default([]),
  userId: z.string(),
});

export const insertNoteSchema = z.object({
  text: z.string().min(1),
  leadId: z.string(),
  userId: z.string(),
});

export const insertActivitySchema = z.object({
  action: z.enum(['created', 'updated', 'status_changed', 'note_added']),
  description: z.string().min(1),
  leadId: z.string().optional(),
  userId: z.string(),
  metadata: z.any().optional(),
});

export const insertReminderSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  dueDate: z.string().transform((val) => new Date(val)),
  completed: z.boolean().default(false),
  leadId: z.string(),
  userId: z.string(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Type exports for compatibility
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type LoginData = z.infer<typeof loginSchema>;

export type LeadWithNotes = ILead & {
  notes: INote[];
  activities: IActivity[];
  reminders: IReminder[];
};

// For backward compatibility, create aliases
export type User = IUser;
export type Lead = ILead;
export type Note = INote;
export type Activity = IActivity;
export type Reminder = IReminder;