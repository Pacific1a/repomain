const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const path = require('path');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SITE_URL = process.env.SITE_URL || 'http://localhost:5500';

// Настройка nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.use(cors());
// НЕ используем express.json() глобально, чтобы не конфликтовать с multer
// Вместо этого применяем для каждого роута отдельно (кроме /api/materials)
app.use((req, res, next) => {
    // Пропускаем express.json() для загрузки файлов
    if (req.path === '/api/materials' && req.method === 'POST') {
        return next();
    }
    express.json()(req, res, next);
});
app.use(express.static(path.join(__dirname, '..')));

// Папка для загрузки файлов
const uploadsDir = path.join(__dirname, '..', 'uploads');
const videosDir = path.join(uploadsDir, 'videos');

// Создаем папки если их нет
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir);
}

// Раздаем статические файлы из uploads
app.use('/uploads', express.static(uploadsDir));

// Настройка multer для загрузки видео
const videoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, videosDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'video-' + uniqueSuffix + ext);
    }
});

const videoUpload = multer({
    storage: videoStorage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB максимум
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Неподдерживаемый формат видео. Используйте MP4, WebM или OGG'));
        }
    }
});

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initDatabase();
    }
});

function initDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        login TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        telegram TEXT,
        balance REAL DEFAULT 0,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        reset_token TEXT,
        reset_token_expiry DATETIME,
        twofa_secret TEXT,
        twofa_enabled INTEGER DEFAULT 0
    )`, (err) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('Users table ready');
            // Добавляем поля для существующих БД
            db.run(`ALTER TABLE users ADD COLUMN twofa_secret TEXT`, () => {});
            db.run(`ALTER TABLE users ADD COLUMN twofa_enabled INTEGER DEFAULT 0`, () => {});
            db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, () => {});
        }
    });
    
    // Создаём таблицу materials
    db.run(`CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        format TEXT,
        size TEXT,
        preview_image TEXT,
        video_url TEXT,
        content_url TEXT,
        telegraph_url TEXT,
        type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating materials table:', err);
        } else {
            console.log('Materials table ready');
            // Добавляем новые поля для существующих таблиц
            db.run(`ALTER TABLE materials ADD COLUMN video_url TEXT`, () => {});
            db.run(`ALTER TABLE materials ADD COLUMN content_url TEXT`, () => {});
            db.run(`ALTER TABLE materials ADD COLUMN telegraph_url TEXT`, () => {});
        }
    });
}

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Токен не предоставлен' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Неверный токен' });
    }
};

