import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken } from '../middlewares/auth.js';
const router = express.Router();
// 1. Fetch Campaigns Pool by Platform
router.get('/products', authenticateToken, async (req, res) => {
    try {
        const { platform } = req.query;
        if (!platform) {
            return res.status(400).json({ error: 'Platform query parameter is required' });
        }
        // Fetch products filtered by platform
        let { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('platform', platform);
        if (error) {
            return res.status(500).json({ error: 'Failed to retrieve products: ' + error.message });
        }
        // Auto-seed product pool if database is completely empty
        if (!products || products.length === 0) {
            const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
            if (count === 0) {
                const defaultProducts = [
                    // Amazon
                    { platform: 'Amazon', title: 'ZonHub Smart Echo (5th Gen) | Spatial sound', category: 'Smart Home', image_url: 'https://images.unsplash.com/photo-1543512214-318c7553f230?auto=format&fit=crop&q=80&w=600', payout: 1.25, difficulty: 'Easy', word_limit: 30, external_link: 'https://www.amazon.com/s?k=smart+echo+speaker' },
                    { platform: 'Amazon', title: 'ZonReader Paperwhite (16 GB) | Warm light', category: 'Electronics', image_url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=600', payout: 1.95, difficulty: 'Medium', word_limit: 45, external_link: 'https://www.amazon.com/s?k=paperwhite+ereader' },
                    { platform: 'Amazon', title: 'Organic Bamboo Coasters Set (6-Pack) | Non-slip', category: 'Kitchen & Home', image_url: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&q=80&w=600', payout: 0.80, difficulty: 'Easy', word_limit: 20, external_link: 'https://www.amazon.com/s?k=bamboo+coasters' },
                    { platform: 'Amazon', title: 'Ergonomic Memory Foam Office Seat Cushion', category: 'Office Products', image_url: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=600', payout: 1.10, difficulty: 'Easy', word_limit: 25, external_link: 'https://www.amazon.com/s?k=office+seat+cushion' },
                    { platform: 'Amazon', title: 'Stainless Steel Vacuum Insulated Water Bottle (32oz)', category: 'Sports & Outdoors', image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=600', payout: 1.40, difficulty: 'Easy', word_limit: 30, external_link: 'https://www.amazon.com/s?k=insulated+water+bottle' },
                    { platform: 'Amazon', title: 'Professional Ceramic Ionic Hair Dryer | 1875W', category: 'Personal Care', image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=600', payout: 2.20, difficulty: 'Expert', word_limit: 50, external_link: 'https://www.amazon.com/s?k=hair+dryer' },
                    { platform: 'Amazon', title: 'Adjustable Laptop Stand | Ergonomic Aluminum Stand', category: 'Office Products', image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=600', payout: 1.65, difficulty: 'Medium', word_limit: 40, external_link: 'https://www.amazon.com/s?k=laptop+stand' },
                    { platform: 'Amazon', title: 'Premium Matcha Green Tea Powder (Organic)', category: 'Grocery & Gourmet', image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=600', payout: 0.95, difficulty: 'Easy', word_limit: 25, external_link: 'https://www.amazon.com/s?k=matcha+powder' },
                    { platform: 'Amazon', title: 'Dual-Port USB-C Wall Charger Block | 40W Fast Charger', category: 'Electronics', image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&q=80&w=600', payout: 1.05, difficulty: 'Easy', word_limit: 20, external_link: 'https://www.amazon.com/s?k=usb+c+charger' },
                    { platform: 'Amazon', title: 'Wireless Active Noise Cancelling Earbuds | Bluetooth 5.3', category: 'Electronics', image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=600', payout: 2.10, difficulty: 'Expert', word_limit: 45, external_link: 'https://www.amazon.com/s?k=noise+cancelling+earbuds' },
                    { platform: 'Amazon', title: 'Digital Kitchen Scale | High Precision Multi-unit', category: 'Kitchen & Home', image_url: 'https://images.unsplash.com/photo-1588675646184-f550218b57b5?auto=format&fit=crop&q=80&w=600', payout: 0.75, difficulty: 'Easy', word_limit: 20, external_link: 'https://www.amazon.com/s?k=kitchen+scale' },
                    { platform: 'Amazon', title: 'Aromatherapy Ceramic Essential Oil Diffuser (500ml)', category: 'Smart Home', image_url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=600', payout: 1.30, difficulty: 'Medium', word_limit: 30, external_link: 'https://www.amazon.com/s?k=essential+oil+diffuser' },
                    // Alibaba
                    { platform: 'Alibaba', title: 'AliUltra Foldable Electric Scooter | Dual motor', category: 'Transportation', image_url: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&q=80&w=600', payout: 2.50, difficulty: 'Expert', word_limit: 50, external_link: 'https://www.alibaba.com/trade/search?SearchText=electric+scooter' },
                    { platform: 'Alibaba', title: 'AliVision 4K Native LED Projector | 15k Lms', category: 'Entertainment', image_url: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&q=80&w=600', payout: 2.15, difficulty: 'Medium', word_limit: 40, external_link: 'https://www.alibaba.com/trade/search?SearchText=4k+projector' },
                    { platform: 'Alibaba', title: 'AliSecure HD Outdoor IP Camera | Wifi PTZ Node', category: 'Security', image_url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&q=80&w=600', payout: 1.80, difficulty: 'Medium', word_limit: 35, external_link: 'https://www.alibaba.com/trade/search?SearchText=wifi+ip+camera' },
                    { platform: 'Alibaba', title: 'Smart Automated Robot Vacuum Cleaner | LIDAR Map', category: 'Smart Home', image_url: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=600', payout: 2.40, difficulty: 'Expert', word_limit: 50, external_link: 'https://www.alibaba.com/trade/search?SearchText=robot+vacuum' },
                    { platform: 'Alibaba', title: 'Portable Solar Generator Station | 500Wh Output', category: 'Electronics', image_url: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80&w=600', payout: 2.30, difficulty: 'Expert', word_limit: 45, external_link: 'https://www.alibaba.com/trade/search?SearchText=portable+solar+generator' },
                    { platform: 'Alibaba', title: 'Heavy Duty Massage Gun | 30 Speeds Deep Tissue', category: 'Personal Care', image_url: 'https://images.unsplash.com/photo-1607962837359-5e7eaf562642?auto=format&fit=crop&q=80&w=600', payout: 1.60, difficulty: 'Medium', word_limit: 30, external_link: 'https://www.alibaba.com/trade/search?SearchText=massage+gun' },
                    { platform: 'Alibaba', title: 'Adjustable Dumbbells Set (50lbs) | Quick Dial', category: 'Sports & Outdoors', image_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600', payout: 2.25, difficulty: 'Expert', word_limit: 40, external_link: 'https://www.alibaba.com/trade/search?SearchText=adjustable+dumbbells' },
                    { platform: 'Alibaba', title: 'Automatic Espresso Coffee Machine | 20 Bar Pump', category: 'Kitchen & Home', image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=600', payout: 2.45, difficulty: 'Expert', word_limit: 50, external_link: 'https://www.alibaba.com/trade/search?SearchText=espresso+machine' },
                    { platform: 'Alibaba', title: 'Electric Oral Irrigator Dental Flosser | 4 Modes', category: 'Personal Care', image_url: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&q=80&w=600', payout: 0.95, difficulty: 'Easy', word_limit: 25, external_link: 'https://www.alibaba.com/trade/search?SearchText=oral+irrigator' },
                    { platform: 'Alibaba', title: 'Portable Bluetooth Thermal Label Printer', category: 'Office Products', image_url: 'https://images.unsplash.com/photo-1543269664-76bc3997d9ea?auto=format&fit=crop&q=80&w=600', payout: 1.20, difficulty: 'Easy', word_limit: 30, external_link: 'https://www.alibaba.com/trade/search?SearchText=label+printer' },
                    { platform: 'Alibaba', title: 'Dual Layer Car Roof Cargo Carrier Bag | Waterproof', category: 'Transportation', image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600', payout: 1.50, difficulty: 'Medium', word_limit: 35, external_link: 'https://www.alibaba.com/trade/search?SearchText=roof+cargo+bag' },
                    { platform: 'Alibaba', title: 'Foldable Lightbox Photography Studio Kit', category: 'Entertainment', image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600', payout: 1.45, difficulty: 'Medium', word_limit: 30, external_link: 'https://www.alibaba.com/trade/search?SearchText=lightbox+studio' },
                    // Shopify
                    { platform: 'Shopify', title: 'Minimalist Full-Grain Leather Wallet | RFID organizer', category: 'Apparel & Accessories', image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&q=80&w=600', payout: 1.10, difficulty: 'Easy', word_limit: 25, external_link: 'https://www.google.com/search?q=minimalist+leather+wallet' },
                    { platform: 'Shopify', title: 'Therapeutic Essential Oils Diffuser | Ceramic ultrasonic', category: 'Wellness & Spa', image_url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=600', payout: 0.90, difficulty: 'Easy', word_limit: 25, external_link: 'https://www.google.com/search?q=ceramic+essential+oils+diffuser' },
                    { platform: 'Shopify', title: 'Eco-Friendly Cork Yoga Mat | Non-slip sweat-resistant', category: 'Wellness & Spa', image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600', payout: 1.70, difficulty: 'Medium', word_limit: 35, external_link: 'https://www.google.com/search?q=cork+yoga+mat' },
                    { platform: 'Shopify', title: 'Hydro Flask Insulated Travel Coffee Mug | 16oz Wide Mouth', category: 'Apparel & Accessories', image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600', payout: 1.20, difficulty: 'Easy', word_limit: 20, external_link: 'https://www.google.com/search?q=insulated+travel+mug' },
                    { platform: 'Shopify', title: 'Premium Bamboo Bed Sheets Set | King Size Cooling', category: 'Wellness & Spa', image_url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600', payout: 2.35, difficulty: 'Expert', word_limit: 50, external_link: 'https://www.google.com/search?q=bamboo+bed+sheets' },
                    { platform: 'Shopify', title: 'Minimalist Wooden Desk Organizer Stand | Handcrafted Walnut', category: 'Apparel & Accessories', image_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=600', payout: 1.50, difficulty: 'Medium', word_limit: 30, external_link: 'https://www.google.com/search?q=wooden+desk+organizer' },
                    { platform: 'Shopify', title: 'Aromatherapy Soy Wax Candles Set | Lavender & Eucalyptus', category: 'Wellness & Spa', image_url: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=600', payout: 0.85, difficulty: 'Easy', word_limit: 20, external_link: 'https://www.google.com/search?q=soy+wax+candles' },
                    { platform: 'Shopify', title: 'Polarized Retro Round Sunglasses | UV400 Unbreakable', category: 'Apparel & Accessories', image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=600', payout: 1.30, difficulty: 'Medium', word_limit: 30, external_link: 'https://www.google.com/search?q=polarized+round+sunglasses' },
                    { platform: 'Shopify', title: 'Manual Ceramic Burr Coffee Grinder | Adjustable Coarseness', category: 'Wellness & Spa', image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=600', payout: 1.45, difficulty: 'Easy', word_limit: 25, external_link: 'https://www.google.com/search?q=manual+coffee+grinder' },
                    { platform: 'Shopify', title: 'Stainless Steel French Press Coffee Maker | Double Wall', category: 'Wellness & Spa', image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=600', payout: 1.90, difficulty: 'Expert', word_limit: 40, external_link: 'https://www.google.com/search?q=french+press+coffee+maker' },
                    { platform: 'Shopify', title: 'Vegan Leather Minimalist Backpack | 15.6 Inch Laptop Sleeve', category: 'Apparel & Accessories', image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=600', payout: 2.10, difficulty: 'Expert', word_limit: 45, external_link: 'https://www.google.com/search?q=vegan+leather+backpack' },
                    { platform: 'Shopify', title: 'Ergonomic Balance Ball Chair with Stability Base', category: 'Wellness & Spa', image_url: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&q=80&w=600', payout: 2.25, difficulty: 'Expert', word_limit: 45, external_link: 'https://www.google.com/search?q=balance+ball+chair' }
                ];
                const { error: seedError } = await supabase.from('products').insert(defaultProducts);
                if (!seedError) {
                    const { data: refetched } = await supabase.from('products').select('*').eq('platform', platform);
                    products = refetched;
                }
            }
        }
        res.json(products || []);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 2. Submit Review Draft for Verification
router.post('/submit', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { productId, orderId, reviewText } = req.body;
        if (!productId || !orderId || !reviewText) {
            return res.status(400).json({ error: 'Product ID, Order ID, and review draft text are required' });
        }
        // Fetch product details
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
        if (productError || !product) {
            return res.status(404).json({ error: 'Product campaign not found' });
        }
        const platform = product.platform;
        const isDbConfigured = process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('your-project-id') &&
            process.env.SUPABASE_KEY && !process.env.SUPABASE_KEY.includes('your-supabase-anon-key');
        let nextPosition = 1;
        let payoutEarned = parseFloat(product.payout) || 1.00;
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
            // 2. Check 24-hour auto reset rules
            if (balanceRecord.current_position >= 25 || balanceRecord.last_completed_batch_at) {
                const completedTime = balanceRecord.last_completed_batch_at ? new Date(balanceRecord.last_completed_batch_at).getTime() : 0;
                const hoursElapsed = (Date.now() - completedTime) / (1000 * 60 * 60);
                if (hoursElapsed < 24) {
                    return res.status(400).json({
                        error: `Today's review quota completed. A new batch will automatically unlock 24 hours after completion. Time remaining: ${Math.max(0, Math.ceil(24 - hoursElapsed))} hours.`
                    });
                }
            }
            nextPosition = balanceRecord.current_position + 1;
            // 3. Verify combo checkpoints triggers
            const { data: checkpoint } = await supabase
                .from('combo_checkpoints')
                .select('*')
                .eq('user_id', userId)
                .eq('platform', platform)
                .eq('position', nextPosition)
                .maybeSingle();
            if (checkpoint) {
                const activeBalance = parseFloat(balanceRecord.wallet_balance) || 0.0;
                const triggerThreshold = parseFloat(checkpoint.trigger_balance);
                if (activeBalance < triggerThreshold) {
                    return res.status(400).json({
                        error: `Top-up Required: Campaign index ${nextPosition} is locked. You need a minimum balance of $${triggerThreshold.toFixed(2)} to unlock this campaign (Current Balance: $${activeBalance.toFixed(2)}).`,
                        comboTriggered: true,
                        triggerBalance: triggerThreshold,
                        profitOverride: parseFloat(checkpoint.profit_override) || 0.00
                    });
                }
                // Apply custom profit commission if checkpoint specifies override
                if (parseFloat(checkpoint.profit_override) > 0) {
                    payoutEarned = parseFloat(checkpoint.profit_override);
                }
            }
        }
        // Check if user has already submitted a review for this product
        if (userId !== 'user-dev-uuid' && userId !== 'admin-dev-uuid' && isDbConfigured) {
            const { data: existingSubmission } = await supabase
                .from('review_submissions')
                .select('id')
                .eq('user_id', userId)
                .eq('product_id', productId)
                .single();
            if (existingSubmission) {
                return res.status(400).json({ error: 'You have already submitted a review verification request for this campaign.' });
            }
        }
        // Validate draft word count limit
        const wordLimit = product.word_limit || 20;
        const currentWords = reviewText.trim().split(/\s+/).filter(Boolean).length;
        if (currentWords < wordLimit) {
            return res.status(400).json({
                error: `Submission rejected: Opinion draft does not meet criteria. Minimum ${wordLimit} words required (current: ${currentWords} words).`
            });
        }
        if (userId === 'user-dev-uuid' || userId === 'admin-dev-uuid' || !isDbConfigured) {
            return res.status(201).json({
                message: 'Review draft successfully recorded (Sandbox Mode).',
                submission: { id: 'submission-dev-uuid', user_id: userId, product_id: productId, order_id: orderId, review_text: reviewText, payout_earned: payoutEarned, status: 'Pending' }
            });
        }
        // Record submission
        const { data: submission, error: insertError } = await supabase
            .from('review_submissions')
            .insert({
            user_id: userId,
            product_id: productId,
            order_id: orderId.trim(),
            review_text: reviewText.trim(),
            payout_earned: payoutEarned,
            status: 'Pending'
        })
            .select()
            .single();
        if (insertError) {
            return res.status(500).json({ error: 'Failed to record review draft: ' + insertError.message });
        }
        res.status(201).json({
            message: 'Review draft successfully recorded. Compliance checks completing in 5 minutes.',
            submission
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 3. Get User Review Submissions List
router.get('/submissions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { data: submissions, error } = await supabase
            .from('review_submissions')
            .select(`
        id,
        order_id,
        review_text,
        status,
        payout_earned,
        created_at,
        product:products (
          title,
          image_url,
          platform
        )
      `)
            .eq('user_id', userId);
        if (error) {
            return res.status(500).json({ error: 'Failed to fetch submissions: ' + error.message });
        }
        // Format list for frontend consumption
        const formattedSubmissions = (submissions || []).map((sub) => ({
            id: sub.id,
            productTitle: sub.product?.title || 'Unknown Product',
            productImage: sub.product?.image_url || '',
            platform: sub.product?.platform || '',
            orderId: sub.order_id,
            reviewText: sub.review_text,
            payout: parseFloat(sub.payout_earned) || 0.00,
            status: sub.status,
            date: new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        }));
        res.json(formattedSubmissions);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// 4. Developer Test Review Approval Override Endpoint
router.post('/override-approve', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        // Fetch all pending reviews for this user
        const { data: pendingReviews, error: fetchError } = await supabase
            .from('review_submissions')
            .select('*, products(platform)')
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
            const platform = review.products?.platform;
            const payout = parseFloat(review.payout_earned) || 1.00;
            const { data: balanceRecord } = await supabase
                .from('platform_balances')
                .select('wallet_balance, reviews_count, current_position')
                .eq('user_id', userId)
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
                .eq('user_id', userId)
                .eq('platform', platform);
        }
        res.json({ success: true, message: 'Developer status override: Pending reviews authorized.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
export default router;
