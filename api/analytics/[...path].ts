import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../lib/db.js';
import * as storage from '../lib/storage.js';
import { corsHandler, withAuth } from '../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (corsHandler(req, res)) return;
  
  if (req.method !== 'GET') {
    console.error(`[Analytics] Method ${req.method} not allowed for path: ${req.url}`);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await withAuth(async (req, res, user) => {
    try {
      await connectDB();
      
      // Extract the specific analytics endpoint from the URL
      // URL will be like /api/analytics/metrics or /api/analytics/leads-by-status
      const pathMatch = req.url?.match(/\/api\/analytics\/([^?]+)/);
      const endpoint = pathMatch ? pathMatch[1] : '';
      
      console.log(`[Analytics] Processing request for endpoint: ${endpoint}, user: ${user.userId}`);
      
      if (endpoint === 'metrics') {
        const data = await storage.getLeadMetrics(user.userId);
        console.log(`[Analytics] Metrics retrieved successfully`);
        return res.json(data);
      }
      
      if (endpoint === 'leads-by-status') {
        const { period } = req.query as Record<string, string>;
        console.log(`[Analytics] Getting leads by status, period: ${period}`);
        const data = await storage.getLeadsByStatus(user.userId, period);
        return res.json(data);
      }
      
      if (endpoint === 'leads-by-source') {
        const { period } = req.query as Record<string, string>;
        console.log(`[Analytics] Getting leads by source, period: ${period}`);
        const data = await storage.getLeadsBySource(user.userId, period);
        return res.json(data);
      }
      
      if (endpoint === 'conversion-trend') {
        const { days = '30' } = req.query as Record<string, string>;
        console.log(`[Analytics] Getting conversion trend, days: ${days}`);
        const data = await storage.getConversionTrend(user.userId, parseInt(days));
        return res.json(data);
      }
      
      if (endpoint === 'metrics-trends') {
        console.log(`[Analytics] Getting metrics trends`);
        const data = await storage.getMetricsTrends(user.userId);
        return res.json(data);
      }
      
      if (endpoint === 'monthly-metrics') {
        console.log(`[Analytics] Getting monthly metrics`);
        const data = await storage.getMonthlyMetrics(user.userId);
        return res.json(data);
      }
      
      console.error(`[Analytics] Endpoint not found: ${endpoint}, full URL: ${req.url}`);
      return res.status(404).json({ 
        message: 'Analytics endpoint not found',
        requestedEndpoint: endpoint,
        availableEndpoints: ['metrics', 'leads-by-status', 'leads-by-source', 'conversion-trend', 'metrics-trends', 'monthly-metrics']
      });
    } catch (error: any) {
      console.error('[Analytics] Error processing request:', {
        message: error?.message,
        stack: error?.stack,
        endpoint: req.url
      });
      res.status(500).json({ 
        message: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  })(req, res);
}
