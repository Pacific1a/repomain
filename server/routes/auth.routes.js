// ============================================
// AUTHENTICATION ROUTES
// Partner site registration and login
// ============================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');
const { jwtAuth, generateToken } = require('../middleware/auth');
const ReferralService = require('../services/referral.service');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

/**
 * POST /api/auth/register
 * Register new partner
 */
router.post('/register', [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('login').isLength({ min: 3 }).withMessage('Login must be at least 3 characters'),
    body('telegram').optional()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }
        
        const { email, login, password, telegram } = req.body;
        
        console.log(`📥 /api/auth/register: email=${email}, login=${login}`);
        
        // Check if user exists
        const existing = await db.getAsync(
            'SELECT * FROM users WHERE email = ? OR login = ?',
            [email, login]
        );
        
        if (existing) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email or login already exists' 
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const result = await db.runAsync(
            'INSERT INTO users (email, login, password, telegram) VALUES (?, ?, ?, ?)',
            [email, login, hashedPassword, telegram || null]
        );
        
        const userId = result.lastID;
        
        // Create referral stats
        const referralCode = ReferralService.generateReferralCode(userId);
        await db.runAsync(
            'INSERT INTO referral_stats (user_id, referral_code) VALUES (?, ?)',
            [userId, referralCode]
        );
        
        // Generate token
        const token = generateToken(userId);
        
        console.log(`✅ User registered: id=${userId}, code=${referralCode}`);
        
        res.json({
            success: true,
            message: 'Registration successful',
            token,
            referralCode,
            user: {
                id: userId,
                email,
                login,
                telegram: telegram || '',
                balance: 0,
                role: 'user'
            }
        });
    } catch (error) {
        console.error('❌ /api/auth/register error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

/**
 * POST /api/auth/login
 * Login partner
 */
router.post('/login', [
    body('emailOrLogin').notEmpty().withMessage('Email or login required'),
    body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }
        
        const { emailOrLogin, password } = req.body;
        
        console.log(`📥 /api/auth/login: emailOrLogin=${emailOrLogin}`);
        
        // Find user
        const user = await db.getAsync(
            'SELECT * FROM users WHERE email = ? OR login = ?',
            [emailOrLogin, emailOrLogin]
        );
        
        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid email/login or password' 
            });
        }
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid email/login or password' 
            });
        }
        
        // Update last login
        await db.runAsync(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );
        
        // Generate token
        const token = generateToken(user.id);
        
        console.log(`✅ User logged in: id=${user.id}`);
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                login: user.login,
                telegram: user.telegram || '',
                balance: user.balance,
                role: user.role || 'user'
            }
        });
    } catch (error) {
        console.error('❌ /api/auth/login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

/**
 * GET /api/auth/user
 * Get current user info
 */
router.get('/user', jwtAuth, async (req, res) => {
    try {
        console.log(`📥 /api/auth/user: userId=${req.userId}`);
        
        const user = await db.getAsync(
            'SELECT id, email, login, telegram, balance, role FROM users WHERE id = ?',
            [req.userId]
        );
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                login: user.login,
                telegram: user.telegram || '',
                balance: user.balance,
                role: user.role || 'user'
            }
        });
    } catch (error) {
        console.error('❌ /api/auth/user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// ============================================
// 2FA ENDPOINTS (заглушки для совместимости)
// ============================================

/**
 * GET /api/2fa/status
 * Get 2FA status
 */
/**
 * POST /api/2fa/setup
 * Generate QR code and secret for Google Authenticator
 */
router.post('/2fa/setup', jwtAuth, async (req, res) => {
    try {
        // Получаем данные пользователя
        const user = await db.getAsync('SELECT email, login FROM users WHERE id = ?', [req.userId]);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        // Генерируем секрет для 2FA
        const secret = speakeasy.generateSecret({
            name: `DUO Partners (${user.login || user.email})`,
            issuer: 'DUO Partners'
        });
        
        // Генерируем QR код
        const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);
        
        console.log('✅ 2FA setup:', {
            userId: req.userId,
            login: user.login,
            secretLength: secret.base32.length
        });
        
        res.json({
            success: true,
            secret: secret.base32,
            code: secret.base32,
            qrCode: qrCodeDataUrl,
            message: '2FA QR код сгенерирован'
        });
        
    } catch (error) {
        console.error('❌ Error generating 2FA:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка генерации 2FA: ' + error.message
        });
    }
});

/**
 * GET /api/2fa/status
 * Check if 2FA is enabled
 */
router.get('/2fa/status', jwtAuth, async (req, res) => {
    res.json({
        success: true,
        twoFactorEnabled: false,
        message: '2FA not implemented yet'
    });
});

/**
 * POST /api/2fa/enable
 * Enable 2FA
 */
router.post('/2fa/enable', jwtAuth, async (req, res) => {
    res.json({
        success: false,
        message: '2FA not implemented yet'
    });
});

/**
 * POST /api/2fa/disable
 * Disable 2FA
 */
router.post('/2fa/disable', jwtAuth, async (req, res) => {
    res.json({
        success: false,
        message: '2FA not implemented yet'
    });
});

module.exports = router;
