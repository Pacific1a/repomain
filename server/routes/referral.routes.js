// ============================================
// REFERRAL API ROUTES
// Handles all referral system endpoints
// ============================================

const express = require('express');
const router = express.Router();
const ReferralService = require('../services/referral.service');
const { webhookAuth } = require('../middleware/webhook');
const { jwtAuth } = require('../middleware/auth');

// ============================================
// WEBHOOK ENDPOINTS (from Python bot)
// ============================================

/**
 * POST /api/referral/register
 * Register click on referral link
 * Called when user opens bot via t.me/bot?start=ref_CODE
 */
router.post('/register', webhookAuth, async (req, res) => {
    try {
        const { userId, referrerId, nickname, photoUrl } = req.body;
        
        console.log(`📥 /api/referral/register: userId=${userId}, referrerId=${referrerId}, nickname=${nickname || 'N/A'}`);
        
        if (!userId || !referrerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing userId or referrerId' 
            });
        }
        
        const result = await ReferralService.registerClick(referrerId, userId, nickname, photoUrl);
        res.json(result);
    } catch (error) {
        console.error('❌ /api/referral/register error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

/**
 * POST /api/referral/register-referral
 * Register first deposit
 * Called when referred user makes their first deposit
 */
router.post('/register-referral', webhookAuth, async (req, res) => {
    try {
        const { referralCode, referralUserId, depositAmount } = req.body;
        
        console.log(`📥 /api/referral/register-referral: code=${referralCode}, user=${referralUserId}, amount=${depositAmount}`);
        
        if (!referralCode || !referralUserId || !depositAmount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }
        
        const result = await ReferralService.registerFirstDeposit(referralCode, referralUserId, depositAmount);
        res.json(result);
    } catch (error) {
        console.error('❌ /api/referral/register-referral error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

/**
 * POST /api/referral/update-deposit
 * Update deposit (repeated deposit)
 * Called when referred user makes another deposit
 */
router.post('/update-deposit', webhookAuth, async (req, res) => {
    try {
        const { referralCode, referralUserId, depositAmount } = req.body;
        
        console.log(`📥 /api/referral/update-deposit: code=${referralCode}, user=${referralUserId}, amount=${depositAmount}`);
        
        if (!referralCode || !referralUserId || !depositAmount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }
        
        const result = await ReferralService.updateDeposit(referralCode, referralUserId, depositAmount);
        res.json(result);
    } catch (error) {
        console.error('❌ /api/referral/update-deposit error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

/**
 * POST /api/referral/add-earnings
 * Add earnings to partner when referred user makes a deposit
 * Partner gets 10% of the deposit
 * PUBLIC endpoint for miniapp
 * 
 * Body: { referralUserId: "1889923046", depositAmount: 100 }
 * Legacy: also accepts lossAmount for backwards compatibility
 */
router.post('/add-earnings', async (req, res) => {
    try {
        const { referralUserId, depositAmount, lossAmount, userId } = req.body;
        
        // Принимаем либо referralUserId либо userId для совместимости
        const actualUserId = referralUserId || userId;
        
        // Принимаем depositAmount или lossAmount (legacy)
        const actualAmount = depositAmount || lossAmount;
        
        console.log(`📥 /api/referral/add-earnings: referralUser=${actualUserId}, deposit=${actualAmount}₽`);
        
        if (!actualUserId || !actualAmount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing referralUserId (or userId) and depositAmount' 
            });
        }
        
        // addEarnings теперь ищет партнёра по referralUserId
        const result = await ReferralService.addEarnings(null, actualUserId, actualAmount);
        res.json(result);
    } catch (error) {
        console.error('❌ /api/referral/add-earnings error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ============================================
// PUBLIC ENDPOINTS (for miniapp)
// ============================================

/**
 * GET /api/referral/:userId
 * Get referral data for user (miniapp)
 */
router.get('/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log(`📥 /api/referral/${userId}: GET referral data`);
        
        const stats = await ReferralService.getOrCreateReferralStats(userId);
        const referrals = await ReferralService.getReferralsList(userId);
        
        res.json({
            success: true,
            referralCode: stats.referral_code,
            balance: stats.balance || 0,
            totalReferrals: stats.total_referrals || 0,
            totalDeposits: stats.total_deposits || 0,
            totalEarnings: stats.earnings || 0,  // ✅ ИСПРАВЛЕНО: earnings вместо total_earnings
            referrals: referrals || []
        });
    } catch (error) {
        console.error('❌ /api/referral/:userId error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// PARTNER SITE ENDPOINTS (JWT authenticated)
// ============================================

/**
 * GET /api/referral/partner/stats
 * Get partner statistics
 * Used by partner dashboard
 */
router.get('/partner/stats', jwtAuth, async (req, res) => {
    try {
        console.log(`📥 /api/referral/partner/stats: userId=${req.userId}`);
        
        const stats = await ReferralService.getPartnerStats(req.userId);
        
        console.log('📊 Sending stats:', stats);
        
        res.json(stats);  // Возвращаем напрямую, без вложенности
    } catch (error) {
        console.error('❌ /api/referral/partner/stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

/**
 * GET /api/referral/partner/stats/timeline
 * Get timeline data for charts
 * Query params: period (week, month, 3months, 6months, year)
 */
router.get('/partner/stats/timeline', jwtAuth, async (req, res) => {
    try {
        const period = req.query.period || 'week';
        
        console.log(`📥 /api/referral/partner/stats/timeline: userId=${req.userId}, period=${period}`);
        
        const data = await ReferralService.getTimeline(req.userId, period);
        res.json({ 
            success: true, 
            ...data 
        });
    } catch (error) {
        console.error('❌ /api/referral/partner/stats/timeline error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

/**
 * GET /api/referral/partner/referrals
 * Get list of referrals
 */
router.get('/partner/referrals', jwtAuth, async (req, res) => {
    try {
        console.log(`📥 /api/referral/partner/referrals: userId=${req.userId}`);
        
        const referrals = await ReferralService.getReferralsList(req.userId);
        res.json({ 
            success: true, 
            referrals 
        });
    } catch (error) {
        console.error('❌ /api/referral/partner/referrals error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ============================================
// SUB-PARTNER ENDPOINTS (2-level referral)
// ============================================

/**
 * GET /api/referral/sub-partners/stats
 * Get sub-partner statistics (total earnings, partner count)
 */
router.get('/sub-partners/stats', jwtAuth, async (req, res) => {
    try {
        console.log(`📥 /api/referral/sub-partners/stats: userId=${req.userId}`);
        
        const stats = await ReferralService.getSubPartnerStats(req.userId);
        res.json({ 
            success: true, 
            ...stats 
        });
    } catch (error) {
        console.error('❌ /api/referral/sub-partners/stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

/**
 * GET /api/referral/sub-partners/list
 * Get list of recruited partners
 */
router.get('/sub-partners/list', jwtAuth, async (req, res) => {
    try {
        console.log(`📥 /api/referral/sub-partners/list: userId=${req.userId}`);
        
        const partners = await ReferralService.getSubPartnersList(req.userId);
        res.json({ 
            success: true, 
            partners 
        });
    } catch (error) {
        console.error('❌ /api/referral/sub-partners/list error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

module.exports = router;
