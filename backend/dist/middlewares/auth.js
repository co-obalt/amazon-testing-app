import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
const JWT_SECRET = process.env.JWT_SECRET || 'ecommerce_Vine_secret_hash_2026_secured';
// In-memory status check cache to optimize parallel requests latency
const statusCache = {};
const CACHE_TTL_MS = 8000; // Cache status verification for 8 seconds
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access token missing' });
    }
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        const userPayload = decoded;
        const now = Date.now();
        try {
            if (userPayload.role === 'admin') {
                const cached = statusCache[userPayload.id];
                let status = '';
                if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
                    status = cached.status;
                }
                else {
                    const { data: adminUser, error: adminErr } = await supabase
                        .from('admins')
                        .select('status')
                        .eq('id', userPayload.id)
                        .maybeSingle();
                    if (!adminErr && adminUser) {
                        status = adminUser.status;
                        statusCache[userPayload.id] = { status, timestamp: now };
                    }
                }
                if (status !== 'active') {
                    return res.status(403).json({ error: 'Administrative privileges are suspended or inactive.' });
                }
            }
            else if (userPayload.role === 'user') {
                const cached = statusCache[userPayload.id];
                let status = '';
                if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
                    status = cached.status;
                }
                else {
                    const { data: userProfile, error: profileErr } = await supabase
                        .from('profiles')
                        .select('status')
                        .eq('id', userPayload.id)
                        .maybeSingle();
                    if (!profileErr && userProfile) {
                        status = userProfile.status || '';
                        statusCache[userPayload.id] = { status, timestamp: now };
                    }
                }
                if (status === 'restricted') {
                    return res.status(403).json({ error: 'Account has been restricted. Please contact customer service.' });
                }
            }
        }
        catch (err) {
            console.error('Middleware token check DB error:', err);
        }
        req.user = userPayload;
        next();
    });
}
export function requireAdmin(req, res, next) {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        return res.status(403).json({ error: 'Administrative privileges required' });
    }
    next();
}
export function requireSuperAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Super Administrative privileges required' });
    }
    next();
}
