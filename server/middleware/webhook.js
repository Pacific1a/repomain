// ============================================
// WEBHOOK AUTHENTICATION MIDDLEWARE
// For Python bot webhook authentication
// ============================================

const PARTNER_API_SECRET = process.env.PARTNER_API_SECRET || 'default-secret-key';

/**
 * Middleware to verify webhook requests from Python bot
 * Checks X-API-Secret header
 */
const webhookAuth = (req, res, next) => {
    const apiSecret = req.headers['x-api-secret'];
    
    if (!apiSecret) {
        console.warn('⚠️ Webhook attempt without X-API-Secret header from:', req.ip);
        return res.status(401).json({ 
            success: false, 
            message: 'Unauthorized: Missing API secret' 
        });
    }
    
    if (apiSecret !== PARTNER_API_SECRET) {
        console.warn('⚠️ Webhook attempt with invalid API secret from:', req.ip);
        return res.status(401).json({ 
            success: false, 
            message: 'Unauthorized: Invalid API secret' 
        });
    }
    
    console.log('✅ Webhook authenticated');
    next();
};

module.exports = { webhookAuth };
