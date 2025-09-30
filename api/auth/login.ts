import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../lib/db.js';
import { User } from '../../shared/schema.js';
import { corsHandler, verifyPassword, generateToken } from '../lib/auth.js';
import { loginSchema } from '../../shared/schema.js';
import { z } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always handle CORS first
  if (corsHandler(req, res)) return;
  
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    console.log('Login handler started');
    
    await connectDB();
    console.log('Database connected');
    
    const { email, password } = loginSchema.parse(req.body);
    console.log('Login attempt for:', email);
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken({ userId: user._id.toString(), email: user.email });
    
    return res.status(200).json({
      user: { id: user._id.toString(), name: user.name, email: user.email },
      token
    });
  } catch (error: any) {
    console.error('Login error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    
    // Return proper JSON error response
    return res.status(500).json({ 
      message: error?.message || "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}