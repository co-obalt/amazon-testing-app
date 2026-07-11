import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import axios from 'axios';
import { supabase } from '../config/supabase.js';
import { authenticateToken, AuthenticatedRequest, requireSuperAdmin } from '../middlewares/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ecommerce_Vine_secret_hash_2026_secured';

// Helper function to log geolocation audit trails in background
async function logUserIp(userId: string, ip: string) {
  if (!userId || userId.includes('dev-uuid')) return;
  let country = 'Unknown';
  let city = 'Unknown';

  if (ip !== '127.0.0.1' && ip !== 'localhost') {
    try {
      const geoRes = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 3000 });
      if (geoRes.data && geoRes.data.status === 'success') {
        country = geoRes.data.country || 'Unknown';
        city = geoRes.data.city || 'Unknown';
      }
    } catch (e) {
      console.warn('Geo IP logs lookup failed:', e);
    }
  }

  try {
    // 1. Log to history list
    await supabase.from('ip_logs').insert({
      user_id: userId,
      ip_address: ip,
      city,
      country
    });
    // 2. Set current IP on user profile
    await supabase.from('profiles').update({
      ip_address: ip,
      country,
      city
    }).eq('id', userId);
  } catch (err) {
    console.error('Failed to write IP audit log:', err);
  }
}

