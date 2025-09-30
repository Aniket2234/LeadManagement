import mongoose from 'mongoose';
import { 
  User, Lead, Note, Activity, Reminder,
  type IUser, type InsertUser, type ILead, type InsertLead,
  type INote, type InsertNote, type IActivity, type InsertActivity,
  type IReminder, type InsertReminder, type LeadWithNotes
} from "../../shared/schema.js";

// Users
export async function getUser(id: string): Promise<IUser | undefined> {
  const user = await User.findById(id);
  return user || undefined;
}

export async function getUserByEmail(email: string): Promise<IUser | undefined> {
  const user = await User.findOne({ email });
  return user || undefined;
}

export async function createUser(insertUser: InsertUser): Promise<IUser> {
  const user = new User(insertUser);
  await user.save();
  return user;
}

// Leads
export async function getLeads(userId: string, filters?: {
  search?: string;
  status?: string;
  source?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}): Promise<{ leads: ILead[]; total: number }> {
  const page = filters?.page || 1;
  const limit = filters?.limit || 10;
  const skip = (page - 1) * limit;

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const query: any = { userId: userObjectId };

  if (filters?.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } },
      { phone: { $regex: filters.search, $options: 'i' } }
    ];
  }

  if (filters?.status) {
    query.status = filters.status;
  }

  if (filters?.source) {
    query.source = filters.source;
  }

  if (filters?.startDate || filters?.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = filters.startDate;
    }
    if (filters.endDate) {
      query.createdAt.$lte = filters.endDate;
    }
  }

  const [leads, total] = await Promise.all([
    Lead.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Lead.countDocuments(query)
  ]);

  // Transform _id to id for frontend compatibility
  const transformedLeads = leads.map(lead => ({
    ...lead.toObject(),
    id: lead._id.toString()
  })) as any[];

  return { leads: transformedLeads, total };
}

export async function getLeadById(id: string, userId: string): Promise<LeadWithNotes | undefined> {
  const leadObjectId = new mongoose.Types.ObjectId(id);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const lead = await Lead.findOne({ _id: leadObjectId, userId: userObjectId });
  if (!lead) return undefined;

  const [notes, activities, reminders] = await Promise.all([
    Note.find({ leadId: id }).sort({ createdAt: -1 }),
    Activity.find({ leadId: id }).sort({ createdAt: -1 }),
    Reminder.find({ leadId: id }).sort({ createdAt: -1 })
  ]);

  return {
    ...lead.toObject(),
    id: lead._id.toString(),
    notes,
    activities,
    reminders
  } as any;
}

export async function createLead(lead: InsertLead): Promise<ILead> {
  const newLead = new Lead({
    ...lead,
    statusHistory: [{
      status: lead.status || 'New',
      changedAt: new Date(),
      changedBy: lead.userId
    }],
    updatedAt: new Date()
  });
  await newLead.save();
  
  // Create activity for lead creation
  await addActivity({
    action: 'created',
    description: `Created new lead: ${lead.name}`,
    leadId: newLead._id.toString(),
    userId: lead.userId,
    metadata: { source: lead.source, status: lead.status || 'New' }
  });
  
  return {
    ...newLead.toObject(),
    id: newLead._id.toString()
  } as any;
}

export async function updateLead(id: string, leadUpdates: Partial<InsertLead>, userId: string): Promise<ILead | undefined> {
  const leadObjectId = new mongoose.Types.ObjectId(id);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const existingLead = await Lead.findOne({ _id: leadObjectId, userId: userObjectId });
  if (!existingLead) return undefined;

  const updateDoc: any = { 
    $set: { ...leadUpdates, updatedAt: new Date() } 
  };
  
  // If status is being updated, add to status history
  if (leadUpdates.status && leadUpdates.status !== existingLead.status) {
    updateDoc.$push = {
      statusHistory: {
        status: leadUpdates.status,
        changedAt: new Date(),
        changedBy: userId
      }
    };
    
    // Create activity for status change
    await addActivity({
      action: 'status_changed',
      description: `Changed status from ${existingLead.status} to ${leadUpdates.status}`,
      leadId: id,
      userId: userId,
      metadata: { 
        oldStatus: existingLead.status, 
        newStatus: leadUpdates.status 
      }
    });
  } else {
    // Create activity for general update
    await addActivity({
      action: 'updated',
      description: `Updated lead: ${existingLead.name}`,
      leadId: id,
      userId: userId,
      metadata: leadUpdates
    });
  }
  
  const lead = await Lead.findOneAndUpdate(
    { _id: leadObjectId, userId: userObjectId },
    updateDoc,
    { new: true }
  );
  
  if (!lead) return undefined;
  
  return {
    ...lead.toObject(),
    id: lead._id.toString()
  } as any;
}

export async function deleteLead(id: string, userId: string): Promise<boolean> {
  const leadObjectId = new mongoose.Types.ObjectId(id);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const result = await Lead.deleteOne({ _id: leadObjectId, userId: userObjectId });
  
  // Also delete related notes, activities, and reminders
  await Promise.all([
    Note.deleteMany({ leadId: id }),
    Activity.deleteMany({ leadId: id }),
    Reminder.deleteMany({ leadId: id })
  ]);

  return result.deletedCount > 0;
}

