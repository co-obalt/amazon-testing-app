import express, { Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/auth.js';
import { broadcastToAdmins } from '../services/wsService.js';

const router = express.Router();

// 1. Submit Deposit Request
router.post('/deposit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { platform, protocol, amount, txHash, remark, currency, cryptoAmount } = req.body;

    if (!platform || !protocol || !amount || !txHash) {
      return res.status(400).json({ error: 'Platform, protocol, amount, and transaction hash are required' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount' });
    }

    const normalizedProtocol = protocol === 'ERC-25' ? 'ERC-20' : protocol;
    const normalizedCurrency = String(currency || (normalizedProtocol === 'BTC' ? 'BTC' : 'USDT')).toUpperCase();
    const normalizedCryptoAmount = parseFloat(cryptoAmount ?? amount);
    const minimumDeposit = platform === 'Amazon' ? 20 : platform === 'Alibaba' ? 299 : null;
    if (minimumDeposit !== null && numericAmount < minimumDeposit) {
      return res.status(400).json({ error: `${platform} requires a minimum deposit of $${minimumDeposit.toFixed(2)} to unlock.` });
    }

    // Capture requester IP address
    let clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    if (clientIp.includes(',')) clientIp = clientIp.split(',')[0].trim();
    if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') clientIp = '127.0.0.1';

    if (userId === 'user-dev-uuid' || userId === 'admin-dev-uuid') {
      return res.status(201).json({
        message: 'Deposit request successfully queued (Sandbox Mode).',
        deposit: {
          id: 'deposit-dev-uuid',
          platform,
          protocol: normalizedProtocol,
          amount: numericAmount,
          crypto_amount: isNaN(normalizedCryptoAmount) ? numericAmount : normalizedCryptoAmount,
          currency: normalizedCurrency,
          tx_hash: txHash,
          ip_address: clientIp,
          status: 'Pending'
        }
      });
    }

    const depositPayload: Record<string, any> = {
      user_id: userId,
      platform,
      protocol: normalizedProtocol,
      amount: numericAmount,
      tx_hash: txHash.trim(),
      remark: remark || null,
      ip_address: clientIp,
      status: 'Pending'
    };

    if (!isNaN(normalizedCryptoAmount)) {
      depositPayload.crypto_amount = normalizedCryptoAmount;
    }
    if (normalizedCurrency) {
      depositPayload.currency = normalizedCurrency;
    }

    let newDeposit: any;
    let error: any;
    const insertResult = await supabase
      .from('deposits')
      .insert(depositPayload)
      .select()
      .single();
    newDeposit = insertResult.data;
    error = insertResult.error;

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'This transaction hash (TxID) has already been submitted.' });
      }
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        const fallbackResult = await supabase
          .from('deposits')
          .insert({
            user_id: userId,
            platform,
            protocol: normalizedProtocol,
            amount: numericAmount,
            tx_hash: txHash.trim(),
            remark: remark || null,
            ip_address: clientIp,
            status: 'Pending'
          })
          .select()
          .single();
        newDeposit = fallbackResult.data;
        error = fallbackResult.error;
      }
      if (error) {
        return res.status(500).json({ error: 'Failed to process deposit: ' + error.message });
      }
    }

    broadcastToAdmins('new_order', {
      type: 'deposit',
      amount: numericAmount,
      platform,
      currency: normalizedCurrency,
      cryptoAmount: isNaN(normalizedCryptoAmount) ? numericAmount : normalizedCryptoAmount,
      userId,
      txHash: txHash.trim()
    });

    res.status(201).json({
      message: 'Deposit request successfully queued. Awaiting administrator approval.',
      deposit: {
        ...newDeposit,
        currency: newDeposit?.currency || normalizedCurrency,
        crypto_amount: newDeposit?.crypto_amount ?? (isNaN(normalizedCryptoAmount) ? numericAmount : normalizedCryptoAmount),
        protocol: newDeposit?.protocol || normalizedProtocol
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 2. Submit Withdrawal Request
router.post('/withdraw', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { amount, platform } = req.body;

    if (!amount || !platform) {
      return res.status(400).json({ error: 'Amount and target platform are required' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 10.00) {
      return res.status(400).json({ error: 'Minimum withdrawal amount is $10.00' });
    }

    // Capture requester IP address
    let clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    if (clientIp.includes(',')) clientIp = clientIp.split(',')[0].trim();
    if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') clientIp = '127.0.0.1';

    if (userId === 'user-dev-uuid' || userId === 'admin-dev-uuid') {
      return res.status(201).json({
        message: 'Withdrawal request successfully queued (Sandbox Mode).',
        withdrawal: { id: 'withdraw-dev-uuid', amount: numericAmount, address: 'TXdfH78ajH7aKjH8sKjD9sKa71La9aKs8F', ip_address: clientIp, status: 'Pending' }
      });
    }

    // Fetch user profile to get bound USDT address
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('bound_usdt_address')
      .eq('id', userId)
      .single();

    if (profileError || !profile || !profile.bound_usdt_address || profile.bound_usdt_address.trim() === '') {
      return res.status(400).json({ error: 'Please configure and bind your USDT Withdrawal Address in Profile Settings before submitting withdrawal requests.' });
    }

    const boundAddress = profile.bound_usdt_address.trim();

    // Fetch active platform balance
    const { data: balanceRecord, error: fetchError } = await supabase
      .from('platform_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single();

    if (fetchError || !balanceRecord) {
      return res.status(400).json({ error: `Could not verify balance details for platform ${platform}.` });
    }

    const currentBalance = parseFloat(balanceRecord.wallet_balance) || 0.0;
    if (currentBalance < numericAmount) {
      return res.status(400).json({ error: 'Insufficient wallet balance for this platform' });
    }

    // Perform immediate balance subtraction to prevent double spend
    const updatedBalance = Number((currentBalance - numericAmount).toFixed(2));
    const { error: updateError } = await supabase
      .from('platform_balances')
      .update({ wallet_balance: updatedBalance })
      .eq('user_id', userId)
      .eq('platform', platform);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update balance ledger: ' + updateError.message });
    }

    // Queue withdrawal request
    const { data: newWithdrawal, error: insertError } = await supabase
      .from('withdrawals')
      .insert({
        user_id: userId,
        amount: numericAmount,
        address: boundAddress,
        ip_address: clientIp,
        status: 'Pending'
      })
      .select()
      .single();

    if (insertError) {
      // Revert the balance subtraction on failure
      const revertedBalance = Number((updatedBalance + numericAmount).toFixed(2));
      await supabase
        .from('platform_balances')
        .update({ wallet_balance: revertedBalance })
        .eq('user_id', userId)
        .eq('platform', platform);

      return res.status(500).json({ error: 'Failed to queue withdrawal request: ' + insertError.message });
    }

    // Broadcast to admin panel: new pending withdrawal
    broadcastToAdmins('new_order', { type: 'withdrawal', amount, platform, userId: req.user?.id });

    res.status(201).json({
      message: 'Withdrawal request successfully queued. Approvals complete within 5 minutes.',
      withdrawal: newWithdrawal
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 3. Get User Transaction History
router.get('/history', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Fetch user's deposits
    const { data: deposits } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Fetch user's withdrawals
    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', userId);

    // Format and merge ledger entries
    const formattedDeposits = (deposits || []).map((dep: any) => ({
      id: dep.id,
      type: 'Deposit',
      amount: parseFloat(dep.amount),
      cryptoAmount: parseFloat(dep.crypto_amount ?? dep.amount) || parseFloat(dep.amount),
      currency: dep.currency || (dep.protocol === 'BTC' ? 'BTC' : 'USDT'),
      platform: dep.platform,
      protocol: dep.protocol,
      txHash: dep.tx_hash,
      remark: dep.remark,
      status: dep.status,
      date: new Date(dep.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      details: `${dep.protocol} ${dep.currency || (dep.protocol === 'BTC' ? 'BTC' : 'USDT')} - Hash: ${dep.tx_hash?.substring(0, 8) || 'N/A'}...`
    }));

    const formattedWithdrawals = (withdrawals || []).map((w: any) => ({
      id: w.id,
      type: 'Withdrawal',
      amount: parseFloat(w.amount),
      status: w.status,
      date: new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      details: `Wallet Address: ${w.address.substring(0, 8)}...`
    }));

    const history = [...formattedDeposits, ...formattedWithdrawals].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 4. Developer Test Deposit Approval Override Endpoints
router.post('/override-approve-deposit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { depositId } = req.body;
    if (!depositId) {
      return res.status(400).json({ error: 'Deposit ID is required' });
    }

    // Fetch deposit details
    const { data: deposit, error: fetchError } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (fetchError || !deposit) {
      return res.status(404).json({ error: 'Deposit request not found' });
    }

    if (deposit.status !== 'Pending') {
      return res.json({ success: true, message: 'Deposit already processed' });
    }

    // Update status
    await supabase
      .from('deposits')
      .update({ status: 'Approved' })
      .eq('id', depositId);

    // Credit platform balance
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

    // Unlock profile status
    await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', deposit.user_id);

    res.json({ success: true, message: 'Developer status override: Deposit approved.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/override-reject-deposit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { depositId } = req.body;
    if (!depositId) {
      return res.status(400).json({ error: 'Deposit ID is required' });
    }

    await supabase
      .from('deposits')
      .update({ status: 'Rejected' })
      .eq('id', depositId);

    res.json({ success: true, message: 'Developer status override: Deposit rejected.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
