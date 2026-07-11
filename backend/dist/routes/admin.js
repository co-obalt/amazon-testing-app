import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { mockChatMessages } from '../config/sandboxStore.js';
import { broadcastToUser, broadcastToAdmins } from '../services/wsService.js';
import { clearCache } from '../services/cacheService.js';
const router = express.Router();
// Apply admin access check middleware to all routes in this file
router.use(authenticateToken);
router.use(requireAdmin);
router.get('/stats', async (req, res) => {
    try {
        let totalUsers = 0;
        let activeUsers = 0;
        let totalDeposited = 0.0;
        let totalWithdrawn = 0.0;
        let pendingApprovals = 0;
        let feed = [];
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
        }
        else {
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
                .eq('status', 'pending')
                .eq('role', 'user');
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
            totalDeposited = (approvedDeps || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
            const { data: approvedWiths } = await supabase
                .from('withdrawals')
                .select('amount')
                .eq('status', 'Approved');
            totalWithdrawn = (approvedWiths || []).reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0);
            const { data: recentSignups } = await supabase
                .from('profiles')
                .select('username, created_at')
                .eq('role', 'user')
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
                ...(recentSignups || []).map((u) => ({
                    type: 'signup',
                    text: `New registration request: ${u.username}`,
                    date: u.created_at
                })),
                ...(recentDeposits || []).map((d) => ({
                    type: 'deposit',
                    text: `User ${d.profiles?.username || 'Unknown'} submitted deposit $${d.amount} (${d.status})`,
                    date: d.created_at
                })),
                ...(recentWithdrawals || []).map((w) => ({
                    type: 'withdrawal',
                    text: `User ${w.profiles?.username || 'Unknown'} requested withdrawal $${w.amount} (${w.status})`,
                    date: w.created_at
                })),
                ...(recentReviews || []).map((r) => ({
                    type: 'review',
                    text: `User ${r.profiles?.username || 'Unknown'} submitted review for "${r.products?.title || 'Product'}" (${r.status})`,
                    date: r.created_at
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        res.json({
            totalUsers,
            activeUsers,
            totalDeposited,
            totalWithdrawn,
            pendingApprovals,
            activityFeed: feed.slice(0, 10)
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 2. List All Users
router.get('/users', async (req, res) => {
    try {
        const { search } = req.query;
        let query = supabase.from('profiles').select('*');
        if (search) {
            query = query.ilike('username', `%${search}%`);
        }
        const { data: users, error } = await query;
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json(users || []);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 3. User Details Profile page (Includes plaintext password lookup)
router.get('/users/:id', async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 4. Update User Account Status (Approve/Restrict User Profile)
router.put('/users/:id/status', async (req, res) => {
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
        res.json({ message: `User status changed to ${status}`, user: updated });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 5. Add / Subtract User Balance directly
router.put('/users/:id/balance', async (req, res) => {
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
        const currentBal = parseFloat(current.wallet_balance) || 0.0;
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
        res.json({ message: 'Balance successfully updated', balance: updatedBalance });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 6. View All Pending Deposits
router.get('/deposits', async (req, res) => {
    try {
        const { data: list, error } = await supabase
            .from('deposits')
            .select('*, profiles(username)')
            .eq('status', 'Pending');
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json(list || []);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 7. Approve / Reject Deposit Request
router.put('/deposits/:id/status', async (req, res) => {
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
            const currentBalance = parseFloat(balanceRecord?.wallet_balance) || 0.0;
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
        res.json({ message: `Deposit request successfully ${status}.` });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 8. View All Pending Withdrawals
router.get('/withdrawals', async (req, res) => {
    try {
        const { data: list, error } = await supabase
            .from('withdrawals')
            .select('*, profiles(username)')
            .eq('status', 'Pending');
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json(list || []);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 9. Approve / Reject Withdrawal Request
router.put('/withdrawals/:id/status', async (req, res) => {
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
            if (!platform) {
                return res.status(400).json({ error: 'Platform identifier is required to process refund logs' });
            }
            const { data: balanceRecord } = await supabase
                .from('platform_balances')
                .select('wallet_balance')
                .eq('user_id', wRecord.user_id)
                .eq('platform', platform)
                .single();
            const currentBalance = parseFloat(balanceRecord?.wallet_balance) || 0.0;
            const finalBalance = Number((currentBalance + parseFloat(wRecord.amount)).toFixed(2));
            await supabase
                .from('platform_balances')
                .update({ wallet_balance: finalBalance })
                .eq('user_id', wRecord.user_id)
                .eq('platform', platform);
        }
        // Broadcast real-time withdrawal status to the withdrawing user
        broadcastToUser(wRecord.user_id, 'balance_update', { type: 'withdrawal', status, amount: wRecord.amount });
        broadcastToAdmins('approval_notice', { type: 'withdrawal', status, amount: wRecord.amount, userId: wRecord.user_id });
        clearCache('stats');
        res.json({ message: `Withdrawal successfully ${status}.` });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 10. View Pending Reviews Submissions Queue
router.get('/submissions', async (req, res) => {
    try {
        const { data: list, error } = await supabase
            .from('review_submissions')
            .select('*, profiles(username), products(title, platform)')
            .eq('status', 'Pending');
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json(list || []);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 11. Approve / Reject Compliance Review
router.put('/submissions/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'Completed' | 'Rejected'
        if (status !== 'Completed' && status !== 'Rejected') {
            return res.status(400).json({ error: 'Status must be Completed or Rejected' });
        }
        // Fetch review submission details
        const { data: reviewSub, error: fetchError } = await supabase
            .from('review_submissions')
            .select('*, products(platform)')
            .eq('id', id)
            .single();
        if (fetchError || !reviewSub) {
            return res.status(404).json({ error: 'Review submission record not found' });
        }
        if (reviewSub.status !== 'Pending') {
            return res.status(400).json({ error: 'Review submission already audited' });
        }
        // Update status
        const { error: updateError } = await supabase
            .from('review_submissions')
            .update({ status })
            .eq('id', id);
        if (updateError) {
            return res.status(500).json({ error: 'Failed to update review status: ' + updateError.message });
        }
        // Credit payout rewards if completed
        if (status === 'Completed') {
            const platform = reviewSub.products?.platform;
            const payout = parseFloat(reviewSub.payout_earned) || 1.00;
            const { data: balanceRecord } = await supabase
                .from('platform_balances')
                .select('wallet_balance, reviews_count, current_position')
                .eq('user_id', reviewSub.user_id)
                .eq('platform', platform)
                .single();
            const currentBalance = parseFloat(balanceRecord?.wallet_balance) || 0.0;
            const currentReviews = balanceRecord?.reviews_count || 0;
            const nextPosition = (balanceRecord?.current_position || 0) + 1;
            const updates = {
                wallet_balance: Number((currentBalance + payout).toFixed(2)),
                reviews_count: currentReviews + 1,
                current_position: nextPosition
            };
            if (nextPosition >= 25) {
                updates.last_completed_batch_at = new Date().toISOString();
            }
            await supabase
                .from('platform_balances')
                .update(updates)
                .eq('user_id', reviewSub.user_id)
                .eq('platform', platform);
        }
        // Broadcast real-time review completion to the submitting user
        broadcastToUser(reviewSub.user_id, 'balance_update', { type: 'review', status });
        broadcastToAdmins('approval_notice', { type: 'review', status, userId: reviewSub.user_id });
        clearCache('stats');
        res.json({ message: `Review draft audited and set to ${status}.` });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 12. Create New Product Pool Campaign
router.post('/products', async (req, res) => {
    try {
        const { platform, title, category, imageUrl, payout, difficulty, wordLimit, externalLink } = req.body;
        if (!platform || !title || !category || !imageUrl || !payout || !difficulty || !externalLink) {
            return res.status(400).json({ error: 'All fields except wordLimit are required' });
        }
        const { data: newProd, error } = await supabase
            .from('products')
            .insert({
            platform,
            title,
            category,
            image_url: imageUrl,
            payout: parseFloat(payout),
            difficulty,
            word_limit: parseInt(wordLimit) || 20,
            external_link: externalLink
        })
            .select()
            .single();
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.status(201).json({ message: 'Product campaign successfully created', product: newProd });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 13. System Configurations Settings
router.get('/settings', async (req, res) => {
    try {
        const { data: settings, error } = await supabase.from('system_config').select('*');
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        const mapped = (settings || []).reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {});
        res.json(mapped);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
router.put('/settings', async (req, res) => {
    try {
        const { settings } = req.body; // e.g. { trc20_address: '...', telegram_link: '...' }
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'Settings object is required' });
        }
        const promises = Object.entries(settings).map(([key, val]) => {
            return supabase.from('system_config').upsert({ key, value: String(val) });
        });
        await Promise.all(promises);
        res.json({ message: 'System configurations updated successfully.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 14. Configure Combo Checkpoint Rule
router.post('/users/:id/combos', async (req, res) => {
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
        res.json({ message: 'Combo checkpoint rule successfully set.', rule: data });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 15. Delete Combo Checkpoint Rule
router.delete('/users/:id/combos/:comboId', async (req, res) => {
    try {
        const { comboId } = req.params;
        const { error } = await supabase
            .from('combo_checkpoints')
            .delete()
            .eq('id', comboId);
        if (error) {
            return res.status(500).json({ error: 'Failed to delete checkpoint: ' + error.message });
        }
        res.json({ message: 'Combo checkpoint rule deleted successfully.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 16. Manual Reset Reviewer Progress Batch
router.post('/users/:id/reset-batch', async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 17. Grant Direct Bonus Endpoint
router.post('/users/:id/bonus', async (req, res) => {
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
        const updatedBalance = Number((parseFloat(balanceRecord.wallet_balance) + numericAmount).toFixed(2));
        // Update balance
        const { error: updateError } = await supabase
            .from('platform_balances')
            .update({ wallet_balance: updatedBalance })
            .eq('user_id', id)
            .eq('platform', platform);
        if (updateError) {
            return res.status(500).json({ error: 'Failed to award bonus: ' + updateError.message });
        }
        // Insert system transaction ledger record
        await supabase.from('deposits').insert({
            user_id: id,
            platform,
            protocol: 'BONUS',
            amount: numericAmount,
            tx_hash: 'BONUS-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
            remark: note || 'Admin Granted Bonus',
            status: 'Approved'
        });
        res.json({ message: 'Bonus successfully credited to user balance.', updatedBalance });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 18. Scrape Amazon Product metadata endpoint
router.post('/scrape-amazon', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'Amazon product URL is required' });
        }
        if (!url.includes('amazon.')) {
            return res.status(400).json({ error: 'Only valid Amazon product URLs are supported' });
        }
        // Fetch the page with standard headers to avoid anti-bot blocks
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        if (!response.ok) {
            return res.status(500).json({ error: `Failed to fetch page: HTTP status ${response.status}` });
        }
        const html = await response.text();
        // Parse metadata using regex
        // 1. Title
        let title = '';
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
        let imageUrl = '';
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
        let price = 0.00;
        const priceMatch = html.match(/<span\s+class=["']a-offscreen["']>(.*?)<\/span>/i) ||
            html.match(/<meta\s+property=["']product:price:amount["']\s+content=["'](.*?)["']/i) ||
            html.match(/["']priceAmount["']\s*:\s*(.*?)\s*,/i);
        if (priceMatch && priceMatch[1]) {
            const cleanPrice = priceMatch[1].replace(/[^0-9.]/g, '');
            price = parseFloat(cleanPrice) || 0.00;
        }
        res.json({
            title: title || 'Scraped Amazon Product',
            imageUrl: imageUrl || 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=500',
            price: price || 29.99
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to scrape Amazon product: ' + error.message });
    }
});
const isDbConfigured = process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('your-project-id') &&
    process.env.SUPABASE_KEY && !process.env.SUPABASE_KEY.includes('your-supabase-anon-key');
// 19. Retrieve Support Chat Threads
router.get('/chats', async (req, res) => {
    try {
        let messages = [];
        if (!isDbConfigured) {
            messages = [...mockChatMessages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        else {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*, profiles(username)')
                .order('created_at', { ascending: false });
            if (error) {
                return res.status(500).json({ error: error.message });
            }
            messages = data || [];
        }
        const threads = [];
        const userSeen = new Set();
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
                    created_at: msg.created_at
                });
            }
        }
        res.json(threads);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 20. Fetch Support Chat Logs history for specific user thread
router.get('/chats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        let messages = [];
        if (!isDbConfigured) {
            messages = mockChatMessages.filter(m => m.user_id === userId);
        }
        else {
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
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 21. Send Support message reply to user thread
router.post('/chats/:userId/send', async (req, res) => {
    try {
        const { userId } = req.params;
        const { text, time } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Message text is required' });
        }
        const timeVal = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (!isDbConfigured) {
            const adminMsg = {
                id: `msg-admin-${Date.now()}`,
                user_id: userId,
                sender: 'admin',
                text: text.trim(),
                time: timeVal,
                created_at: new Date().toISOString()
            };
            mockChatMessages.push(adminMsg);
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
        res.json(adminMsg);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
export default router;
