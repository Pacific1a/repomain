// ============================================
// JWT AUTHENTICATION MIDDLEWARE
// For partner site authentication
// ============================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Middleware to verify JWT token from Authorization header
 * Used for partner site endpoints
 */
const jwtAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            message: 'Токен не предоставлен' 
        });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        
        console.log(`✅ JWT Auth: userId=${req.userId}`);
        next();
    } catch (error) {
        console.error('❌ JWT Auth failed:', error.message);
        return res.status(401).json({ 
            success: false, 
            message: 'Неверный токен' 
        });
    }
};

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

module.exports = { jwtAuth, generateToken };
