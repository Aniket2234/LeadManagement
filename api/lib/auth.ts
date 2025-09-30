import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { User } from "../../shared/schema.js";
import { connectDB } from './db.js';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not set in environment variables');
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, getJwtSecret());
  return decoded as JwtPayload;
}

export async function authenticateRequest(req: VercelRequest): Promise<JwtPayload | null> {
  const authHeader = req.headers.authorization as string;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return null;
  }

  try {
    await connectDB();
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

export function withAuth(handler: (req: VercelRequest, res: VercelResponse, user: JwtPayload) => Promise<any>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      const user = await authenticateRequest(req);
      
      if (!user) {
        return res.status(401).json({ message: "Access token required" });
      }

      return await handler(req, res, user);
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

export function corsHandler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  
  return false;
}