// 1. Register Endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, withdrawalPassword, referredBy } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.trim())
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Resolve client IP & geo location info
    let clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    if (clientIp.includes(',')) {
      clientIp = clientIp.split(',')[0].trim();
    }
    if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
      clientIp = '127.0.0.1';
    }

    let country = 'Unknown';
    let city = 'Unknown';

    if (clientIp !== '127.0.0.1' && clientIp !== 'localhost') {
      try {
        const geoRes = await axios.get(`http://ip-api.com/json/${clientIp}`, { timeout: 3000 });
        if (geoRes.data && geoRes.data.status === 'success') {
          country = geoRes.data.country || 'Unknown';
          city = geoRes.data.city || 'Unknown';
        }
      } catch (e) {
        console.warn('Geo IP API request failed:', e);
      }
    } else {
      // In production/sandbox test, if clientIp is localhost, simulate production check or fall back to client IP resolved header
      country = 'Pakistan';
      city = 'Lahore';
    }

    // Generate referral code
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // All new registrations are always regular users, pending admin approval
    // Admin accounts must be created directly in the Supabase database
    const finalPassword = password;
    const finalRole = 'user';
    const finalStatus = 'pending';

    // Insert user profile
    const { data: newUser, error: insertError } = await supabase
      .from('profiles')
      .insert({
        username: username.trim(),
        email: email ? email.trim() : null,
        password: finalPassword,
        withdrawal_password: withdrawalPassword || null,
        role: finalRole,
        country,
        city,
        ip_address: clientIp,
        status: finalStatus,
        referral_code: referralCode,
        referred_by: referredBy || null
      })
      .select()
      .single();

    if (insertError || !newUser) {
      return res.status(500).json({ error: 'Failed to create profile: ' + insertError?.message });
    }

    // Broadcast to connected admins: new registration
    try {
      const { broadcastToAdmins } = await import('../services/wsService.js');
      broadcastToAdmins('new_order', { type: 'signup', username: username.trim(), amount: '0' });
    } catch (wsErr) {
      console.warn('WebSocket registration alert dispatch error:', wsErr);
    }

    // Create default platform balances
    const balances = [
      { user_id: newUser.id, platform: 'Amazon', wallet_balance: 0.00, reviews_count: 0 },
      { user_id: newUser.id, platform: 'Alibaba', wallet_balance: 0.00, reviews_count: 0 },
      { user_id: newUser.id, platform: 'Shopify', wallet_balance: 0.00, reviews_count: 0 }
    ];

    const { error: balanceError } = await supabase
      .from('platform_balances')
      .insert(balances);

    if (balanceError) {
      console.error('Failed to create balances:', balanceError);
    }

    // Capture and log initial IP configuration
    logUserIp(newUser.id, clientIp).catch(err => console.error("Async IP registration log error:", err));

    res.status(201).json({
      message: 'Account successfully registered and queued for approval.',
      status: newUser.status,
      username: newUser.username
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 2. Login Endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Verify Supabase database credentials exist before querying
    const isDbConfigured = process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('your-project-id') &&
                           process.env.SUPABASE_KEY && !process.env.SUPABASE_KEY.includes('your-supabase-anon-key');

    if (!isDbConfigured) {
      return res.status(503).json({ error: 'Database not configured. Please contact the system administrator.' });
    }

    // Fetch user details from Supabase database
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.trim())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check role constraint: user login must NOT login as admin or super_admin
    if (user.role === 'admin' || user.role === 'super_admin') {
      return res.status(403).json({ error: 'Administrative accounts must login through the administrative terminal.' });
    }

    // Verify password — plaintext comparison for all roles
    const isPasswordMatch = password === user.password;

    if (!isPasswordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.status === 'restricted') {
      return res.status(403).json({ error: 'Account has been restricted. Please contact customer service.' });
    }

    // Sign session JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Capture requester IP address and trigger audit logging
    let clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    if (clientIp.includes(',')) clientIp = clientIp.split(',')[0].trim();
    if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') clientIp = '127.0.0.1';

    logUserIp(user.id, clientIp).catch(err => console.error("Async login IP log error:", err));

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        referralCode: user.referral_code
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 3. User Details Endpoint
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Fetch profile from database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Active reviewer profile not found.' });
    }

    // Fetch platform balances
    const { data: balancesData } = await supabase
      .from('platform_balances')
      .select('platform, wallet_balance, reviews_count')
      .eq('user_id', userId);

    const formattedBalances: any = {
      Amazon: { walletBalance: 0.00, completedReviewsCount: 0 },
      Alibaba: { walletBalance: 0.00, completedReviewsCount: 0 },
      Shopify: { walletBalance: 0.00, completedReviewsCount: 0 }
    };

    if (balancesData) {
      balancesData.forEach((b: any) => {
        if (formattedBalances[b.platform]) {
          formattedBalances[b.platform] = {
            walletBalance: parseFloat(b.wallet_balance as any) || 0.00,
            completedReviewsCount: b.reviews_count || 0
          };
        }
      });
    }

    // Fetch global system config (deposit addresses, links, notification banner text)
    const { data: configRows } = await supabase
      .from('system_config')
      .select('key, value');

    const configMap: any = {};
    if (configRows) {
      configRows.forEach((row: any) => {
        configMap[row.key] = row.value;
      });
    }

    res.json({
      id: profile.id,
      username: profile.username,
      role: profile.role,
      status: profile.status,
      country: profile.country,
      city: profile.city,
      referralCode: profile.referral_code,
      referredBy: profile.referred_by,
      balances: formattedBalances,
      systemConfig: configMap
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 4. USDT Bind Endpoint
router.post('/bind-usdt', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { address } = req.body;

    if (!address || address.trim() === '') {
      return res.status(400).json({ error: 'Address is required' });
    }

    // 1. Fetch current profile to verify lock constraint
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('bound_usdt_address')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profile.bound_usdt_address && profile.bound_usdt_address.trim() !== '') {
      return res.status(400).json({ error: 'USDT Address is already bound and locked.' });
    }

    // 2. Perform bind update
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ bound_usdt_address: address.trim() })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to bind address: ' + updateError.message });
    }

    res.json({ success: true, message: 'USDT Withdrawal Address successfully bound and locked.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 5. Developer Test Registration Override Approval Endpoint
router.post('/override-approve', async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('username', username.trim());

    if (error) {
      return res.status(500).json({ error: 'Failed to override approval: ' + error.message });
    }

    res.json({ success: true, message: 'Developer status override: Account activated.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// ==========================================
// 6. Admin Panel Separate Auth endpoints
// ==========================================

// Admin Registration Flow (request sent to super_admin as pending)
router.post('/admin/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if username already exists in profiles
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.trim())
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const referralCode = 'ADMIN-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    // Create the admin profile in pending state (no automatic bypass)
    const { data: newAdmin, error: insertError } = await supabase
      .from('profiles')
      .insert({
        username: username.trim(),
        password: password, // plaintext
        role: 'admin',
        status: 'pending',
        referral_code: referralCode,
        referred_by: null
      })
      .select()
      .single();

    if (insertError || !newAdmin) {
      return res.status(500).json({ error: 'Failed to request admin registration: ' + insertError?.message });
    }

    res.status(201).json({
      message: 'Admin registration request successfully submitted. Awaiting Super Admin authorization.',
      username: newAdmin.username
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Admin Login Endpoint (must be role=admin and status=active)
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.trim())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid admin username or password' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Requires administrator credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your admin account request is still pending Super Admin approval.' });
    }

    if (password !== user.password) {
      return res.status(401).json({ error: 'Invalid admin username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// ==========================================
// 7. Super Admin Auth & Control endpoints
// ==========================================

// Super Admin Login
router.post('/super/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: superAdmin, error } = await supabase
      .from('super_admin')
      .select('*')
      .eq('email', email.trim())
      .single();

    if (error || !superAdmin) {
      return res.status(401).json({ error: 'Invalid super admin credentials' });
    }

    if (password !== superAdmin.password) {
      return res.status(401).json({ error: 'Invalid super admin credentials' });
    }

    const token = jwt.sign(
      { id: superAdmin.id, username: superAdmin.email, role: 'super_admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: superAdmin.id,
        username: superAdmin.email,
        role: 'super_admin'
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get all admin accounts
router.get('/super/admins', authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: admins, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch admin accounts: ' + error.message });
    }

    res.json(admins);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Approve admin account
router.post('/super/admins/:id/approve', authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', id)
      .eq('role', 'admin');

    if (error) {
      return res.status(500).json({ error: 'Failed to approve admin account: ' + error.message });
    }

    res.json({ success: true, message: 'Admin account approved successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Reject/Delete admin account
router.delete('/super/admins/:id', authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)
      .eq('role', 'admin');

    if (error) {
      return res.status(500).json({ error: 'Failed to delete admin account: ' + error.message });
    }

    res.json({ success: true, message: 'Admin account deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Reset admin password
router.post('/super/admins/:id/reset-password', authenticateToken, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.trim() === '') {
      return res.status(400).json({ error: 'New password is required' });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ password: password.trim() })
      .eq('id', id)
      .eq('role', 'admin');

    if (error) {
      return res.status(500).json({ error: 'Failed to reset password: ' + error.message });
    }

    res.json({ success: true, message: 'Admin password reset successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
