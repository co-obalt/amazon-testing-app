import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { supabase } from '../config/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ecommerce_Vine_secret_hash_2026_secured';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    isRestricted?: boolean;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    const userPayload = decoded as { id: string; username: string; role: string; isRestricted?: boolean };
    
    try {
      if (userPayload.role === 'admin') {
        const { data: adminUser, error: adminErr } = await supabase
          .from('admins')
          .select('status')
          .eq('id', userPayload.id)
          .maybeSingle();

        if (adminErr || !adminUser || adminUser.status !== 'active') {
          return res.status(403).json({ error: 'Administrative privileges are suspended or inactive.' });
        }
      } else if (userPayload.role === 'user') {
        const { data: userProfile, error: profileErr } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', userPayload.id)
          .maybeSingle();

        if (profileErr || !userProfile || userProfile.status === 'restricted') {
          return res.status(403).json({ error: 'Account has been restricted. Please contact customer service.' });
        }
      }
    } catch (err) {
      console.error('Middleware token check DB error:', err);
    }

    req.user = userPayload;
    next();
  });
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Administrative privileges required' });
  }
  next();
}

export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super Administrative privileges required' });
  }
  next();
}
