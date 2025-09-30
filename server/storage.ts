import mongoose from 'mongoose';
import { 
  User, Lead, Note, Activity, Reminder,
  type IUser, type InsertUser, type ILead, type InsertLead,
  type INote, type InsertNote, type IActivity, type InsertActivity,
  type IReminder, type InsertReminder, type LeadWithNotes
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<IUser | undefined>;
  getUserByEmail(email: string): Promise<IUser | undefined>;
  createUser(user: InsertUser): Promise<IUser>;

  // Leads
  getLeads(userId: string, filters?: {
    search?: string;
    status?: string;
    source?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ leads: ILead[]; total: number }>;
  getLeadById(id: string, userId: string): Promise<LeadWithNotes | undefined>;
  createLead(lead: InsertLead): Promise<ILead>;
  updateLead(id: string, lead: Partial<InsertLead>, userId: string): Promise<ILead | undefined>;
  deleteLead(id: string, userId: string): Promise<boolean>;

  // Notes
  addNote(note: InsertNote): Promise<INote>;
  getLeadNotes(leadId: string, userId: string): Promise<INote[]>;

  // Activities
  addActivity(activity: InsertActivity): Promise<IActivity>;
  getRecentActivities(userId: string, limit?: number): Promise<IActivity[]>;

  // Reminders
  createReminder(reminder: InsertReminder): Promise<IReminder>;
  getReminders(userId: string, filters?: {
    date?: Date;
    overdue?: boolean;
    completed?: boolean;
  }): Promise<IReminder[]>;
  updateReminder(id: string, updates: Partial<InsertReminder>, userId: string): Promise<IReminder | undefined>;
  completeReminder(id: string, userId: string): Promise<boolean>;

  // Analytics
  getLeadMetrics(userId: string): Promise<{
    totalLeads: number;
    newToday: number;
    convertedThisWeek: number;
    lostThisMonth: number;
  }>;
  getLeadsByStatus(userId: string, period?: string): Promise<{ status: string; count: number }[]>;
  getLeadsBySource(userId: string, period?: string): Promise<{ source: string; count: number }[]>;
  getConversionTrend(userId: string, days: number): Promise<{ date: string; count: number }[]>;
  getMetricsTrends(userId: string): Promise<{
    totalLeadsTrend: number;
    newTodayTrend: number;
    convertedWeekTrend: number;
    lostMonthTrend: number;
  }>;
}

export class MongoStorage implements IStorage {
  async getUser(id: string): Promise<IUser | undefined> {
    const user = await User.findById(id);
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<IUser | undefined> {
    const user = await User.findOne({ email });
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<IUser> {
    const user = new User(insertUser);
    await user.save();
    return user;
  }

  async getLeads(userId: string, filters?: {
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

    const query: any = { userId };

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

  async getLeadById(id: string, userId: string): Promise<LeadWithNotes | undefined> {
    const lead = await Lead.findOne({ _id: id, userId });
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

  async createLead(lead: InsertLead): Promise<ILead> {
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
    await this.addActivity({
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

  async updateLead(id: string, leadUpdates: Partial<InsertLead>, userId: string): Promise<ILead | undefined> {
    const existingLead = await Lead.findOne({ _id: id, userId });
    if (!existingLead) return undefined;

    const updates: any = { ...leadUpdates, updatedAt: new Date() };
    
    // If status is being updated, add to status history
    if (leadUpdates.status && leadUpdates.status !== existingLead.status) {
      updates.$push = {
        statusHistory: {
          status: leadUpdates.status,
          changedAt: new Date(),
          changedBy: userId
        }
      };
      
      // Create activity for status change
      await this.addActivity({
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
      await this.addActivity({
        action: 'updated',
        description: `Updated lead: ${existingLead.name}`,
        leadId: id,
        userId: userId,
        metadata: leadUpdates
      });
    }
    
    const lead = await Lead.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true }
    );
    
    if (!lead) return undefined;
    
    return {
      ...lead.toObject(),
      id: lead._id.toString()
    } as any;
  }

  async deleteLead(id: string, userId: string): Promise<boolean> {
    const result = await Lead.deleteOne({ _id: id, userId });
    
    // Also delete related notes, activities, and reminders
    await Promise.all([
      Note.deleteMany({ leadId: id }),
      Activity.deleteMany({ leadId: id }),
      Reminder.deleteMany({ leadId: id })
    ]);

    return result.deletedCount > 0;
  }

  async addNote(note: InsertNote): Promise<INote> {
    const newNote = new Note(note);
    await newNote.save();
    
    // Create activity for note addition
    await this.addActivity({
      action: 'note_added',
      description: `Added note to lead`,
      leadId: note.leadId,
      userId: note.userId,
      metadata: { noteText: note.text.substring(0, 100) + (note.text.length > 100 ? '...' : '') }
    });
    
    return newNote;
  }

  async getLeadNotes(leadId: string, userId: string): Promise<INote[]> {
    const notes = await Note.find({ leadId, userId }).sort({ createdAt: -1 });
    return notes;
  }

  async addActivity(activity: InsertActivity): Promise<IActivity> {
    const newActivity = new Activity(activity);
    await newActivity.save();
    return newActivity;
  }

  async getRecentActivities(userId: string, limit: number = 20): Promise<IActivity[]> {
    const activities = await Activity.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('leadId', 'name');
    return activities;
  }

  async createReminder(reminder: InsertReminder): Promise<IReminder> {
    const newReminder = new Reminder(reminder);
    await newReminder.save();
    return newReminder;
  }

  async getReminders(userId: string, filters?: {
    date?: Date;
    overdue?: boolean;
    completed?: boolean;
  }): Promise<IReminder[]> {
    const query: any = { userId };

    if (filters?.completed !== undefined) {
      query.completed = filters.completed;
    }

    if (filters?.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.dueDate = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    if (filters?.overdue) {
      query.dueDate = { $lt: new Date() };
      query.completed = false;
    }

    const reminders = await Reminder.find(query)
      .sort({ dueDate: 1 })
      .populate('leadId', 'name');
    return reminders;
  }

  async updateReminder(id: string, updates: Partial<InsertReminder>, userId: string): Promise<IReminder | undefined> {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true }
    );
    return reminder || undefined;
  }

  async completeReminder(id: string, userId: string): Promise<boolean> {
    const result = await Reminder.updateOne(
      { _id: id, userId },
      { completed: true }
    );
    return result.modifiedCount > 0;
  }

  async getLeadMetrics(userId: string): Promise<{
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

  async getLeadsByStatus(userId: string, period?: string): Promise<{ status: string; count: number }[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const dateFilter = this.getPeriodFilter(period);
    
    const matchQuery: any = { userId: userObjectId };
    if (dateFilter) {
      matchQuery.createdAt = dateFilter;
    }
    
    const results = await Lead.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } }
    ]);
    
    return results;
  }

  async getLeadsBySource(userId: string, period?: string): Promise<{ source: string; count: number }[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const dateFilter = this.getPeriodFilter(period);
    
    const matchQuery: any = { userId: userObjectId };
    if (dateFilter) {
      matchQuery.createdAt = dateFilter;
    }
    
    const results = await Lead.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $project: { source: '$_id', count: 1, _id: 0 } }
    ]);
    
    return results;
  }

  async getConversionTrend(userId: string, days: number): Promise<{ date: string; count: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await Lead.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: 'Converted',
          updatedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$updatedAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          date: '$_id',
          count: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    return results;
  }

  async getMetricsTrends(userId: string): Promise<{
    totalLeadsTrend: number;
    newTodayTrend: number;
    convertedWeekTrend: number;
    lostMonthTrend: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Current week vs last week
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(startOfThisWeek.getDate() - startOfThisWeek.getDay());
    
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    
    // Current month vs last month
    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Calculate current period metrics
    const [
      totalLeadsThisMonth,
      totalLeadsLastMonth,
      newTodayCurrent,
      newYesterdayCurrent,
      convertedThisWeek,
      convertedLastWeek,
      lostThisMonth,
      lostLastMonth,
    ] = await Promise.all([
      // Total leads trend: this month vs last month
      Lead.countDocuments({ 
        userId: userObjectId, 
        createdAt: { $gte: startOfThisMonth }
      }),
      Lead.countDocuments({ 
        userId: userObjectId, 
        createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
      }),
      // New today vs yesterday
      Lead.countDocuments({ 
        userId: userObjectId, 
        createdAt: { $gte: today, $lt: tomorrow }
      }),
      Lead.countDocuments({ 
        userId: userObjectId, 
        createdAt: { $gte: yesterday, $lt: today }
      }),
      // Converted this week vs last week
      Lead.countDocuments({ 
        userId: userObjectId, 
        status: 'Converted',
        updatedAt: { $gte: startOfThisWeek }
      }),
      Lead.countDocuments({ 
        userId: userObjectId, 
        status: 'Converted',
        updatedAt: { $gte: startOfLastWeek, $lt: startOfThisWeek }
      }),
      // Lost this month vs last month
      Lead.countDocuments({ 
        userId: userObjectId, 
        status: 'Lost',
        updatedAt: { $gte: startOfThisMonth }
      }),
      Lead.countDocuments({ 
        userId: userObjectId, 
        status: 'Lost',
        updatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
      })
    ]);

    // Calculate percentage trends with proper handling of edge cases
    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0 && current === 0) return 0;
      if (previous === 0) return 100; // If previous was 0 and current > 0, it's 100% increase
      if (current === 0) return -100; // If current is 0 and previous > 0, it's 100% decrease
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      totalLeadsTrend: calculateTrend(totalLeadsThisMonth, totalLeadsLastMonth),
      newTodayTrend: calculateTrend(newTodayCurrent, newYesterdayCurrent),
      convertedWeekTrend: calculateTrend(convertedThisWeek, convertedLastWeek),
      lostMonthTrend: calculateTrend(lostThisMonth, lostLastMonth),
    };
  }

  private getPeriodFilter(period?: string) {
    if (!period) return null;
    
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        return { $gte: startDate };
        
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        return { $gte: startDate };
        
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        return { $gte: startDate };
        
      default:
        return null;
    }
  }

  async getMonthlyMetrics(userId: string): Promise<{
    totalLeadsThisMonth: number;
    newLeadsThisMonth: number;
    convertedThisMonth: number;
    lostThisMonth: number;
  }> {
    const startOfThisMonth = new Date();
    startOfThisMonth.setDate(1);
    startOfThisMonth.setHours(0, 0, 0, 0);
    
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    const [totalLeadsThisMonth, newLeadsThisMonth, convertedThisMonth, lostThisMonth] = await Promise.all([
      Lead.countDocuments({ userId: userObjectId }),
      Lead.countDocuments({ 
        userId: userObjectId, 
        createdAt: { $gte: startOfThisMonth }
      }),
      Lead.countDocuments({ 
        userId: userObjectId, 
        status: 'Converted',
        updatedAt: { $gte: startOfThisMonth }
      }),
      Lead.countDocuments({ 
        userId: userObjectId, 
        status: 'Lost',
        updatedAt: { $gte: startOfThisMonth }
      })
    ]);

    return {
      totalLeadsThisMonth,
      newLeadsThisMonth,
      convertedThisMonth,
      lostThisMonth
    };
  }
}

export const storage = new MongoStorage();