// Notes
export async function getLeadNotes(leadId: string): Promise<INote[]> {
  const notes = await Note.find({ leadId }).sort({ createdAt: -1 });
  return notes;
}

export async function addNote(note: InsertNote): Promise<INote> {
  const newNote = new Note(note);
  await newNote.save();
  
  // Create activity for note addition
  await addActivity({
    action: 'note_added',
    description: `Added note to lead`,
    leadId: note.leadId,
    userId: note.userId,
    metadata: { noteText: note.text }
  });
  
  return newNote;
}

// Activities
export async function getActivities(userId: string, limit?: number): Promise<IActivity[]> {
  const query = Activity.find({ userId }).sort({ createdAt: -1 });
  if (limit) query.limit(limit);
  const activities = await query.exec();
  return activities;
}

export async function addActivity(activity: InsertActivity): Promise<IActivity> {
  const newActivity = new Activity(activity);
  await newActivity.save();
  return newActivity;
}

// Reminders
export async function getReminders(userId: string, filters?: {
  date?: Date;
  completed?: boolean;
}): Promise<IReminder[]> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const query: any = { userId: userObjectId };

  if (filters?.completed !== undefined) {
    query.completed = filters.completed;
  }

  if (filters?.date) {
    const startOfDay = new Date(filters.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(filters.date);
    endOfDay.setHours(23, 59, 59, 999);
    query.dueDate = { $gte: startOfDay, $lte: endOfDay };
  }

  const reminders = await Reminder.find(query)
    .sort({ dueDate: 1 })
    .populate('leadId', 'name');
  
  return reminders;
}

export async function createReminder(reminder: InsertReminder): Promise<IReminder> {
  const newReminder = new Reminder(reminder);
  await newReminder.save();
  return newReminder;
}

export async function updateReminder(id: string, updates: Partial<InsertReminder>, userId: string): Promise<IReminder | undefined> {
  const reminderObjectId = new mongoose.Types.ObjectId(id);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  const reminder = await Reminder.findOneAndUpdate(
    { _id: reminderObjectId, userId: userObjectId },
    { $set: updates },
    { new: true }
  );
  
  return reminder || undefined;
}

export async function completeReminder(id: string, userId: string): Promise<IReminder | undefined> {
  return updateReminder(id, { completed: true }, userId);
}

// Analytics
export async function getLeadMetrics(userId: string): Promise<{
  totalLeads: number;
  newToday: number;
  convertedThisWeek: number;
  lostThisMonth: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const startOfWeek = new Date(today);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start of current week
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const [totalLeads, newToday, convertedThisWeek, lostThisMonth] = await Promise.all([
    Lead.countDocuments({ userId: userObjectId }),
    Lead.countDocuments({ 
      userId: userObjectId, 
      createdAt: { $gte: today, $lt: tomorrow }
    }),
    Lead.countDocuments({ 
      userId: userObjectId, 
      status: 'Converted',
      updatedAt: { $gte: startOfWeek }
    }),
    Lead.countDocuments({ 
      userId: userObjectId, 
      status: 'Lost',
      updatedAt: { $gte: startOfMonth }
    })
  ]);

  return {
    totalLeads,
    newToday,
    convertedThisWeek,
    lostThisMonth
  };
}

export async function getLeadsByStatus(userId: string, period: string = 'month') {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  const results = await Lead.aggregate([
    { $match: { userId: userObjectId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  return results.map(r => ({ status: r._id, count: r.count }));
}

export async function getLeadsBySource(userId: string, period: string = 'month') {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  const results = await Lead.aggregate([
    { $match: { userId: userObjectId } },
    { $group: { _id: '$source', count: { $sum: 1 } } }
  ]);

  return results.map(r => ({ source: r._id, count: r.count }));
}

export async function getConversionTrend(userId: string, days: number = 90) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const results = await Lead.aggregate([
    { 
      $match: { 
        userId: userObjectId,
        createdAt: { $gte: startDate }
      } 
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);

  return results.map(r => ({ 
    date: r._id.date, 
    status: r._id.status, 
    count: r.count 
  }));
}

export async function getMetricsTrends(userId: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const [totalLeads, newLeads, convertedLeads] = await Promise.all([
    Lead.countDocuments({ userId: userObjectId }),
    Lead.countDocuments({ 
      userId: userObjectId,
      createdAt: { $gte: last30Days }
    }),
    Lead.countDocuments({ 
      userId: userObjectId,
      status: 'Converted',
      updatedAt: { $gte: last30Days }
    })
  ]);

  const conversionRate = totalLeads > 0 
    ? ((convertedLeads / totalLeads) * 100).toFixed(1)
    : '0.0';

  return {
    totalLeads,
    newLeads,
    convertedLeads,
    conversionRate: parseFloat(conversionRate)
  };
}

export async function getMonthlyMetrics(userId: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const results = await Lead.aggregate([
    { 
      $match: { 
        userId: userObjectId,
        createdAt: { $gte: startOfMonth }
      } 
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  return results.map(r => ({ date: r._id, count: r.count }));
}
