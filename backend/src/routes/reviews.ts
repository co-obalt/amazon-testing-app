import express, { Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/auth.js';
import { broadcastToUser } from '../services/wsService.js';

const router = express.Router();

async function maybeAwardReferralBonus(referredUserId?: string, platform?: string) {
  try {
    if (!platform || !referredUserId) {
      return;
    }
    const { data: referredProfile, error: referredError } = await supabase
      .from('profiles')
      .select('referred_by')
      .eq('id', referredUserId)
      .maybeSingle();

    if (referredError || !referredProfile?.referred_by) {
      return;
    }

    const { data: referrerProfile, error: referrerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', referredProfile.referred_by)
      .maybeSingle();

    if (referrerError || !referrerProfile) {
      return;
    }

    const { data: existingBalance } = await supabase
      .from('platform_balances')
      .select('*')
      .eq('user_id', referrerProfile.id)
      .eq('platform', platform)
      .maybeSingle();

    const bonusAmount = 1.50;
    if (existingBalance) {
      const updatedBalance = Number((parseFloat(existingBalance.wallet_balance as any) + bonusAmount).toFixed(2));
      await supabase
        .from('platform_balances')
        .update({ wallet_balance: updatedBalance })
        .eq('user_id', referrerProfile.id)
        .eq('platform', platform);
    } else {
      await supabase
        .from('platform_balances')
        .insert({
          user_id: referrerProfile.id,
          platform,
          wallet_balance: bonusAmount,
          reviews_count: 0,
          current_position: 0
        });
    }

    await supabase.from('deposits').insert({
      user_id: referrerProfile.id,
      platform,
      protocol: 'REFERRAL',
      amount: bonusAmount,
      tx_hash: `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      remark: 'Referral bonus for 3 completed reviews',
      status: 'Approved'
    });

    broadcastToUser(referrerProfile.id, 'balance_update', { type: 'bonus', amount: bonusAmount, platform });
  } catch (error) {
    console.warn('Referral bonus processing failed:', error);
  }
}

// Fetch ALL Campaigns Pool products for visual marquee showcase (no platform filter required, available to all logged-in users)
router.get('/products/all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(products || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 1. Fetch Campaigns Pool by Platform
router.get('/products', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { platform } = req.query;

    if (!platform) {
      return res.status(400).json({ error: 'Platform query parameter is required' });
    }

    const userId = req.user?.id;

    // Check if user has specific assigned products for this platform
    const { data: assigned } = await supabase
      .from('user_assigned_products')
      .select('product_id, created_at')
      .eq('user_id', userId)
      .eq('platform', platform);

    if (!assigned || assigned.length === 0) {
      // If no products assigned, this platform is locked/unassigned for this user
      return res.json([]);
    }

    const assignedIds = assigned.map((a: any) => a.product_id);
    let { data: products, error } = await supabase
      .from('products')
      .select('*')
      .in('id', assignedIds);

    const assignedMap = new Map(assigned.map((a: any) => [a.product_id, a.created_at]));
    if (products) {
      products = products.map((p: any) => ({
        ...p,
        assignedAt: assignedMap.get(p.id) || new Date().toISOString()
      }));
    }

    if (error) {
      return res.status(500).json({ error: 'Failed to retrieve products: ' + error.message });
    }

    // Auto-seed product pool if database is completely empty
    if (!products || products.length === 0) {
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
      if (count === 0) {
        const defaultProducts = [
          // Amazon (4% Commission)
          { title: 'ZonHub Smart Echo (5th Gen) | Spatial sound', image_url: 'https://images.unsplash.com/photo-1543512214-318c7553f230?auto=format&fit=crop&q=80&w=600', price: 31.25, payout: 1.25, external_link: 'https://www.amazon.com/s?k=smart+echo+speaker' },
          { title: 'ZonReader Paperwhite (16 GB) | Warm light', image_url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=600', price: 48.75, payout: 1.95, external_link: 'https://www.amazon.com/s?k=paperwhite+ereader' },
          { title: 'Organic Bamboo Coasters Set (6-Pack) | Non-slip', image_url: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&q=80&w=600', price: 20.00, payout: 0.80, external_link: 'https://www.amazon.com/s?k=bamboo+coasters' },
          { title: 'Ergonomic Memory Foam Office Seat Cushion', image_url: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=600', price: 27.50, payout: 1.10, external_link: 'https://www.amazon.com/s?k=office+seat+cushion' },
          { title: 'Stainless Steel Vacuum Insulated Water Bottle (32oz)', image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=600', price: 35.00, payout: 1.40, external_link: 'https://www.amazon.com/s?k=insulated+water+bottle' },
          { title: 'Professional Ceramic Ionic Hair Dryer | 1875W', image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=600', price: 55.00, payout: 2.20, external_link: 'https://www.amazon.com/s?k=hair+dryer' },
          { title: 'Adjustable Laptop Stand | Ergonomic Aluminum Stand', image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=600', price: 41.25, payout: 1.65, external_link: 'https://www.amazon.com/s?k=laptop+stand' },
          { title: 'Premium Matcha Green Tea Powder (Organic)', image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=600', price: 23.75, payout: 0.95, external_link: 'https://www.amazon.com/s?k=matcha+powder' },
          { title: 'Dual-Port USB-C Wall Charger Block | 40W Fast Charger', image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&q=80&w=600', price: 26.25, payout: 1.05, external_link: 'https://www.amazon.com/s?k=usb+c+charger' },
          { title: 'Wireless Active Noise Cancelling Earbuds | Bluetooth 5.3', image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=600', price: 52.50, payout: 2.10, external_link: 'https://www.amazon.com/s?k=noise+cancelling+earbuds' },
          { title: 'Digital Kitchen Scale | High Precision Multi-unit', image_url: 'https://images.unsplash.com/photo-1588675646184-f550218b57b5?auto=format&fit=crop&q=80&w=600', price: 18.75, payout: 0.75, external_link: 'https://www.amazon.com/s?k=kitchen+scale' },
          { title: 'Aromatherapy Ceramic Essential Oil Diffuser (500ml)', image_url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=600', price: 32.50, payout: 1.30, external_link: 'https://www.amazon.com/s?k=essential+oil+diffuser' },
          // Alibaba (8% Commission)
          { title: 'AliUltra Foldable Electric Scooter | Dual motor', image_url: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&q=80&w=600', price: 31.25, payout: 2.50, external_link: 'https://www.alibaba.com/trade/search?SearchText=electric+scooter' },
          { title: 'AliVision 4K Native LED Projector | 15k Lms', image_url: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&q=80&w=600', price: 26.87, payout: 2.15, external_link: 'https://www.alibaba.com/trade/search?SearchText=4k+projector' },
          { title: 'AliSecure HD Outdoor IP Camera | Wifi PTZ Node', image_url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&q=80&w=600', price: 22.50, payout: 1.80, external_link: 'https://www.alibaba.com/trade/search?SearchText=wifi+ip+camera' },
          { title: 'Smart Automated Robot Vacuum Cleaner | LIDAR Map', image_url: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=600', price: 30.00, payout: 2.40, external_link: 'https://www.alibaba.com/trade/search?SearchText=robot+vacuum' },
          { title: 'Portable Solar Generator Station | 500Wh Output', image_url: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80&w=600', price: 28.75, payout: 2.30, external_link: 'https://www.alibaba.com/trade/search?SearchText=portable+solar+generator' },
          { title: 'Heavy Duty Massage Gun | 30 Speeds Deep Tissue', image_url: 'https://images.unsplash.com/photo-1607962837359-5e7eaf562642?auto=format&fit=crop&q=80&w=600', price: 20.00, payout: 1.60, external_link: 'https://www.alibaba.com/trade/search?SearchText=massage+gun' },
          { title: 'Adjustable Dumbbells Set (50lbs) | Quick Dial', image_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600', price: 28.12, payout: 2.25, external_link: 'https://www.alibaba.com/trade/search?SearchText=adjustable+dumbbells' },
          { title: 'Automatic Espresso Coffee Machine | 20 Bar Pump', image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=600', price: 30.62, payout: 2.45, external_link: 'https://www.alibaba.com/trade/search?SearchText=espresso+machine' },
          { title: 'Electric Oral Irrigator Dental Flosser | 4 Modes', image_url: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&q=80&w=600', price: 11.87, payout: 0.95, external_link: 'https://www.alibaba.com/trade/search?SearchText=oral+irrigator' },
          { title: 'Portable Bluetooth Thermal Label Printer', image_url: 'https://images.unsplash.com/photo-1543269664-76bc3997d9ea?auto=format&fit=crop&q=80&w=600', price: 15.00, payout: 1.20, external_link: 'https://www.alibaba.com/trade/search?SearchText=label+printer' },
          { title: 'Dual Layer Car Roof Cargo Carrier Bag | Waterproof', image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600', price: 18.75, payout: 1.50, external_link: 'https://www.alibaba.com/trade/search?SearchText=roof+cargo+bag' },
          { title: 'Foldable Lightbox Photography Studio Kit', image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600', price: 18.12, payout: 1.45, external_link: 'https://www.alibaba.com/trade/search?SearchText=lightbox+studio' },
          // Shopify (10% Commission)
          { title: 'Minimalist Full-Grain Leather Wallet | RFID organizer', image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&q=80&w=600', price: 11.00, payout: 1.10, external_link: 'https://www.google.com/search?q=minimalist+leather+wallet' },
          { title: 'Therapeutic Essential Oils Diffuser | Ceramic ultrasonic', image_url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=600', price: 9.00, payout: 0.90, external_link: 'https://www.google.com/search?q=ceramic+essential+oils+diffuser' },
          { title: 'Eco-Friendly Cork Yoga Mat | Non-slip sweat-resistant', image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600', price: 17.00, payout: 1.70, external_link: 'https://www.google.com/search?q=cork+yoga+mat' },
          { title: 'Hydro Flask Insulated Travel Coffee Mug | 16oz Wide Mouth', image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600', price: 12.00, payout: 1.20, external_link: 'https://www.google.com/search?q=insulated+travel+mug' },
          { title: 'Premium Bamboo Bed Sheets Set | King Size Cooling', image_url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600', price: 23.50, payout: 2.35, external_link: 'https://www.google.com/search?q=bamboo+bed+sheets' },
          { title: 'Minimalist Wooden Desk Organizer Stand | Handcrafted Walnut', image_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=600', price: 15.00, payout: 1.50, external_link: 'https://www.google.com/search?q=wooden+desk+organizer' },
          { title: 'Aromatherapy Soy Wax Candles Set | Lavender & Eucalyptus', image_url: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=600', price: 8.50, payout: 0.85, external_link: 'https://www.google.com/search?q=soy+wax+candles' },
          { title: 'Polarized Retro Round Sunglasses | UV400 Unbreakable', image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=600', price: 13.00, payout: 1.30, external_link: 'https://www.google.com/search?q=polarized+round+sunglasses' },
          { title: 'Manual Ceramic Burr Coffee Grinder | Adjustable Coarseness', image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=600', price: 14.50, payout: 1.45, external_link: 'https://www.google.com/search?q=manual+coffee+grinder' },
          { title: 'Stainless Steel French Press Coffee Maker | Double Wall', image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=600', price: 19.00, payout: 1.90, external_link: 'https://www.google.com/search?q=french+press+coffee+maker' },
          { title: 'Vegan Leather Minimalist Backpack | 15.6 Inch Laptop Sleeve', image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=600', price: 21.00, payout: 2.10, external_link: 'https://www.google.com/search?q=vegan+leather+backpack' },
          { title: 'Ergonomic Balance Ball Chair with Stability Base', image_url: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&q=80&w=600', price: 22.50, payout: 2.25, external_link: 'https://www.google.com/search?q=balance+ball+chair' }
        ];

        const { error: seedError } = await supabase.from('products').insert(defaultProducts);
        if (!seedError) {
          const { data: refetched } = await supabase.from('products').select('*').in('id', assignedIds);
          products = refetched;
        }
      }
    }

    res.json(products || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 2. Submit Review Draft for Verification
router.post('/submit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId, orderId, reviewText } = req.body;

    if (!productId || !reviewText) {
      return res.status(400).json({ error: 'Product ID and feedback template selection are required' });
    }

    if (typeof reviewText !== 'string' || reviewText.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid review text format' });
    }

    if (reviewText.length > 500) {
      return res.status(400).json({ error: 'Review text exceeds maximum allowed length of 500 characters' });
    }

    const finalOrderId = orderId || ('ORD-' + Math.random().toString(36).substring(2, 12).toUpperCase());

    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product campaign not found' });
    }

    const isDbConfigured = process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('your-project-id') &&
                           process.env.SUPABASE_KEY && !process.env.SUPABASE_KEY.includes('your-supabase-anon-key');

    // Resolve the platform context by looking up the user's assignment mapping
    let platform = 'Amazon';
    let assignedAt = new Date(0).toISOString();
    if (userId !== 'user-dev-uuid' && userId !== 'admin-dev-uuid' && isDbConfigured) {
      const { data: assignment, error: assignError } = await supabase
        .from('user_assigned_products')
        .select('platform, created_at')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

      if (assignError || !assignment) {
        return res.status(400).json({ error: 'This campaign product is not assigned to your active workspace.' });
      }
      platform = assignment.platform;
      assignedAt = assignment.created_at;
    }

    let nextPosition = 1;
    let payoutEarned = parseFloat(product.payout) || 1.00;
    let checkpoint: any = null;

    if (userId !== 'user-dev-uuid' && userId !== 'admin-dev-uuid' && isDbConfigured) {
      // 1. Fetch user's current progress position on the active platform
      const { data: balanceRecord, error: balanceFetchError } = await supabase
        .from('platform_balances')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', platform)
        .single();

      if (balanceFetchError || !balanceRecord) {
        return res.status(400).json({ error: `Could not verify balance details for platform ${platform}.` });
      }
      nextPosition = (balanceRecord.current_position || 0) + 1;

      // 2. Batch lock rules:
      // - If last_completed_batch_at is set: a withdrawal was approved. Lock until 24h has elapsed.
      // - If current_position >= 25 but no withdrawal yet: user must submit withdrawal to continue.
      // - Partial batches (1-24) are NEVER auto-reset — progress is frozen until user resumes.
      if (balanceRecord.last_completed_batch_at) {
        const completedTime = new Date(balanceRecord.last_completed_batch_at).getTime();
        const hoursElapsed = (Date.now() - completedTime) / (1000 * 60 * 60);
        if (hoursElapsed < 24) {
          const hoursLeft = Math.max(0, Math.ceil(24 - hoursElapsed));
          const minutesLeft = Math.max(0, Math.ceil((24 - hoursElapsed) * 60) % 60);
          return res.status(400).json({
            error: `Your withdrawal has been processed. You can start the next batch in ${hoursLeft}h ${minutesLeft}m. Please check back later.`,
            cooldownActive: true,
            hoursRemaining: hoursLeft,
            minutesRemaining: minutesLeft
          });
        } else {
          // 24h has elapsed — clear the cooldown flag and allow work
          await supabase
            .from('platform_balances')
            .update({
              last_completed_batch_at: null,
              last_reset_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('platform', platform);

          balanceRecord.last_completed_batch_at = null;
        }
      }

      // If 25 orders are complete but withdrawal has not been approved yet — block new orders
      if (balanceRecord.current_position >= 25) {
        return res.status(400).json({
          error: 'You have completed all 25 orders for this batch. Please submit a withdrawal request to begin a new batch.',
          batchComplete: true
        });
      }

      nextPosition = balanceRecord.current_position + 1;

      // 3. Verify combo checkpoints triggers
      const { data: checkpointData } = await supabase
        .from('combo_checkpoints')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', platform)
        .eq('position', nextPosition)
        .maybeSingle();
      checkpoint = checkpointData;

      if (checkpoint) {
        // Direct combo reward: trigger_balance (combo amount) + profit_override (profit)
        const comboAmount = parseFloat(checkpoint.trigger_balance as any) || 0.00;
        const profitAmount = parseFloat(checkpoint.profit_override as any) || 0.00;
        payoutEarned = comboAmount + profitAmount;
      }
    }

    // Check if user has already submitted a review for this product in the current assignment window
    if (userId !== 'user-dev-uuid' && userId !== 'admin-dev-uuid' && isDbConfigured) {
      const { data: existingSubmission } = await supabase
        .from('review_submissions')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .eq('platform', platform)
        .gte('created_at', assignedAt)
        .limit(1);

      if (existingSubmission && existingSubmission.length > 0) {
        return res.status(400).json({ error: 'You have already submitted a review verification request for this campaign.' });
      }
    }

    // Validate code representation (01, 02, 03)
    if (!['01', '02', '03'].includes(reviewText)) {
      return res.status(400).json({
        error: 'Invalid feedback selection. Please select one of the three preset text templates.'
      });
    }

    if (userId === 'user-dev-uuid' || userId === 'admin-dev-uuid' || !isDbConfigured) {
      return res.status(201).json({
        message: 'Review draft successfully recorded and approved (Sandbox Mode).',
        submission: { id: 'submission-dev-uuid', user_id: userId, product_id: productId, order_id: finalOrderId, review_text: reviewText, payout_earned: payoutEarned, status: 'Completed' }
      });
    }

    // Record submission directly as Completed
    const { data: submission, error: insertError } = await supabase
      .from('review_submissions')
      .insert({
        user_id: userId,
        product_id: productId,
        order_id: finalOrderId,
        review_text: reviewText,
        payout_earned: payoutEarned,
        status: 'Completed',
        platform: platform
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: 'Failed to record review: ' + insertError.message });
    }

    // Auto-approve: Update user platform balance atomically via database RPC (concurrency protection)
    const { error: rpcError } = await supabase.rpc('increment_user_review_progress', {
      target_user_id: userId,
      target_platform: platform,
      payout_amount: payoutEarned
    });

    if (rpcError) {
      console.warn("RPC increment_user_review_progress failed, falling back to non-atomic update:", rpcError.message);

      // Fallback non-atomic update logic
      const { data: balanceRecord } = await supabase
        .from('platform_balances')
        .select('wallet_balance, reviews_count, current_position')
        .eq('user_id', userId)
        .eq('platform', platform)
        .single();

      const currentBalance = parseFloat(balanceRecord?.wallet_balance as any) || 0.0;
      const currentReviews = balanceRecord?.reviews_count || 0;
      const nextPos = (balanceRecord?.current_position || 0) + 1;

      const finalBalance = Number((currentBalance + payoutEarned).toFixed(2));

      // Update wallet balance for ALL platforms of this user
      await supabase
        .from('platform_balances')
        .update({ wallet_balance: finalBalance })
        .eq('user_id', userId);

      // Update reviews count and position only for target platform
      await supabase
        .from('platform_balances')
        .update({
          reviews_count: currentReviews + 1,
          current_position: nextPos
        })
        .eq('user_id', userId)
        .eq('platform', platform);
    }

    // Also check referral bonus
    const { count: completedReviewCount } = await supabase
      .from('review_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'Completed');

    if ((completedReviewCount || 0) === 3) {
      await maybeAwardReferralBonus(userId, platform);
    }

    res.status(201).json({
      message: 'Review successfully submitted and commission credited to your account.',
      submission,
      isCombo: !!checkpoint,
      checkpointAmount: checkpoint ? parseFloat(checkpoint.trigger_balance as any) : 0,
      payoutEarned: payoutEarned
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 3. Get User Review Submissions List
router.get('/submissions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: submissions, error } = await supabase
      .from('review_submissions')
      .select(`
        id,
        product_id,
        order_id,
        review_text,
        status,
        payout_earned,
        platform,
        created_at,
        product:products (
          title,
          image_url
        )
      `)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch submissions: ' + error.message });
    }

    // Format list for frontend consumption
    const formattedSubmissions = (submissions || []).map((sub: any) => ({
      id: sub.id,
      productId: sub.product_id,
      productTitle: sub.product?.title || 'Unknown Product',
      productImage: sub.product?.image_url || '',
      platform: sub.platform || '',
      orderId: sub.order_id,
      reviewText: sub.review_text,
      payout: parseFloat(sub.payout_earned) || 0.00,
      status: sub.status,
      createdAt: sub.created_at,
      date: new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    }));

    res.json(formattedSubmissions);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 4. Developer Test Review Approval Override Endpoint
router.post('/override-approve', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Fetch all pending reviews for this user
    const { data: pendingReviews, error: fetchError } = await supabase
      .from('review_submissions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'Pending');

    if (fetchError || !pendingReviews || pendingReviews.length === 0) {
      return res.json({ success: true, message: 'No pending reviews to approve.' });
    }

    for (const review of pendingReviews) {
      // 1. Update review status to Completed
      await supabase
        .from('review_submissions')
        .update({ status: 'Completed' })
        .eq('id', review.id);

      // 2. Credit payout reward to platform balances
      const platform = review.platform;
      const payout = parseFloat(review.payout_earned) || 1.00;

      const { data: balanceRecord } = await supabase
        .from('platform_balances')
        .select('wallet_balance, reviews_count, current_position')
        .eq('user_id', userId)
        .eq('platform', platform)
        .single();

      const currentBalance = parseFloat(balanceRecord?.wallet_balance as any) || 0.0;
      const currentReviews = balanceRecord?.reviews_count || 0;
      const nextPosition = (balanceRecord?.current_position || 0) + 1;

      const finalBalance = Number((currentBalance + payout).toFixed(2));

      // Update wallet balance for ALL platforms of this user
      await supabase
        .from('platform_balances')
        .update({ wallet_balance: finalBalance })
        .eq('user_id', userId);

      // Update reviews count and position only for target platform
      await supabase
        .from('platform_balances')
        .update({
          reviews_count: currentReviews + 1,
          current_position: nextPosition
        })
        .eq('user_id', userId)
        .eq('platform', platform);

      const { count: completedReviewCount } = await supabase
        .from('review_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'Completed');

      if ((completedReviewCount || 0) === 3) {
        await maybeAwardReferralBonus(userId, platform);
      }
    }

    res.json({ success: true, message: 'Developer status override: Pending reviews authorized.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