app.post('/api/register', [
    body('email').isEmail().withMessage('Неверный формат email'),
    body('password').isLength({ min: 6 }).withMessage('Пароль должен быть минимум 6 символов'),
    body('login').isLength({ min: 3 }).withMessage('Логин должен быть минимум 3 символа'),
    body('telegram').optional()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { email, login, password, telegram } = req.body;
    
    try {
        db.get('SELECT * FROM users WHERE email = ? OR login = ?', [email, login], async (err, row) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Ошибка базы данных' });
            }
            
            if (row) {
                return res.status(400).json({ success: false, message: 'Email или логин уже используются' });
            }
            
            const hashedPassword = await bcrypt.hash(password, 10);
            
            db.run('INSERT INTO users (email, login, password, telegram) VALUES (?, ?, ?, ?)',
                [email, login, hashedPassword, telegram || null],
                function(err) {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Ошибка регистрации' });
                    }
                    
                    const token = jwt.sign({ userId: this.lastID }, JWT_SECRET, { expiresIn: '7d' });
                    
                    res.json({
                        success: true,
                        message: 'Регистрация успешна',
                        token,
                        user: {
                            id: this.lastID,
                            email,
                            login,
                            telegram: telegram || '',
                            balance: 0,
                            role: 'user'
                        }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

app.post('/api/login', [
    body('emailOrLogin').notEmpty().withMessage('Email или логин обязательны'),
    body('password').notEmpty().withMessage('Пароль обязателен')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { emailOrLogin, password } = req.body;
    
    try {
        db.get('SELECT * FROM users WHERE email = ? OR login = ?', [emailOrLogin, emailOrLogin], async (err, user) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Ошибка базы данных' });
            }
            
            if (!user) {
                return res.status(400).json({ success: false, message: 'Неверный email/логин или пароль' });
            }
            
            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (!isValidPassword) {
                return res.status(400).json({ success: false, message: 'Неверный email/логин или пароль' });
            }
            
            db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
            
            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
            
            res.json({
                success: true,
                message: 'Вход выполнен успешно',
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
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

app.post('/api/reset-password', [
    body('emailOrLogin').notEmpty().withMessage('Email или логин обязательны')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { emailOrLogin } = req.body;
    
    db.get('SELECT * FROM users WHERE email = ? OR login = ?', [emailOrLogin, emailOrLogin], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка базы данных' });
        }
        
        if (!user) {
            return res.json({ success: true, message: 'Если аккаунт существует, письмо будет отправлено' });
        }
        
        const resetToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
        const expiry = new Date(Date.now() + 3600000);
        
        db.run('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
            [resetToken, expiry.toISOString(), user.id],
            async (err) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Ошибка сервера' });
                }
                
                // Ссылка для сброса пароля
                const resetLink = `${SITE_URL}/user/reset-password/index.html?token=${resetToken}`;
                
                console.log(`Reset link for ${user.email}: ${resetLink}`);
                
                // Если email настроен - отправляем письмо
                if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                    try {
                        await transporter.sendMail({
                            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                            to: user.email,
                            subject: 'Восстановление пароля - DUO PARTNERS',
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                    <h2 style="color: #604141;">Восстановление пароля</h2>
                                    <p>Вы запросили восстановление пароля для вашего аккаунта.</p>
                                    <p>Нажмите на кнопку ниже для смены пароля:</p>
                                    <a href="${resetLink}" 
                                       style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #604141, #6C4F4F); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">
                                        Сменить пароль
                                    </a>
                                    <p style="color: #666; font-size: 14px;">Или скопируйте эту ссылку в браузер:</p>
                                    <p style="color: #604141; word-break: break-all;">${resetLink}</p>
                                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                                        Ссылка действительна в течение 1 часа.<br>
                                        Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.
                                    </p>
                                </div>
                            `
                        });
                        
                        console.log('Email sent successfully');
                    } catch (emailError) {
                        console.error('Email send error:', emailError);
                        // Не возвращаем ошибку пользователю, продолжаем
                    }
                }
                
                res.json({
                    success: true,
                    message: 'Письмо с инструкцией отправлено на email',
                    // В режиме разработки возвращаем ссылку
                    ...(process.env.NODE_ENV !== 'production' && { resetLink })
                });
            }
        );
    });
});

app.post('/api/confirm-reset-password', [
    body('resetToken').notEmpty().withMessage('Токен обязателен'),
    body('newPassword').isLength({ min: 6 }).withMessage('Пароль должен быть минимум 6 символов')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { resetToken, newPassword } = req.body;
    
    try {
        const decoded = jwt.verify(resetToken, JWT_SECRET);
        
        db.get('SELECT * FROM users WHERE id = ? AND reset_token = ?', [decoded.userId, resetToken], async (err, user) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Ошибка базы данных' });
            }
            
            if (!user) {
                return res.status(400).json({ success: false, message: 'Неверный или истёкший токен' });
            }
            
            if (new Date(user.reset_token_expiry) < new Date()) {
                return res.status(400).json({ success: false, message: 'Токен истёк' });
            }
            
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            db.run('UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
                [hashedPassword, user.id],
                (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Ошибка обновления пароля' });
                    }
                    
                    res.json({
                        success: true,
                        message: 'Пароль успешно изменён'
                    });
                }
            );
        });
    } catch (error) {
        return res.status(400).json({ success: false, message: 'Неверный или истёкший токен' });
    }
});

app.get('/api/user', authMiddleware, (req, res) => {
    db.get('SELECT id, email, login, telegram, balance, role FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка базы данных' });
        }
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
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
    });
});

app.put('/api/user/update', authMiddleware, [
    body('email').optional().isEmail().withMessage('Неверный формат email'),
    body('login').optional().isLength({ min: 3 }).withMessage('Логин должен быть минимум 3 символа'),
    body('telegram').optional()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { email, login, telegram, oldPassword, newPassword } = req.body;
    
    db.get('SELECT * FROM users WHERE id = ?', [req.userId], async (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка базы данных' });
        }
        
        const updates = {};
        
        // Проверка уникальности email
        if (email && email !== user.email) {
            const existingEmail = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (existingEmail) {
                return res.status(400).json({ success: false, message: 'Email уже используется другим пользователем' });
            }
            
            updates.email = email;
        }
        
        // Проверка уникальности login
        if (login && login !== user.login) {
            const existingLogin = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM users WHERE login = ? AND id != ?', [login, req.userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (existingLogin) {
                return res.status(400).json({ success: false, message: 'Логин уже используется другим пользователем' });
            }
            
            updates.login = login;
        }
        
        if (telegram !== undefined) {
            updates.telegram = telegram;
        }
        
        if (oldPassword && newPassword) {
            const isValidPassword = await bcrypt.compare(oldPassword, user.password);
            if (!isValidPassword) {
                return res.status(400).json({ success: false, message: 'Неверный старый пароль' });
            }
            updates.password = await bcrypt.hash(newPassword, 10);
        }
        
        if (Object.keys(updates).length === 0) {
            return res.json({ success: true, message: 'Нет изменений' });
        }
        
        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), req.userId];
        
        db.run(`UPDATE users SET ${setClause} WHERE id = ?`, values, (err) => {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ success: false, message: 'Email или логин уже используются' });
                }
                return res.status(500).json({ success: false, message: 'Ошибка обновления' });
            }
            
            res.json({
                success: true,
                message: 'Данные обновлены успешно',
                user: {
                    email: updates.email || user.email,
                    login: updates.login || user.login,
                    telegram: updates.telegram !== undefined ? updates.telegram : user.telegram,
                    balance: user.balance
                }
            });
        });
    });
});

// ============================================
// 2FA ENDPOINTS
// ============================================

// Генерация секрета и QR кода для 2FA
app.post('/api/2fa/setup', authMiddleware, async (req, res) => {
    try {
        // Получаем email пользователя для отображения в приложении
        db.get('SELECT email FROM users WHERE id = ?', [req.userId], async (err, user) => {
            if (err || !user) {
                return res.status(500).json({ success: false, message: 'Ошибка получения данных' });
            }
            
            const secret = speakeasy.generateSecret({
                name: `DUO PARTNERS (${user.email})`,
                issuer: 'DUO PARTNERS',
                length: 32
            });
            
            console.log('2FA Setup for user:', req.userId);
            console.log('- Email:', user.email);
            console.log('- Secret generated:', secret.base32);
            console.log('- OTPAuth URL:', secret.otpauth_url);
            
            // Генерируем QR код
            const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
            
            res.json({
                success: true,
                secret: secret.base32,
                qrCode: qrCodeUrl
            });
        });
    } catch (error) {
        console.error('2FA setup error:', error);
        res.status(500).json({ success: false, message: 'Ошибка генерации 2FA' });
    }
});

// Включение 2FA (проверка кода и сохранение секрета)
app.post('/api/2fa/enable', authMiddleware, [
    body('secret').notEmpty().withMessage('Секрет обязателен'),
    body('token').notEmpty().withMessage('Код обязателен')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { secret, token } = req.body;
    
    console.log('2FA Enable attempt:');
    console.log('- User ID:', req.userId);
    console.log('- Token entered:', token);
    console.log('- Secret:', secret);
    
    // Проверяем код с увеличенным окном времени (6 интервалов = ±3 минуты)
    const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 6 // Увеличено с 2 до 6 для компенсации разницы времени
    });
    
    console.log('- Verification result:', verified);
    
    if (!verified) {
        // Дополнительная проверка - генерируем текущий правильный код для отладки
        const currentToken = speakeasy.totp({
            secret: secret,
            encoding: 'base32'
        });
        console.log('- Current valid token should be:', currentToken);
        
        return res.status(400).json({ 
            success: false, 
            message: 'Неверный код. Попробуйте использовать следующий код из приложения.' 
        });
    }
    
    // Сохраняем секрет и включаем 2FA
    db.run('UPDATE users SET twofa_secret = ?, twofa_enabled = 1 WHERE id = ?',
        [secret, req.userId],
        (err) => {
            if (err) {
                console.error('2FA save error:', err);
                return res.status(500).json({ success: false, message: 'Ошибка сохранения' });
            }
            
            console.log('✅ 2FA successfully enabled for user', req.userId);
            
            res.json({
                success: true,
                message: '2FA успешно подключен'
            });
        }
    );
});

// Отключение 2FA
app.post('/api/2fa/disable', authMiddleware, [
    body('token').notEmpty().withMessage('Код обязателен')
], (req, res) => {
    const { token } = req.body;
    
    db.get('SELECT twofa_secret, twofa_enabled FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка базы данных' });
        }
        
        if (!user.twofa_enabled) {
            return res.status(400).json({ success: false, message: '2FA не подключен' });
        }
        
        console.log('2FA Disable attempt:');
        console.log('- User ID:', req.userId);
        console.log('- Token entered:', token);
        
        // Проверяем код с увеличенным окном
        const verified = speakeasy.totp.verify({
            secret: user.twofa_secret,
            encoding: 'base32',
            token: token,
            window: 6
        });
        
        console.log('- Verification result:', verified);
        
        if (!verified) {
            return res.status(400).json({ success: false, message: 'Неверный код' });
        }
        
        // Отключаем 2FA
        db.run('UPDATE users SET twofa_secret = NULL, twofa_enabled = 0 WHERE id = ?',
            [req.userId],
            (err) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Ошибка отключения' });
                }
                
                console.log('✅ 2FA successfully disabled for user', req.userId);
                
                res.json({
                    success: true,
                    message: '2FA успешно отключен'
                });
            }
        );
    });
});

// Проверка статуса 2FA
app.get('/api/2fa/status', authMiddleware, (req, res) => {
    db.get('SELECT twofa_enabled FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка базы данных' });
        }
        
        res.json({
            success: true,
            enabled: !!user.twofa_enabled
        });
    });
});

// Полный сброс 2FA (без проверки кода) - для случаев потери доступа к Google Authenticator
app.post('/api/2fa/reset', authMiddleware, (req, res) => {
    console.log('2FA Reset requested for user:', req.userId);
    
    // Сбрасываем 2FA полностью
    db.run('UPDATE users SET twofa_secret = NULL, twofa_enabled = 0 WHERE id = ?',
        [req.userId],
        (err) => {
            if (err) {
                console.error('2FA reset error:', err);
                return res.status(500).json({ success: false, message: 'Ошибка сброса 2FA' });
            }
            
            console.log('✅ 2FA completely reset for user', req.userId);
            
            res.json({
                success: true,
                message: '2FA полностью сброшен. Вы можете подключить его заново.'
            });
        }
    );
});

// Проверка 2FA кода (для вывода средств и других операций)
app.post('/api/2fa/verify', authMiddleware, [
    body('token').notEmpty().withMessage('Код обязателен')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { token } = req.body;
    
    console.log('2FA Verify attempt:');
    console.log('- User ID:', req.userId);
    console.log('- Token entered:', token);
    
    // Получаем секрет пользователя
    db.get('SELECT twofa_secret, twofa_enabled FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка базы данных' });
        }
        
        if (!user.twofa_enabled) {
            return res.status(400).json({ success: false, message: '2FA не подключен' });
        }
        
        // Проверяем код
        const verified = speakeasy.totp.verify({
            secret: user.twofa_secret,
            encoding: 'base32',
            token: token,
            window: 6
        });
        
        console.log('- Verification result:', verified);
        
        if (!verified) {
            return res.status(400).json({ success: false, message: 'Неверный код' });
        }
        
        console.log('✅ 2FA code verified for user', req.userId);
        
        res.json({
            success: true,
            message: 'Код верен'
        });
    });
});

// ============================================
// РЕФЕРАЛЬНАЯ СИСТЕМА
// ============================================

// Создание таблицы для реферальной статистики (если не существует)
db.run(`CREATE TABLE IF NOT EXISTS referral_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    clicks INTEGER DEFAULT 0,
    first_deposits INTEGER DEFAULT 0,
    deposits INTEGER DEFAULT 0,
    total_deposits REAL DEFAULT 0,
    earnings REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)`);

// Создание таблицы для рефералов
db.run(`CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL,
    referral_user_id TEXT NOT NULL,
    first_deposit_amount REAL DEFAULT 0,
    total_deposits REAL DEFAULT 0,
    total_earnings REAL DEFAULT 0,
    deposits_count INTEGER DEFAULT 0,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES users(id)
)`);

// Получение реферальной статистики партнера
app.get('/api/referral/partner/stats', authMiddleware, (req, res) => {
    const userId = req.userId;
    
    // Получаем или создаем реферальный код
    db.get('SELECT * FROM referral_stats WHERE user_id = ?', [userId], (err, stats) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка базы данных' });
        }
        
        if (!stats) {
            // Создаем новую запись со случайным кодом
            const referralCode = generateReferralCode(userId);
            
            db.run('INSERT INTO referral_stats (user_id, referral_code) VALUES (?, ?)', 
                [userId, referralCode], 
                function(err) {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Ошибка создания кода' });
                    }
                    
                    res.json({
                        success: true,
                        referralCode: referralCode,
                        stats: {
                            clicks: 0,
                            firstDeposits: 0,
                            deposits: 0,
                            totalDeposits: 0,
                            costPerClick: 0,
                            avgIncomePerPlayer: 0
                        }
                    });
                }
            );
        } else {
            // Рассчитываем метрики
            const costPerClick = stats.clicks > 0 ? (stats.earnings / stats.clicks).toFixed(2) : 0;
            const avgIncomePerPlayer = stats.first_deposits > 0 ? (stats.total_deposits / stats.first_deposits).toFixed(2) : 0;
            
            res.json({
                success: true,
                referralCode: stats.referral_code,
                stats: {
                    clicks: stats.clicks,
                    firstDeposits: stats.first_deposits,
                    deposits: stats.deposits,
                    totalDeposits: parseFloat(stats.total_deposits).toFixed(2),
                    costPerClick: costPerClick,
                    avgIncomePerPlayer: avgIncomePerPlayer,
                    earnings: parseFloat(stats.earnings).toFixed(2)
                }
            });
        }
    });
});

// ============ WEBHOOK AUTHENTICATION MIDDLEWARE ============
// Защита реферальных API от несанкционированных запросов
const webhookAuth = (req, res, next) => {
  const apiSecret = req.headers['x-api-secret'];
  const expectedSecret = process.env.PARTNER_API_SECRET;
  
  if (!apiSecret || apiSecret !== expectedSecret) {
    console.warn('⚠️ Unauthorized webhook attempt from:', req.ip);
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }
  
  console.log('✅ Webhook authenticated');
  next();
};

// Регистрация реферала (вызывается из Python бота при /start ref_CODE)
app.post('/api/referral/register', webhookAuth, (req, res) => {
    const { userId, referrerId } = req.body;
    
    console.log(`📥 Referral registration request: userId=${userId}, referrerId=${referrerId}`);
    
    if (!userId || !referrerId) {
        console.error('❌ Missing userId or referrerId');
        return res.status(400).json({ success: false, message: 'Missing userId or referrerId' });
    }
    
    // Проверяем что пользователь не пытается пригласить сам себя
    if (userId === referrerId) {
        console.warn(`⚠️ User ${userId} tried to refer themselves`);
        return res.status(400).json({ success: false, message: 'Cannot refer yourself' });
    }
    
    try {
        // Находим партнёра по его Telegram ID
        const partner = db.prepare('SELECT id, telegram FROM users WHERE telegram = ?').get(referrerId);
        
        if (!partner) {
            console.error(`❌ Partner not found: ${referrerId}`);
            return res.status(404).json({ success: false, message: 'Partner not found' });
        }
        
        console.log(`✅ Partner found: id=${partner.id}, telegram=${partner.telegram}`);
        
        // Проверяем есть ли уже такой реферал
        const existing = db.prepare(`
            SELECT id FROM referrals 
            WHERE partner_id = ? AND referral_user_id = ?
        `).get(partner.id, userId);
        
        if (existing) {
            console.log(`ℹ️ Referral already exists: ${userId} → ${partner.id}`);
            return res.json({ 
                success: true, 
                message: 'Referral already registered',
                alreadyExists: true
            });
        }
        
        // Регистрируем реферала
        const stmt = db.prepare(`
            INSERT INTO referrals (partner_id, referral_user_id, clicks, first_deposits, deposits, earnings, created_at)
            VALUES (?, ?, 1, 0, 0, 0, datetime('now'))
        `);
        
        const result = stmt.run(partner.id, userId);
        
        console.log(`✅ Referral registered: ${userId} → partner ${partner.id}, clicks=1`);
        
        res.json({ 
            success: true, 
            message: 'Referral registered successfully',
            referralId: result.lastInsertRowid,
            partnerId: partner.id
        });
    } catch (error) {
        console.error('❌ Error registering referral:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
});

// Регистрация клика по реферальной ссылке (вызывается из бота)
app.post('/api/referral/click', webhookAuth, (req, res) => {
    const { referralCode } = req.body;
    
    if (!referralCode) {
        return res.status(400).json({ success: false, message: 'Код обязателен' });
    }
    
    db.run('UPDATE referral_stats SET clicks = clicks + 1 WHERE referral_code = ?', 
        [referralCode], 
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Ошибка обновления' });
            }
            
            console.log(`✅ Клик по реферальной ссылке: ${referralCode}`);
            
            res.json({ success: true });
        }
    );
});

// Регистрация реферала (вызывается из бота при первом депозите)
app.post('/api/referral/register-referral', webhookAuth, (req, res) => {
    const { referralCode, referralUserId, depositAmount } = req.body;
    
    if (!referralCode || !referralUserId) {
        return res.status(400).json({ success: false, message: 'Неполные данные' });
    }
    
    // Находим партнера по коду
    db.get('SELECT user_id FROM referral_stats WHERE referral_code = ?', [referralCode], (err, partner) => {
        if (err || !partner) {
            return res.status(404).json({ success: false, message: 'Партнер не найден' });
        }
        
        const partnerId = partner.user_id;
        
        // Проверяем, не зарегистрирован ли уже этот реферал
        db.get('SELECT * FROM referrals WHERE partner_id = ? AND referral_user_id = ?', 
            [partnerId, referralUserId], 
            (err, existing) => {
                if (existing) {
                    return res.status(400).json({ success: false, message: 'Реферал уже зарегистрирован' });
                }
                
                // Добавляем реферала
                db.run(`INSERT INTO referrals (partner_id, referral_user_id, first_deposit_amount, total_deposits, deposits_count) 
                        VALUES (?, ?, ?, ?, 1)`,
                    [partnerId, referralUserId, depositAmount || 0, depositAmount || 0],
                    function(err) {
                        if (err) {
                            return res.status(500).json({ success: false, message: 'Ошибка регистрации' });
                        }
                        
                        // Обновляем статистику партнера
                        db.run(`UPDATE referral_stats 
                                SET first_deposits = first_deposits + 1,
                                    deposits = deposits + 1,
                                    total_deposits = total_deposits + ?
                                WHERE user_id = ?`,
                            [depositAmount || 0, partnerId],
                            (err) => {
                                if (err) {
                                    console.error('Ошибка обновления статистики:', err);
                                }
                                
                                console.log(`✅ Реферал зарегистрирован: ${referralUserId} -> Партнер: ${partnerId}`);
                                
                                res.json({ success: true, message: 'Реферал зарегистрирован' });
                            }
                        );
                    }
                );
            }
        );
    });
});

// Начисление дохода партнеру (вызывается из бота при проигрыше реферала)
app.post('/api/referral/add-earnings', webhookAuth, (req, res) => {
    const { referralCode, referralUserId, lossAmount } = req.body;
    
    if (!referralCode || !referralUserId || !lossAmount) {
        return res.status(400).json({ success: false, message: 'Неполные данные' });
    }
    
    // Находим партнера
    db.get('SELECT user_id FROM referral_stats WHERE referral_code = ?', [referralCode], (err, partner) => {
        if (err || !partner) {
            return res.status(404).json({ success: false, message: 'Партнер не найден' });
        }
        
        const partnerId = partner.user_id;
        
        // Рассчитываем 60% от проигрыша
        const earnings = lossAmount * 0.6;
        
        // Обновляем статистику партнера
        db.run('UPDATE referral_stats SET earnings = earnings + ? WHERE user_id = ?',
            [earnings, partnerId],
            (err) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Ошибка начисления' });
                }
                
                // Обновляем данные реферала
                db.run(`UPDATE referrals 
                        SET total_earnings = total_earnings + ?
                        WHERE partner_id = ? AND referral_user_id = ?`,
                    [earnings, partnerId, referralUserId],
                    (err) => {
                        if (err) {
                            console.error('Ошибка обновления реферала:', err);
                        }
                        
                        console.log(`✅ Начислено партнеру ${partnerId}: ${earnings}₽ (от проигрыша ${lossAmount}₽)`);
                        
                        res.json({ 
                            success: true, 
                            message: 'Доход начислен',
                            earnings: earnings
                        });
                    }
                );
            }
        );
    });
});

// Обновление депозита реферала
app.post('/api/referral/update-deposit', webhookAuth, (req, res) => {
    const { referralCode, referralUserId, depositAmount } = req.body;
    
    if (!referralCode || !referralUserId || !depositAmount) {
        return res.status(400).json({ success: false, message: 'Неполные данные' });
    }
    
    // Находим партнера
    db.get('SELECT user_id FROM referral_stats WHERE referral_code = ?', [referralCode], (err, partner) => {
        if (err || !partner) {
            return res.status(404).json({ success: false, message: 'Партнер не найден' });
        }
        
        const partnerId = partner.user_id;
        
        // Обновляем данные реферала
        db.run(`UPDATE referrals 
                SET total_deposits = total_deposits + ?,
                    deposits_count = deposits_count + 1
                WHERE partner_id = ? AND referral_user_id = ?`,
            [depositAmount, partnerId, referralUserId],
            function(err) {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Ошибка обновления' });
                }
                
                // Обновляем статистику партнера
                db.run(`UPDATE referral_stats 
                        SET deposits = deposits + 1,
                            total_deposits = total_deposits + ?
                        WHERE user_id = ?`,
                    [depositAmount, partnerId],
                    (err) => {
                        if (err) {
                            console.error('Ошибка обновления статистики:', err);
                        }
                        
                        console.log(`✅ Обновлен депозит реферала ${referralUserId}: +${depositAmount}₽`);
                        
                        res.json({ success: true, message: 'Депозит обновлен' });
                    }
                );
            }
        );
    });
});

// Функция генерации уникального реферального кода
function generateReferralCode(userId) {
    // Создаем код на основе ID и случайного числа
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `${userId}_${timestamp}${random}`.toUpperCase();
}

// ============================================
// МАТЕРИАЛЫ (Креативы/Мануалы)
// ============================================

// Получение всех материалов по типу
app.get('/api/materials/:type', (req, res) => {
    const { type } = req.params; // 'creative' или 'manual'
    
    db.all('SELECT * FROM materials WHERE type = ? ORDER BY created_at DESC', [type], (err, materials) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка базы данных' });
        }
        
        res.json({
            success: true,
            materials
        });
    });
});

// Создание материала с загрузкой видео (только для админов)
app.post('/api/materials', authMiddleware, (req, res) => {
    videoUpload.single('video')(req, res, (err) => {
        // Обработка ошибок multer
        if (err) {
            console.error('Multer error:', err.message);
            return res.status(400).json({ 
                success: false, 
                message: 'Ошибка загрузки файла: ' + err.message 
            });
        }
        
        console.log('=== Создание материала ===');
        console.log('Body:', req.body);
        console.log('File:', req.file);
    
    // Проверяем что пользователь - админ
    db.get('SELECT role FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err || !user || user.role !== 'admin') {
            // Удаляем загруженный файл если есть
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(403).json({ success: false, message: 'Доступ запрещён' });
        }
        
        const { title, format, size, preview_image, type, content_url, telegraph_url } = req.body;
        
        // Получаем путь к видео если файл был загружен
        let video_url = null;
        if (req.file) {
            // Путь относительно корня сайта
            video_url = '/uploads/videos/' + req.file.filename;
            console.log('Видео сохранено:', video_url);
        }
        
        // Валидация
        if (!title || !type) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ success: false, message: 'Название и тип обязательны' });
        }
        
        if (type !== 'creative' && type !== 'manual') {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ success: false, message: 'Тип должен быть creative или manual' });
        }
        
        // Генерируем ID: первый = 13000, следующие = 13XXX (где XXX - рандом)
        db.get('SELECT MAX(id) as maxId FROM materials', (err, result) => {
            let newId;
            if (!result.maxId || result.maxId < 13000) {
                newId = 13000;
            } else {
                // Генерируем 13XXX где XXX - рандомные цифры
                const randomPart = Math.floor(Math.random() * 1000); // 0-999
                newId = 13000 + randomPart;
            }
            
            function checkAndInsert(id) {
                db.get('SELECT id FROM materials WHERE id = ?', [id], (err, exists) => {
                    if (exists) {
                        // ID занят, генерируем новый
                        const newRandom = Math.floor(Math.random() * 1000);
                        checkAndInsert(13000 + newRandom);
                    } else {
                        // ID свободен, вставляем
                        insertMaterial(id);
                    }
                });
            }
            
            function insertMaterial(id) {
                db.run(
                    'INSERT INTO materials (id, title, format, size, preview_image, video_url, content_url, telegraph_url, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [id, title, format || null, size || null, preview_image || null, video_url, content_url || null, telegraph_url || null, type],
                    function(err) {
                        if (err) {
                            console.error('Database error:', err);
                            // Удаляем загруженный файл если есть
                            if (req.file) {
                                fs.unlinkSync(req.file.path);
                            }
                            return res.status(500).json({ success: false, message: 'Ошибка создания материала' });
                        }
                        
                        console.log('✅ Материал создан с ID:', id);
                        
                        res.json({
                            success: true,
                            message: 'Материал создан',
                            material: {
                                id: id,
                                title,
                                format,
                                size,
                                preview_image,
                                video_url,
                                type
                            }
                        });
                    }
                );
            }
            
            checkAndInsert(newId);
        });
    });
    });
});

// Удаление материала (только для админов)
app.delete('/api/materials/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    
    // Проверяем что пользователь - админ
    db.get('SELECT role FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err || !user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Доступ запрещён' });
        }
        
        db.run('DELETE FROM materials WHERE id = ?', [id], function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Ошибка удаления' });
            }
            
            res.json({
                success: true,
                message: 'Материал удалён'
            });
        });
    });
});

// ============================================
// TELEGRAPH API ПРОКСИ
// ============================================

// Создание аккаунта Telegraph
app.post('/api/telegraph/createAccount', async (req, res) => {
    try {
        const { short_name, author_name, author_url } = req.body;
        
        const https = require('https');
        
        const response = await fetch('https://api.telegra.ph/createAccount', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                short_name,
                author_name,
                author_url
            })
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Telegraph createAccount error:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// Создание страницы Telegraph
app.post('/api/telegraph/createPage', async (req, res) => {
    try {
        const { access_token, title, author_name, author_url, content, return_content } = req.body;
        
        console.log('Creating Telegraph page:', { title, author_name });
        
        const response = await fetch('https://api.telegra.ph/createPage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                access_token,
                title,
                author_name,
                author_url,
                content,
                return_content
            })
        });
        
        const data = await response.json();
        console.log('Telegraph response:', data);
        
        res.json(data);
    } catch (error) {
        console.error('Telegraph createPage error:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// Слушаем на всех интерфейсах для доступа из локальной сети
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Access from network: http://<your-local-ip>:${PORT}`);
});

process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        }
        console.log('Database connection closed');
        process.exit(0);
    });
});
