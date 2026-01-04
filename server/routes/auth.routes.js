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
    body('email')
        .isEmail().withMessage('Недопустимый формат Email')
        .matches(/^(?=.*[a-zA-Z])[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/).withMessage('Email должен содержать минимум одну латинскую букву. Использование только цифр не допускается'),
    body('password')
        .isLength({ min: 6 }).withMessage('Пароль должен содержать минимум 6 символов')
        .matches(/^[a-zA-Z0-9]+$/).withMessage('Пароль должен содержать только латинские буквы и цифры'),
    body('login')
        .isLength({ min: 3 }).withMessage('Логин должен содержать минимум 3 символа')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Логин должен содержать только латинские буквы, цифры и подчеркивание'),
    body('telegram')
        .optional()
        .matches(/^@?(?=.*[a-zA-Z])[a-zA-Z0-9_]{5,32}$/).withMessage('Некорректный формат Telegram username. Требования: 5-32 символа, минимум одна латинская буква'),
    body('referralCode').optional()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }
        
        const { email, login, password, telegram, referralCode } = req.body;
        
        console.log(`📥 /api/auth/register: email=${email}, login=${login}`);
        
        // Check if user exists
        const existing = await db.getAsync(
            'SELECT * FROM users WHERE email = ? OR login = ?',
            [email, login]
        );
        
        if (existing) {
            return res.status(400).json({ 
                success: false, 
                message: 'Учётная запись с указанным Email или логином уже зарегистрирована в системе. Используйте другие данные или воспользуйтесь функцией восстановления пароля' 
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
        
        // Find super-partner if referralCode provided
        let superPartnerId = null;
        if (referralCode) {
            console.log(`🔗 Partner registered with referral code: ${referralCode}`);
            superPartnerId = await ReferralService.findPartnerByCode(referralCode);
            
            if (superPartnerId) {
                console.log(`💎 Super-partner found: ${superPartnerId}`);
            } else {
                console.warn(`⚠️ Referral code ${referralCode} not found`);
            }
        }
        
        // Create referral stats with sub_partner_id
        const newReferralCode = ReferralService.generateReferralCode(userId);
        await db.runAsync(
            'INSERT INTO referral_stats (user_id, referral_code, sub_partner_id) VALUES (?, ?, ?)',
            [userId, newReferralCode, superPartnerId]
        );
        
        // Generate token
        const token = generateToken(userId);
        
        console.log(`✅ User registered: id=${userId}, code=${newReferralCode}, super-partner=${superPartnerId || 'none'}`);
        
        res.json({
            success: true,
            message: 'Registration successful',
            token,
            referralCode: newReferralCode,
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
        
        // ИСПОЛЬЗУЕМ РЕАЛЬНЫЙ БАЛАНС ИЗ БД, НЕ ВЫЧИСЛЯЕМ!
        console.log(`💰 Balance from database for user ${req.userId}: ${user.balance}₽`);
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                login: user.login,
                telegram: user.telegram || '',
                balance: user.balance || 0,  // РЕАЛЬНЫЙ баланс из таблицы users
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
    try {
        const { db: database } = require('../config/database');
        const user = await database.getAsync(
            'SELECT two_factor_enabled, two_factor_secret FROM users WHERE id = ?',
            [req.userId]
        );
        
        const isEnabled = user && user.two_factor_enabled === 1;
        const secret = isEnabled ? user.two_factor_secret : null;
        
        console.log('📋 2FA Status check:', {
            userId: req.userId,
            enabled: isEnabled,
            hasSecret: !!secret
        });
        
        res.json({
            success: true,
            twoFactorEnabled: isEnabled,
            secret: secret  // Возвращаем secret если 2FA включен
        });
    } catch (error) {
        console.error('❌ Error checking 2FA status:', error);
        res.json({
            success: true,
            twoFactorEnabled: false,
            secret: null
        });
    }
});

/**
 * POST /api/2fa/enable
 * Enable 2FA by verifying token
 */
router.post('/2fa/enable', jwtAuth, async (req, res) => {
    try {
        const { secret, token } = req.body;
        
        if (!secret || !token) {
            return res.status(400).json({
                success: false,
                message: 'Secret and token are required'
            });
        }
        
        // Verify the token using speakeasy
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2 // Allow 2 steps before/after (60 seconds tolerance)
        });
        
        if (!verified) {
            console.log('❌ 2FA verification failed:', { userId: req.userId, token });
            return res.json({
                success: false,
                message: 'Неверный код. Проверьте код в приложении'
            });
        }
        
        // Save secret to database for this user
        const { db: database } = require('../config/database');
        await database.runAsync(
            'UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1 WHERE id = ?',
            [secret, req.userId]
        );
        
        console.log('✅ 2FA enabled and saved to DB:', { userId: req.userId });
        
        res.json({
            success: true,
            message: '2FA успешно подключен!'
        });
        
    } catch (error) {
        console.error('❌ Error enabling 2FA:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка подключения 2FA: ' + error.message
        });
    }
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

/**
 * POST /api/2fa/verify-withdrawal
 * Verify 2FA code for withdrawal
 */
router.post('/2fa/verify-withdrawal', jwtAuth, async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Код не указан'
            });
        }
        
        // Получаем секрет пользователя из БД
        const { db: database } = require('../config/database');
        const user = await database.getAsync(
            'SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = ?',
            [req.userId]
        );
        
        if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
            return res.json({
                success: false,
                message: '2FA не подключен к вашему аккаунту'
            });
        }
        
        // Verify the token using speakeasy
        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: token,
            window: 2 // Allow 2 steps before/after (60 seconds tolerance)
        });
        
        if (!verified) {
            console.log('❌ 2FA withdrawal verification failed:', { userId: req.userId, token });
            return res.json({
                success: false,
                message: 'Неверный код. Проверьте код в приложении'
            });
        }
        
        console.log('✅ 2FA withdrawal verified:', { userId: req.userId });
        
        res.json({
            success: true,
            message: 'Код подтверждён'
        });
        
    } catch (error) {
        console.error('❌ Error verifying 2FA for withdrawal:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка проверки 2FA: ' + error.message
        });
    }
});

module.exports = router;
