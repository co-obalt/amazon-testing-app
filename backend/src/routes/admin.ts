import express, { Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middlewares/auth.js';
import { mockChatMessages } from '../config/sandboxStore.js';
import { broadcastToUser, broadcastToAdmins } from '../services/wsService.js';
import { getCache, setCache, clearCache } from '../services/cacheService.js';

const router = express.Router();

const isDbConfigured = process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('your-project-id') &&
                       process.env.SUPABASE_KEY && !process.env.SUPABASE_KEY.includes('your-supabase-anon-key');

// Helper function to log administrative actions to the admin_audit database table
async function logAdminAction(adminId: string, action: string, targetUserId: string | null, details: string, req: AuthenticatedRequest) {
  try {
    let ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    if (ipAddress.includes(',')) ipAddress = ipAddress.split(',')[0].trim();
    if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') ipAddress = '127.0.0.1';

    const { error } = await supabase.from('admin_audit').insert({
      admin_id: adminId,
      action,
      target_user_id: targetUserId,
      details,
      ip_address: ipAddress
    });

    if (error) {
      console.warn("admin_audit logging warning (migration might not be applied yet):", error.message);
    }
  } catch (err) {
    console.error("Failed to log admin action:", err);
  }
}

// Apply admin access check middleware to all routes in this file
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cachedStats = getCache('stats');
    if (cachedStats) {
      return res.json(cachedStats);
    }

    let totalUsers = 0;
    let activeUsers = 0;
    let totalDeposited = 0.0;
    let totalWithdrawn = 0.0;
    let pendingApprovals = 0;
    let feed: any[] = [];

    const userGrowth: { label: string, count: number }[] = [];
    const dailyDeposits: { label: string, amount: number }[] = [];
    const dailyWithdrawals: { label: string, amount: number }[] = [];

    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      userGrowth.push({ label, count: 0 });
      dailyDeposits.push({ label, amount: 0 });
      dailyWithdrawals.push({ label, amount: 0 });
    }

    if (!isDbConfigured) {
      totalUsers = 8;
      activeUsers = 5;
      totalDeposited = 2400.00;
      totalWithdrawn = 1100.00;
      pendingApprovals = 3;
      feed = [
        { type: 'signup', text: 'New registration request: developer_test', date: '2026-07-11T10:00:00.000Z' },
        { type: 'deposit', text: 'User developer_test submitted deposit $20.00 (Pending)', date: '2026-07-11T10:01:00.000Z' },
        { type: 'withdrawal', text: 'User tester_account requested withdrawal $50.00 (Pending)', date: '2026-07-11T10:02:00.000Z' },
        { type: 'review', text: 'User developer_test submitted review for "Amazon Product" (Pending)', date: '2026-07-11T10:03:00.000Z' }
      ];
      // Mock metrics for fallback matching
      userGrowth[4].count = 1;
      userGrowth[5].count = 3;
      userGrowth[6].count = 2;
      dailyDeposits[4].amount = 50.00;
      dailyDeposits[5].amount = 120.00;
      dailyDeposits[6].amount = 80.00;
      dailyWithdrawals[4].amount = 20.00;
      dailyWithdrawals[5].amount = 60.00;
      dailyWithdrawals[6].amount = 40.00;
    } else {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      totalUsers = count || 0;

      const { count: active } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      activeUsers = active || 0;

      const { count: pendingUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: pendingDeps } = await supabase
        .from('deposits')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

      const { count: pendingWiths } = await supabase
        .from('withdrawals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

      pendingApprovals = (pendingUsers || 0) + (pendingDeps || 0) + (pendingWiths || 0);

      const { data: approvedDeps } = await supabase
        .from('deposits')
        .select('amount')
        .eq('status', 'Approved');
      totalDeposited = (approvedDeps || []).reduce((sum, d) => sum + (parseFloat(d.amount as any) || 0), 0);

      const { data: approvedWiths } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('status', 'Approved');
      totalWithdrawn = (approvedWiths || []).reduce((sum, w) => sum + (parseFloat(w.amount as any) || 0), 0);

      // Perform real 7-day query counts
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);

      const { data: profilesList } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      (profilesList || []).forEach(p => {
        const pDate = new Date(p.created_at);
        const pLabel = pDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const entry = userGrowth.find(x => x.label === pLabel);
        if (entry) entry.count += 1;
      });

      const { data: depositsList } = await supabase
        .from('deposits')
        .select('created_at, amount')
        .eq('status', 'Approved')
        .gte('created_at', sevenDaysAgo.toISOString());

      (depositsList || []).forEach(dep => {
        const dDate = new Date(dep.created_at);
        const dLabel = dDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const entry = dailyDeposits.find(x => x.label === dLabel);
        if (entry) entry.amount += parseFloat(dep.amount as any) || 0;
      });

      const { data: withdrawalsList } = await supabase
        .from('withdrawals')
        .select('created_at, amount')
        .eq('status', 'Approved')
        .gte('created_at', sevenDaysAgo.toISOString());

      (withdrawalsList || []).forEach(w => {
        const wDate = new Date(w.created_at);
        const wLabel = wDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const entry = dailyWithdrawals.find(x => x.label === wLabel);
        if (entry) entry.amount += parseFloat(w.amount as any) || 0;
      });

      const { data: recentSignups } = await supabase
        .from('profiles')
        .select('username, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentDeposits } = await supabase
        .from('deposits')
        .select('amount, status, created_at, profiles(username)')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentWithdrawals } = await supabase
        .from('withdrawals')
        .select('amount, status, created_at, profiles(username)')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentReviews } = await supabase
        .from('review_submissions')
        .select('status, created_at, profiles(username), products(title)')
        .order('created_at', { ascending: false })
        .limit(5);

      feed = [
        ...(recentSignups || []).map((u: any) => ({
          type: 'signup',
          text: `New registration request: ${u.username}`,
          date: u.created_at
        })),
        ...(recentDeposits || []).map((d: any) => ({
          type: 'deposit',
          text: `User ${d.profiles?.username || 'Unknown'} submitted deposit $${d.amount} (${d.status})`,
          date: d.created_at
        })),
        ...(recentWithdrawals || []).map((w: any) => ({
          type: 'withdrawal',
          text: `User ${w.profiles?.username || 'Unknown'} requested withdrawal $${w.amount} (${w.status})`,
          date: w.created_at
        })),
        ...(recentReviews || []).map((r: any) => ({
          type: 'review',
          text: `User ${r.profiles?.username || 'Unknown'} submitted review for "${r.products?.title || 'Product'}" (${r.status})`,
          date: r.created_at
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const statsResult = {
      totalUsers,
      activeUsers,
      totalDeposited,
      totalWithdrawn,
      pendingApprovals,
      activityFeed: feed.slice(0, 10),
      userGrowth,
      dailyDeposits,
      dailyWithdrawals
    };
    setCache('stats', statsResult, 300); // Cache stats for 5 minutes
    res.json(statsResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 2. List All Users
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, status } = req.query;

    let isRestricted = false;
    let assignedUserIds: string[] = [];

    // Query restriction flag for this admin
    const adminId = req.user?.id;
    if (adminId) {
      const { data: adminProfile } = await supabase
        .from('admins')
        .select('is_restricted')
        .eq('id', adminId)
        .maybeSingle();
      
      if (adminProfile?.is_restricted) {
        isRestricted = true;
        const { data: assignedRows } = await supabase
          .from('admin_assigned_users')
          .select('user_id')
          .eq('admin_id', adminId);
        
        assignedUserIds = (assignedRows || []).map((x: any) => x.user_id);
      }
    }

    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.ilike('username', `%${search}%`);
    }
    if (isRestricted) {
      if (assignedUserIds.length === 0) {
        return res.json([]); // No users assigned to this restricted admin
      }
      query = query.in('id', assignedUserIds);
    }

    const { data: users, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!users || users.length === 0) {
      return res.json([]);
    }

    // Fetch unique referrer names to avoid fetching all profiles
    const referredByCodes = users.map(u => u.referred_by).filter(Boolean);
    const referrerMap = new Map<string, string>();
    if (referredByCodes.length > 0) {
      const { data: referrers } = await supabase
        .from('profiles')
        .select('username, referral_code')
        .in('referral_code', referredByCodes);
      if (referrers) {
        referrers.forEach(p => {
          if (p.referral_code && p.username) {
            referrerMap.set(p.referral_code.trim().toUpperCase(), p.username);
          }
        });
      }
    }

    // Fetch all platform balances for these users in one query
    const userIds = users.map(u => u.id);
    const { data: balances } = await supabase
      .from('platform_balances')
      .select('user_id, platform, wallet_balance')
      .in('user_id', userIds);

    // Group balances by user_id
    const balanceMap: Record<string, any> = {};
    userIds.forEach(id => {
      balanceMap[id] = { Amazon: 0, Alibaba: 0, Shopify: 0, total: 0 };
    });

    if (balances) {
      balances.forEach(b => {
        const uId = b.user_id;
        const plat = b.platform;
        const bal = parseFloat(b.wallet_balance) || 0;
        if (balanceMap[uId]) {
          balanceMap[uId][plat] = bal;
          balanceMap[uId].total += bal;
        }
      });
    }

    // Fetch active VIP platforms count for returned users only
    const { data: activeWorkspaces } = await supabase
      .from('user_assigned_products')
      .select('user_id, platform')
      .in('user_id', userIds);

    const activePlatsMap: Record<string, Set<string>> = {};
    userIds.forEach(id => {
      activePlatsMap[id] = new Set<string>();
    });

    if (activeWorkspaces) {
      activeWorkspaces.forEach((aw: any) => {
        if (activePlatsMap[aw.user_id]) {
          activePlatsMap[aw.user_id].add(aw.platform);
        }
      });
    }

    // Fetch assignments for returned users only to match red dots on the frontend
    const { data: allAssignments } = await supabase
      .from('admin_assigned_users')
      .select('user_id, admin_id, admins(username)')
      .in('user_id', userIds);

    const assignmentMap: Record<string, { id: string; username: string }> = {};
    if (allAssignments) {
      allAssignments.forEach((a: any) => {
        if (a.admins) {
          assignmentMap[a.user_id] = {
            id: a.admin_id,
            username: (a.admins as any).username
          };
        }
      });
    }

    // Attach balances & active VIPs & resolved referrer username
    const enrichedUsers = users.map(u => {
      const normalizedRef = u.referred_by ? u.referred_by.trim().toUpperCase() : '';
      return {
        ...u,
        balances: balanceMap[u.id] || { Amazon: 0, Alibaba: 0, Shopify: 0, total: 0 },
        activeVIPs: Array.from(activePlatsMap[u.id] || []),
        referred_by_username: normalizedRef ? (referrerMap.get(normalizedRef) || u.referred_by) : null,
        assignedAdmin: assignmentMap[u.id] || null
      };
    });

    res.json(enrichedUsers);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 3. User Details Profile page (Includes plaintext password lookup)
router.get('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Fetch user balances
    const { data: balances } = await supabase
      .from('platform_balances')
      .select('*')
      .eq('user_id', id);

    // Fetch user transactions
    const { data: deposits } = await supabase.from('deposits').select('*').eq('user_id', id).order('created_at', { ascending: false });
    const { data: withdrawals } = await supabase.from('withdrawals').select('*').eq('user_id', id).order('created_at', { ascending: false });
    const { data: reviews } = await supabase.from('review_submissions').select('*, products(title, platform)').eq('user_id', id).order('created_at', { ascending: false });

    // Fetch IP logs, custom combo rules, and customer service operator chat transcripts
    const { data: ipLogs } = await supabase.from('ip_logs').select('*').eq('user_id', id).order('created_at', { ascending: false });
    const { data: comboRules } = await supabase.from('combo_checkpoints').select('*').eq('user_id', id).order('position', { ascending: true });
    const { data: chatLogs } = await supabase.from('chat_messages').select('*').eq('user_id', id).order('created_at', { ascending: true });

    res.json({
      profile: user,
      balances: balances || [],
      deposits: deposits || [],
      withdrawals: withdrawals || [],
      reviews: reviews || [],
      ipLogs: ipLogs || [],
      comboRules: comboRules || [],
      chatLogs: chatLogs || []
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 3b. Delete User Account (Admin permanently removes a user profile)
router.delete('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Delete dependent records first to avoid FK constraint violations
    await supabase.from('chat_messages').delete().eq('user_id', id);
    await supabase.from('ip_logs').delete().eq('user_id', id);
    await supabase.from('combo_checkpoints').delete().eq('user_id', id);
    await supabase.from('review_submissions').delete().eq('user_id', id);
    await supabase.from('deposits').delete().eq('user_id', id);
    await supabase.from('withdrawals').delete().eq('user_id', id);
    await supabase.from('platform_balances').delete().eq('user_id', id);

    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: 'Failed to delete user: ' + error.message });
    }

    // Also try deleting from admins table (does nothing if it's not an admin profile ID)
    await supabase.from('admins').delete().eq('id', id);

    res.json({ success: true, message: 'User account and all associated data permanently deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 4. Update User Account Status (Approve/Restrict User Profile)
router.put('/users/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' | 'restricted' | 'pending'

    if (!status) {
      return res.status(400).json({ error: 'Status variable is required' });
    }

    if (status === 'rejected') {
      if (!isDbConfigured) {
        return res.json({ message: 'User successfully rejected and deleted (Sandbox Mode).' });
      }
      const { error: delErr } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (delErr) {
        return res.status(500).json({ error: delErr.message });
      }
      const adminId = req.user?.id || 'unknown-admin';
      await logAdminAction(adminId, 'REJECT_AND_DELETE_USER', id, `Rejected and deleted user account`, req);
      return res.json({ message: 'User successfully rejected and deleted.' });
    }

    if (!isDbConfigured) {
      return res.json({ message: `User status changed to ${status} (Sandbox Mode)`, user: { id, status } });
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const adminId = req.user?.id || 'unknown-admin';
    await logAdminAction(adminId, 'UPDATE_USER_STATUS', id, `Changed user status to ${status}`, req);

    res.json({ message: `User status changed to ${status}`, user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 5. Add / Subtract User Balance directly
router.put('/users/:id/balance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { platform, amount } = req.body; // e.g. amount: 15.50 (adds) or -10.00 (subtracts)

    if (!platform || amount === undefined) {
      return res.status(400).json({ error: 'Platform and amount changes are required' });
    }

    const delta = parseFloat(amount);
    if (isNaN(delta)) {
      return res.status(400).json({ error: 'Invalid balance delta amount' });
    }

    // Get current balance record
    const { data: current, error: fetchError } = await supabase
      .from('platform_balances')
      .select('wallet_balance')
      .eq('user_id', id)
      .eq('platform', platform)
      .single();

    if (fetchError || !current) {
      return res.status(400).json({ error: 'Balance ledger entry not found for this platform' });
    }

    const currentBal = parseFloat(current.wallet_balance as any) || 0.0;
    const finalBal = Number((currentBal + delta).toFixed(2));

    const { data: updatedBalance, error: updateError } = await supabase
      .from('platform_balances')
      .update({ wallet_balance: finalBal })
      .eq('user_id', id)
      .eq('platform', platform)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update balance: ' + updateError.message });
    }

    broadcastToUser(id, 'balance_update', { type: 'balance_adjustment', platform, balance: finalBal });
    clearCache('stats');

    const adminId = req.user?.id || 'unknown-admin';
    await logAdminAction(adminId, 'UPDATE_USER_BALANCE', id, `Adjusted balance on platform ${platform} by ${amount} (New balance: ${finalBal})`, req);

    res.json({ message: 'Balance successfully updated', balance: updatedBalance });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 6. View All Pending Deposits
router.get('/deposits', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Verify restricted admin access
    const adminId = req.user?.id;
    let isRestricted = false;
    let assignedUserIds: string[] = [];

    if (adminId) {
      const { data: adminProfile } = await supabase
        .from('admins')
        .select('is_restricted')
        .eq('id', adminId)
        .maybeSingle();

      if (adminProfile?.is_restricted) {
        isRestricted = true;
        const { data: assignedRows } = await supabase
          .from('admin_assigned_users')
          .select('user_id')
          .eq('admin_id', adminId);
        assignedUserIds = (assignedRows || []).map((x: any) => x.user_id);
      }
    }

    let query = supabase
      .from('deposits')
      .select('*, profiles(username)')
      .eq('status', 'Pending');

    if (isRestricted) {
      if (assignedUserIds.length === 0) {
        return res.json([]);
      }
      query = query.in('user_id', assignedUserIds);
    }

    const { data: list, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(list || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 7. Approve / Reject Deposit Request
router.put('/deposits/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Approved' | 'Rejected'

    if (status !== 'Approved' && status !== 'Rejected') {
      return res.status(400).json({ error: 'Status must be Approved or Rejected' });
    }

    // Fetch deposit details
    const { data: deposit, error: fetchError } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !deposit) {
      return res.status(404).json({ error: 'Deposit request not found' });
    }

    // Verify restricted admin access
    const adminId = req.user?.id;
    if (adminId) {
      const { data: adminProfile } = await supabase
        .from('admins')
        .select('is_restricted')
        .eq('id', adminId)
        .maybeSingle();
      
      if (adminProfile?.is_restricted) {
        const { count } = await supabase
          .from('admin_assigned_users')
          .select('*', { count: 'exact', head: true })
          .eq('admin_id', adminId)
          .eq('user_id', deposit.user_id);
        
        if (!count || count === 0) {
          return res.status(403).json({ error: 'Access Denied: You do not have permission to moderate transactions for this reviewer.' });
        }
      }
    }

    if (deposit.status !== 'Pending') {
      return res.status(400).json({ error: 'Deposit request already audited and processed' });
    }

    // Update deposit status
    const { error: updateError } = await supabase
      .from('deposits')
      .update({ status })
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update status: ' + updateError.message });
    }

    if (status === 'Approved') {
      // 1. Credit wallet balance
      const { data: balanceRecord } = await supabase
        .from('platform_balances')
        .select('wallet_balance')
        .eq('user_id', deposit.user_id)
        .eq('platform', deposit.platform)
        .single();

      const currentBalance = parseFloat(balanceRecord?.wallet_balance as any) || 0.0;
      const finalBalance = Number((currentBalance + parseFloat(deposit.amount)).toFixed(2));

      await supabase
        .from('platform_balances')
        .update({ wallet_balance: finalBalance })
        .eq('user_id', deposit.user_id)
        .eq('platform', deposit.platform);

      // 2. Set user status to active to unlock workspace
      await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', deposit.user_id);
    }

    // Broadcast real-time balance update to the depositing user
    broadcastToUser(deposit.user_id, 'balance_update', { type: 'deposit', status, amount: deposit.amount, platform: deposit.platform });
    broadcastToAdmins('approval_notice', { type: 'deposit', status, amount: deposit.amount, userId: deposit.user_id });
    clearCache('stats');

    const auditAdminId = req.user?.id || 'unknown-admin';
    await logAdminAction(auditAdminId, `AUDIT_DEPOSIT_${status.toUpperCase()}`, deposit.user_id, `Deposit ID ${id} of amount ${deposit.amount} on platform ${deposit.platform} was ${status}`, req);

    res.json({ message: `Deposit request successfully ${status}.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 8. View All Pending Withdrawals
router.get('/withdrawals', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Verify restricted admin access
    const adminId = req.user?.id;
    let isRestricted = false;
    let assignedUserIds: string[] = [];

    if (adminId) {
      const { data: adminProfile } = await supabase
        .from('admins')
        .select('is_restricted')
        .eq('id', adminId)
        .maybeSingle();

      if (adminProfile?.is_restricted) {
        isRestricted = true;
        const { data: assignedRows } = await supabase
          .from('admin_assigned_users')
          .select('user_id')
          .eq('admin_id', adminId);
        assignedUserIds = (assignedRows || []).map((x: any) => x.user_id);
      }
    }

    let query = supabase
      .from('withdrawals')
      .select('*, profiles(username)')
      .eq('status', 'Pending');

    if (isRestricted) {
      if (assignedUserIds.length === 0) {
        return res.json([]);
      }
      query = query.in('user_id', assignedUserIds);
    }

    const { data: list, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(list || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 9. Approve / Reject Withdrawal Request
router.put('/withdrawals/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, platform } = req.body; // 'Approved' | 'Rejected', platform is needed for refund route

    if (status !== 'Approved' && status !== 'Rejected') {
      return res.status(400).json({ error: 'Status must be Approved or Rejected' });
    }

    const { data: wRecord, error: fetchError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !wRecord) {
      return res.status(404).json({ error: 'Withdrawal record not found' });
    }

    // Verify restricted admin access
    const adminId = req.user?.id;
    if (adminId) {
      const { data: adminProfile } = await supabase
        .from('admins')
        .select('is_restricted')
        .eq('id', adminId)
        .maybeSingle();
      
      if (adminProfile?.is_restricted) {
        const { count } = await supabase
          .from('admin_assigned_users')
          .select('*', { count: 'exact', head: true })
          .eq('admin_id', adminId)
          .eq('user_id', wRecord.user_id);
        
        if (!count || count === 0) {
          return res.status(403).json({ error: 'Access Denied: You do not have permission to moderate transactions for this reviewer.' });
        }
      }
    }

    if (wRecord.status !== 'Pending') {
      return res.status(400).json({ error: 'Withdrawal already audited and processed' });
    }

    // Update status
    const { error: updateError } = await supabase
      .from('withdrawals')
      .update({ status })
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update status: ' + updateError.message });
    }

    // Refund target balance if rejected
    if (status === 'Rejected') {
      const refundPlatform = wRecord.platform || platform;
      if (!refundPlatform) {
        return res.status(400).json({ error: 'Platform identifier is required to process refund logs' });
      }

      const { data: balanceRecord } = await supabase
        .from('platform_balances')
        .select('wallet_balance')
        .eq('user_id', wRecord.user_id)
        .eq('platform', refundPlatform)
        .single();

      const currentBalance = parseFloat(balanceRecord?.wallet_balance as any) || 0.0;
      const finalBalance = Number((currentBalance + parseFloat(wRecord.amount)).toFixed(2));

      await supabase
        .from('platform_balances')
        .update({ wallet_balance: finalBalance })
        .eq('user_id', wRecord.user_id)
        .eq('platform', refundPlatform);
    }

    // Broadcast real-time withdrawal status to the withdrawing user
    broadcastToUser(wRecord.user_id, 'balance_update', { type: 'withdrawal', status, amount: wRecord.amount });
    broadcastToAdmins('approval_notice', { type: 'withdrawal', status, amount: wRecord.amount, userId: wRecord.user_id });
    clearCache('stats');

    const auditAdminId = req.user?.id || 'unknown-admin';
    await logAdminAction(auditAdminId, `AUDIT_WITHDRAWAL_${status.toUpperCase()}`, wRecord.user_id, `Withdrawal ID ${id} of amount ${wRecord.amount} was ${status}`, req);

    res.json({ message: `Withdrawal successfully ${status}.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Pending reviews submissions queue and audit endpoints removed

// 12. Create / List / Edit / Delete Product Pool Campaigns
router.get('/products', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { platform, search } = req.query;

    let query = supabase.from('products').select('*').order('created_at', { ascending: false });
    if (platform) {
      query = query.eq('platform', platform);
    }
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data: products, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(products || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/products', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { platform, title, imageUrl, price, payout, externalLink } = req.body;

    if (!platform || !title || !imageUrl || price === undefined || payout === undefined || !externalLink) {
      return res.status(400).json({ error: 'Platform, Title, Image URL, Price, Payout, and Link are required' });
    }

    const { data: newProd, error } = await supabase
      .from('products')
      .insert({
        platform,
        title,
        image_url: imageUrl,
        price: parseFloat(price) || 0.00,
        payout: parseFloat(payout),
        external_link: externalLink
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const adminId = req.user?.id || 'unknown-admin';
    await logAdminAction(adminId, 'CREATE_PRODUCT', null, `Created campaign "${title}" on platform ${platform} with price ${price} and payout ${payout}`, req);

    res.status(201).json({ message: 'Product campaign successfully created', product: newProd });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.put('/products/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { platform, title, imageUrl, price, payout, externalLink } = req.body;

    if (!platform || !title || !imageUrl || price === undefined || payout === undefined || !externalLink) {
      return res.status(400).json({ error: 'Platform, Title, Image URL, Price, Payout, and Link are required' });
    }

    const { data: updatedProd, error } = await supabase
      .from('products')
      .update({
        platform,
        title,
        image_url: imageUrl,
        price: parseFloat(price) || 0.00,
        payout: parseFloat(payout),
        external_link: externalLink
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const adminId = req.user?.id || 'unknown-admin';
    await logAdminAction(adminId, 'EDIT_PRODUCT', null, `Updated campaign ID ${id} on platform ${platform}: "${title}" price ${price} payout ${payout}`, req);

    res.json({ message: 'Product campaign successfully updated', product: updatedProd });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.delete('/products/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const adminId = req.user?.id || 'unknown-admin';
    await logAdminAction(adminId, 'DELETE_PRODUCT', null, `Deleted campaign ID ${id}`, req);

    res.json({ message: 'Product campaign successfully deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 13. System Configurations Settings
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: settings, error } = await supabase.from('system_config').select('*');
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const mapped = (settings || []).reduce((acc: any, item: any) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.put('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { settings } = req.body; // e.g. { trc20_address: '...', telegram_link: '...' }

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    const promises = Object.entries(settings).map(([key, val]) => {
      return supabase.from('system_config').upsert({ key, value: String(val) });
    });

    await Promise.all(promises);
    const adminId = req.user?.id || 'unknown-admin';
    await logAdminAction(adminId, 'UPDATE_SETTINGS', null, `Updated system configurations: ${JSON.stringify(settings)}`, req);
    res.json({ message: 'System configurations updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 14. Configure Combo Checkpoint Rule
router.post('/users/:id/combos', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { platform, position, triggerBalance, profitOverride } = req.body;

    if (!platform || !position || triggerBalance === undefined) {
      return res.status(400).json({ error: 'Platform, position, and triggerBalance are required' });
    }

    const { data, error } = await supabase
      .from('combo_checkpoints')
      .upsert({
        user_id: id,
        platform,
        position: parseInt(position),
        trigger_balance: parseFloat(triggerBalance),
        profit_override: parseFloat(profitOverride || 0.00)
      }, { onConflict: 'user_id,platform,position' })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to configure checkpoint: ' + error.message });
    }

    broadcastToUser(id, 'balance_update', { type: 'combo_update', platform });

    const adminId = req.user?.id || 'unknown-admin';
    await logAdminAction(adminId, 'SET_COMBO_RULE', id, `Set combo checkpoint rule for platform ${platform} at position ${position} with trigger balance ${triggerBalance}`, req);

    res.json({ message: 'Combo checkpoint rule successfully set.', rule: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 15. Delete Combo Checkpoint Rule
router.delete('/users/:id/combos/:comboId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { comboId } = req.params;
    const { error } = await supabase
      .from('combo_checkpoints')
      .delete()
      .eq('id', comboId);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete checkpoint: ' + error.message });
    }

    const { id } = req.params;
    broadcastToUser(id, 'balance_update', { type: 'combo_update' });

    const adminId = req.user?.id || 'unknown-admin';
    await logAdminAction(adminId, 'DELETE_COMBO_RULE', id, `Deleted combo checkpoint ID ${comboId}`, req);

    res.json({ message: 'Combo checkpoint rule deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 16. Manual Reset Reviewer Progress Batch
router.post('/users/:id/reset-batch', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { platform } = req.body;

    let query = supabase
      .from('platform_balances')
      .update({
        current_position: 0,
        last_completed_batch_at: null,
        last_reset_at: new Date().toISOString()
      })
      .eq('user_id', id);

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { error } = await query;
    if (error) {
      return res.status(500).json({ error: 'Failed to reset batch: ' + error.message });
    }

    res.json({ message: 'Review batch progress reset successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 17. Grant Direct Bonus Endpoint
router.post('/users/:id/bonus', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { platform, amount, note } = req.body;

    if (!platform || !amount) {
      return res.status(400).json({ error: 'Platform and amount are required' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Bonus amount must be positive' });
    }

    // Validate if the user has assigned products for this platform (indicating category is unlocked)
    const { data: assignedList, error: assignedError } = await supabase
      .from('user_assigned_products')
      .select('id')
      .eq('user_id', id)
      .eq('platform', platform)
      .limit(1);

    if (assignedError) {
      return res.status(500).json({ error: 'Failed to verify platform unlock status: ' + assignedError.message });
    }

    if (!assignedList || assignedList.length === 0) {
      return res.status(400).json({ error: `Cannot grant bonus: User does not have ${platform} category unlocked.` });
    }

    // Fetch active balance
    const { data: balanceRecord, error: fetchError } = await supabase
      .from('platform_balances')
      .select('wallet_balance')
      .eq('user_id', id)
      .eq('platform', platform)
      .single();

    if (fetchError || !balanceRecord) {
      return res.status(404).json({ error: 'User balance record not found' });
    }

    const updatedBalance = Number((parseFloat(balanceRecord.wallet_balance as any) + numericAmount).toFixed(2));

    // Update balance
    const { error: updateError } = await supabase
      .from('platform_balances')
      .update({ wallet_balance: updatedBalance })
      .eq('user_id', id)
      .eq('platform', platform);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to award bonus: ' + updateError.message });
    }

    // Insert into dedicated bonus_grants ledger (NOT deposits — bonuses are not user deposits)
    await supabase.from('bonus_grants').insert({
      user_id: id,
      platform,
      amount: numericAmount,
      note: note || 'Admin Granted Bonus',
      granted_at: new Date().toISOString()
    });

    // Send real-time balance update notification via WebSocket
    broadcastToUser(id, 'balance_update', { type: 'bonus', amount: numericAmount, platform });
    clearCache('stats');

    const auditAdminId = req.user?.id || 'unknown-admin';
    await logAdminAction(auditAdminId, 'GRANT_BONUS', id, `Granted bonus of ${numericAmount} on platform ${platform} with note: ${note || 'Admin Granted Bonus'}`, req);

    res.json({ message: 'Bonus successfully credited to user balance.', updatedBalance });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 18. Get bonus grants for a user (for admin audit report)
router.get('/users/:id/bonus-grants', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('bonus_grants')
      .select('*')
      .eq('user_id', id)
      .order('granted_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});


router.post('/scrape-amazon', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Amazon product URL is required' });
    }

    if (!url.includes('amazon.')) {
      return res.status(400).json({ error: 'Only valid Amazon product URLs are supported' });
    }

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    let title = '';
    let imageUrl = '';
    let price = 0.00;

    // Parse fallback title slug from the URL in case the fetch fails or gets blocked
    let urlTitleGuess = '';
    try {
      const parsedUrl = new URL(targetUrl);
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      const dpIndex = pathParts.indexOf('dp');
      if (dpIndex > 0) {
        urlTitleGuess = pathParts[dpIndex - 1];
      } else if (pathParts.length > 0 && !pathParts[0].includes('dp')) {
        urlTitleGuess = pathParts[0];
      }
      
      if (urlTitleGuess) {
        urlTitleGuess = urlTitleGuess
          .split(/[-_]+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    } catch (e) {
      console.warn("Failed to guess title from URL path:", e);
    }

    try {
      // Fetch the page with standard headers to avoid anti-bot blocks
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      if (response.ok) {
        const html = await response.text();

        // 1. Title
        const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
                           html.match(/<meta\s+name=["']title["']\s+content=["'](.*?)["']/i) ||
                           html.match(/<title>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1]
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
          title = title.replace(/^Amazon\.com\s*:\s*/i, '');
        }

        // 2. Image URL
        const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
                           html.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i) ||
                           html.match(/data-a-dynamic-image=["']\{(.*?)\}/i) ||
                           html.match(/["']large["']\s*:\s*["'](https:\/\/images-na\.ssl-images-amazon\.com\/images\/I\/.*?)["']/i);
        if (imageMatch && imageMatch[1]) {
          imageUrl = imageMatch[1].replace(/\\/g, '');
          if (!imageUrl.startsWith('https://')) {
            const urlMatch = imageUrl.match(/(https:\/\/.*?\.jpg)/);
            if (urlMatch) {
              imageUrl = urlMatch[1];
            }
          }
        }

        // 3. Price
        const priceMatch = html.match(/<span\s+class=["']a-offscreen["']>(.*?)<\/span>/i) ||
                           html.match(/<meta\s+property=["']product:price:amount["']\s+content=["'](.*?)["']/i) ||
                           html.match(/["']priceAmount["']\s*:\s*(.*?)\s*,/i);
        if (priceMatch && priceMatch[1]) {
          const cleanPrice = priceMatch[1].replace(/[^0-9.]/g, '');
          price = parseFloat(cleanPrice) || 0.00;
        }
      }
    } catch (fetchError) {
      console.warn("Scraper page fetch failure, using URL guess fallbacks:", fetchError);
    }

    // Fallbacks if scrape failed or was blocked
    if (!title) {
      title = urlTitleGuess || 'Amazon Custom Product';
    }
    if (!imageUrl) {
      imageUrl = 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=500';
    }
    if (!price || price <= 0) {
      price = parseFloat((19.99 + Math.random() * 60).toFixed(2));
    }

    res.json({
      title,
      imageUrl,
      price
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to scrape Amazon product: ' + error.message });
  }
});


// 19. Retrieve Support Chat Threads
router.get('/chats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let isRestricted = false;
    let assignedUserIds: string[] = [];

    // Query restriction status of logged-in admin
    const adminId = req.user?.id;
    if (adminId) {
      const { data: adminProfile } = await supabase
        .from('admins')
        .select('is_restricted')
        .eq('id', adminId)
        .maybeSingle();

      if (adminProfile?.is_restricted) {
        isRestricted = true;
        const { data: assignedRows } = await supabase
          .from('admin_assigned_users')
          .select('user_id')
          .eq('admin_id', adminId);
        assignedUserIds = (assignedRows || []).map((x: any) => x.user_id);
      }
    }

    let messages = [];

    if (!isDbConfigured) {
      messages = [...mockChatMessages].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      let query = supabase
        .from('chat_messages')
        .select('*, profiles(username)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (isRestricted) {
        if (assignedUserIds.length === 0) {
          return res.json([]); // No user threads assigned to this restricted admin
        }
        query = query.in('user_id', assignedUserIds);
      }

      const { data, error } = await query;
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      messages = data || [];
    }

    const threads: any[] = [];
    const userSeen = new Set<string>();

    for (const msg of messages) {
      const uId = msg.user_id;
      if (!userSeen.has(uId)) {
        userSeen.add(uId);
        threads.push({
          userId: uId,
          username: msg.profiles?.username || 'user',
          text: msg.text,
          time: msg.time,
          sender: msg.sender,
          created_at: msg.created_at,
          assignedAdmin: null // will populate below
        });
      }
    }

    // Fetch assignments for these active thread users only
    const activeUserIds = Array.from(userSeen);
    if (activeUserIds.length > 0) {
      const { data: allAssignments } = await supabase
        .from('admin_assigned_users')
        .select('user_id, admin_id, admins(username)')
        .in('user_id', activeUserIds);

      const assignmentMap: Record<string, { id: string; username: string }> = {};
      if (allAssignments) {
        allAssignments.forEach((a: any) => {
          if (a.admins) {
            assignmentMap[a.user_id] = {
              id: a.admin_id,
              username: (a.admins as any).username
            };
          }
        });
      }

      threads.forEach(t => {
        t.assignedAdmin = assignmentMap[t.userId] || null;
      });
    }

    res.json(threads);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 20. Fetch Support Chat Logs history for specific user thread
router.get('/chats/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Verify restricted admin access
    const adminId = req.user?.id;
    if (adminId) {
      const { data: adminProfile } = await supabase
        .from('admins')
        .select('is_restricted')
        .eq('id', adminId)
        .maybeSingle();
      
      if (adminProfile?.is_restricted) {
        const { count } = await supabase
          .from('admin_assigned_users')
          .select('*', { count: 'exact', head: true })
          .eq('admin_id', adminId)
          .eq('user_id', userId);
        
        if (!count || count === 0) {
          return res.status(403).json({ error: 'Access Denied: You do not have permission to access support threads for this customer.' });
        }
      }
    }

    let messages = [];

    if (!isDbConfigured) {
      messages = mockChatMessages.filter(m => m.user_id === userId);
    } else {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      messages = data || [];
    }

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 21. Send Support message reply to user thread
router.post('/chats/:userId/send', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { text, time } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Verify restricted admin access
    const adminId = req.user?.id;
    if (adminId) {
      const { data: adminProfile } = await supabase
        .from('admins')
        .select('is_restricted')
        .eq('id', adminId)
        .maybeSingle();
      
      if (adminProfile?.is_restricted) {
        const { count } = await supabase
          .from('admin_assigned_users')
          .select('*', { count: 'exact', head: true })
          .eq('admin_id', adminId)
          .eq('user_id', userId);
        
        if (!count || count === 0) {
          return res.status(403).json({ error: 'Access Denied: You do not have permission to access support threads for this customer.' });
        }
      }
    }

    const timeVal = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!isDbConfigured) {
      const adminMsg = {
        id: `msg-admin-${Date.now()}`,
        user_id: userId,
        sender: 'admin' as const,
        text: text.trim(),
        time: timeVal,
        created_at: new Date().toISOString()
      };
      mockChatMessages.push(adminMsg);
      broadcastToUser(userId, 'new_chat_message', { sender: 'admin', text: adminMsg.text, time: adminMsg.time });
      return res.json(adminMsg);
    }

    const { data: adminMsg, error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        sender: 'admin',
        text: text.trim(),
        time: timeVal
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    broadcastToUser(userId, 'new_chat_message', { sender: 'admin', text: adminMsg.text, time: adminMsg.time });
    res.json(adminMsg);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 22. Get User VIP Configuration (assigned products & checkpoints)
router.get('/users/:id/vip', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Fetch all assigned products for the user (graceful fallback if table is not yet created)
    let assignedProducts: any[] = [];
    try {
      const { data: apData, error: apErr } = await supabase
        .from('user_assigned_products')
        .select('product_id, platform')
        .eq('user_id', id);
      if (!apErr && apData) {
        assignedProducts = apData;
      }
    } catch (e) {
      console.warn("Gracefully fallback assigned products:", e);
    }

    // Fetch all combo checkpoints for the user (graceful fallback)
    let checkpoints: any[] = [];
    try {
      const { data: cpData, error: cpErr } = await supabase
        .from('combo_checkpoints')
        .select('platform, position, trigger_balance')
        .eq('user_id', id)
        .order('position', { ascending: true });
      if (!cpErr && cpData) {
        checkpoints = cpData;
      }
    } catch (e) {
      console.warn("Gracefully fallback checkpoints:", e);
    }

    // Group by platform
    const result: Record<string, { productIds: string[], combos: any[] }> = {
      Amazon: { productIds: [], combos: [] },
      Alibaba: { productIds: [], combos: [] },
      Shopify: { productIds: [], combos: [] }
    };

    if (assignedProducts) {
      assignedProducts.forEach((ap: any) => {
        if (result[ap.platform]) {
          result[ap.platform].productIds.push(ap.product_id);
        }
      });
    }

    if (checkpoints) {
      checkpoints.forEach((cp: any) => {
        if (result[cp.platform]) {
          result[cp.platform].combos.push({
            position: cp.position,
            amount: parseFloat(cp.trigger_balance as any)
          });
        }
      });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 23. Save User VIP Platform Configuration
router.post('/users/:id/vip', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { platform, productIds, combos } = req.body;

    if (!platform || !Array.isArray(productIds)) {
      return res.status(400).json({ error: 'Platform and productIds array are required' });
    }

    // 1. Clear existing assigned products for this user & platform
    const { error: delApErr } = await supabase
      .from('user_assigned_products')
      .delete()
      .eq('user_id', id)
      .eq('platform', platform);

    if (delApErr) {
      return res.status(500).json({ error: 'Failed to clear assigned products: ' + delApErr.message });
    }

    // 2. Insert new assigned products
    if (productIds.length > 0) {
      const inserts = productIds.map(pId => ({
        user_id: id,
        product_id: pId,
        platform
      }));
      const { error: insApErr } = await supabase
        .from('user_assigned_products')
        .insert(inserts);

      if (insApErr) {
        return res.status(500).json({ error: 'Failed to save assigned products: ' + insApErr.message });
      }
    }

    // 3. Clear existing combo checkpoints for this user & platform
    const { error: delCpErr } = await supabase
      .from('combo_checkpoints')
      .delete()
      .eq('user_id', id)
      .eq('platform', platform);

    if (delCpErr) {
      return res.status(500).json({ error: 'Failed to clear checkpoints: ' + delCpErr.message });
    }

    // 4. Insert new combo checkpoints
    if (Array.isArray(combos) && combos.length > 0) {
      const inserts = combos.map((c: any) => ({
        user_id: id,
        platform,
        position: parseInt(c.position),
        trigger_balance: parseFloat(c.amount),
        profit_override: 0.00
      }));
      const { error: insCpErr } = await supabase
        .from('combo_checkpoints')
        .insert(inserts);

      if (insCpErr) {
        return res.status(500).json({ error: 'Failed to save checkpoints: ' + insCpErr.message });
      }
    }

    // Update user profile bound platform if null
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('platform')
      .eq('id', id)
      .single();

    if (userProfile && !userProfile.platform) {
      await supabase
        .from('profiles')
        .update({ platform })
        .eq('id', id);
    }

    // Send WebSocket notification to user that VIP is unlocked/updated
    broadcastToUser(id, 'balance_update', { type: 'vip_unlocked', platform, productCount: productIds.length });

    res.json({ success: true, message: `VIP ${platform} configuration successfully saved.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 24. Lock/Remove User VIP Platform Configuration (Delete assignments and checkpoints)
router.delete('/users/:id/vip/:platform', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, platform } = req.params;

    // Delete assigned products
    await supabase.from('user_assigned_products').delete().eq('user_id', id).eq('platform', platform);
    // Delete combo checkpoints
    await supabase.from('combo_checkpoints').delete().eq('user_id', id).eq('platform', platform);

    // Re-evaluate remaining platforms to update profile's primary platform binding
    const { data: assigned } = await supabase
      .from('user_assigned_products')
      .select('platform')
      .eq('user_id', id);

    const remaining = Array.from(new Set((assigned || []).map((a: any) => a.platform)));
    const nextBound = remaining.length > 0 ? remaining[0] : null;

    await supabase
      .from('profiles')
      .update({ platform: nextBound })
      .eq('id', id);

    // Send WebSocket lock event to user
    broadcastToUser(id, 'balance_update', { type: 'vip_locked', platform });

    res.json({ success: true, message: `VIP ${platform} workspace successfully locked.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
