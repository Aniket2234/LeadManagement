import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../server/lib-vercel/db.js';
import { User } from '../../shared/schema.js';
import { corsHandler, hashPassword, generateToken } from '../../server/lib-vercel/auth.js';
import { insertUserSchema } from '../../shared/schema.js';
import { z } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always handle CORS first
  if (corsHandler(req, res)) return;
  
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    console.log('Register handler started');
    
    await connectDB();
    console.log('Database connected');
    
    const { name, email, password } = insertUserSchema.parse(req.body);
    console.log('Input validated for:', email);
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await hashPassword(password);
    const user = new User({
      name,
      email,
      password: hashedPassword
    });
    await user.save();
    console.log('User created:', user._id);

    const token = generateToken({ userId: user._id.toString(), email: user.email });
    
    return res.status(200).json({
      user: { id: user._id.toString(), name: user.name, email: user.email },
      token
    });
  } catch (error: any) {
    console.error('Register error details:', {
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