// ============================================================
// UNIFIED SERVER - DUO BOT + PARTNER SITE
// Объединенный сервер с полной интеграцией реферальной системы
// ============================================================

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ============================================================
// EXPRESS + SOCKET.IO INITIALIZATION
// ============================================================
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "https://repomain-nine.vercel.app",
      "http://localhost:*",
      "http://127.0.0.1:*",
      "*"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

console.log('📡 Socket.IO сервер инициализирован');
console.log('🔗 Unified сервер: БОТ + ПАРТНЕРКА');

// ============================================================
// CONFIGURATION
// ============================================================
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI;

// Пути проекта
const PROJECT_ROOT = __dirname;
const BOT_DIR = path.join(PROJECT_ROOT, 'bot');
const SITE_DIR = path.join(PROJECT_ROOT, 'site');
const BOT_SERVER_DIR = path.join(BOT_DIR, 'server');
const SITE_SERVER_DIR = path.join(SITE_DIR, 'server');
const DATA_DIR = path.join(BOT_SERVER_DIR, 'data');
const UPLOADS_DIR = path.join(SITE_DIR, 'uploads');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');

console.log('📂 Project root:', PROJECT_ROOT);
console.log('📂 Bot directory:', BOT_DIR);
console.log('📂 Site directory:', SITE_DIR);

// Создаем необходимые папки
[DATA_DIR, UPLOADS_DIR, VIDEOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Создана папка: ${dir}`);
  }
});

// ============================================================
// DATABASE SETUP
// ============================================================

// SQLite для партнерского сайта
const db = new sqlite3.Database(path.join(SITE_SERVER_DIR, 'database.db'), (err) => {
  if (err) {
    console.error('❌ SQLite ошибка:', err);
  } else {
    console.log('✅ SQLite подключена (партнерский сайт)');
    initSQLiteDatabase();
  }
});

function initSQLiteDatabase() {
  // Таблица пользователей партнерки
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
      console.error('❌ Ошибка создания users:', err);
    } else {
      console.log('✅ Таблица users готова');
      // Добавляем колонки если их нет
      db.run(`ALTER TABLE users ADD COLUMN twofa_secret TEXT`, () => {});
      db.run(`ALTER TABLE users ADD COLUMN twofa_enabled INTEGER DEFAULT 0`, () => {});
      db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, () => {});
    }
  });

  // Таблица материалов
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
      console.error('❌ Ошибка создания materials:', err);
    } else {
      console.log('✅ Таблица materials готова');
      db.run(`ALTER TABLE materials ADD COLUMN video_url TEXT`, () => {});
      db.run(`ALTER TABLE materials ADD COLUMN content_url TEXT`, () => {});
      db.run(`ALTER TABLE materials ADD COLUMN telegraph_url TEXT`, () => {});
    }
  });
}

// MongoDB для бота (опционально)
let User, Room, GameHistory;
if (MONGODB_URI && MONGODB_URI.trim() !== '') {
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
    .then(() => {
      console.log('✅ MongoDB подключена (бот)');
      try {
        User = require('./bot/server/models/User');
        Room = require('./bot/server/models/Room');
        GameHistory = require('./bot/server/models/GameHistory');
      } catch (err) {
        console.error('⚠️ Ошибка загрузки моделей MongoDB:', err.message);
      }
    })
    .catch(err => {
      console.error('❌ MongoDB ошибка:', err.message);
      console.log('⚠️ Продолжаем без MongoDB (используется JSON)');
    });
} else {
  console.log('⚠️ MongoDB не настроена (используется JSON)');
}

// ============================================================
// NODEMAILER SETUP
// ============================================================
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ============================================================
// MULTER SETUP
// ============================================================
const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, VIDEOS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'video-' + uniqueSuffix + ext);
  }
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый формат видео'));
    }
  }
});

// ============================================================
// MIDDLEWARE
// ============================================================
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org", "https://cdn.socket.io"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "http:", "https://raw.githubusercontent.com", "https://github.com"],
      connectSrc: ["'self'", "https:", "wss:", "ws:"],
      fontSrc: ["'self'", "data:", "https:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"]
    }
  }
}));

app.use(cors());

// Условный express.json (не для /api/materials POST)
app.use((req, res, next) => {
  if (req.path === '/api/materials' && req.method === 'POST') {
    return next();
  }
  express.json()(req, res, next);
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100
});
app.use('/api/', limiter);

// ============================================================
// STATIC FILES - ПРАВИЛЬНАЯ НАСТРОЙКА
// ============================================================

// 1. ГЛАВНАЯ СТРАНИЦА БОТА (корень)
app.get('/', (req, res) => {
  const botIndexPath = path.join(BOT_DIR, 'index.html');
  console.log('📄 Запрос к / -> отдаем bot/index.html:', botIndexPath);
  if (fs.existsSync(botIndexPath)) {
    res.sendFile(botIndexPath);
  } else {
    console.error('❌ bot/index.html не найден!');
    res.status(404).send('Bot not found');
  }
});

// 2. СТАТИКА БОТА (CSS, JS, images из bot/)
app.use(express.static(BOT_DIR));
console.log('📁 Статика бота:', BOT_DIR);

// 3. ГЛАВНАЯ СТРАНИЦА ПАРТНЕРКИ
app.get(['/partner', '/partner/'], (req, res) => {
  const siteIndexPath = path.join(SITE_DIR, 'index.html');
  console.log('📄 Запрос к /partner -> отдаем site/index.html:', siteIndexPath);
  if (fs.existsSync(siteIndexPath)) {
    res.sendFile(siteIndexPath);
  } else {
    console.error('❌ site/index.html не найден!');
    res.status(404).send('Partner site not found');
  }
});

// 4. СТАТИКА ПАРТНЕРКИ
app.use('/partner', express.static(SITE_DIR));
console.log('📁 Статика партнерки: /partner ->', SITE_DIR);

// 5. UPLOADS
app.use('/uploads', express.static(UPLOADS_DIR));
console.log('📁 Uploads:', UPLOADS_DIR);

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================
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

// ============================================================
// PARTNER SITE API ENDPOINTS
// ============================================================

// Регистрация
app.post('/api/register', [
  body('email').isEmail().withMessage('Неверный формат email'),
  body('password').isLength({ min: 6 }).withMessage('Пароль минимум 6 символов'),
  body('login').isLength({ min: 3 }).withMessage('Логин минимум 3 символа'),
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

// Вход
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

// Получить данные пользователя
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

// ============================================================
// BOT API ENDPOINTS
// ============================================================

// Персистентное хранилище балансов и транзакций
const BALANCES_FILE = path.join(DATA_DIR, 'balances.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const REFERRALS_FILE = path.join(DATA_DIR, 'referrals.json');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// Загрузка данных
function loadJSONData(filePath, defaultData = {}) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`❌ Ошибка чтения ${filePath}:`, error);
  }
  return defaultData;
}

// Сохранение данных
function saveJSONData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`❌ Ошибка записи ${filePath}:`, error);
  }
}

// Инициализация хранилищ
let balances = loadJSONData(BALANCES_FILE, {});
let transactions = loadJSONData(TRANSACTIONS_FILE, {});
let referrals = loadJSONData(REFERRALS_FILE, {});

// Автосохранение каждые 30 секунд
setInterval(() => {
  saveJSONData(BALANCES_FILE, balances);
  saveJSONData(TRANSACTIONS_FILE, transactions);
  saveJSONData(REFERRALS_FILE, referrals);
}, 30000);

// API: Получить баланс
app.get('/api/balance/:telegramId', async (req, res) => {
  const { telegramId } = req.params;
  
  try {
    let balance = balances[telegramId] || 0;
    
    res.json({
      success: true,
      telegramId: parseInt(telegramId),
      balance: balance
    });
  } catch (error) {
    console.error('Ошибка получения баланса:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения баланса'
    });
  }
});

// API: Обновить баланс
app.post('/api/balance/:telegramId', async (req, res) => {
  const { telegramId } = req.params;
  const { amount, reason } = req.body;
  
  if (typeof amount !== 'number') {
    return res.status(400).json({
      success: false,
      message: 'Amount должен быть числом'
    });
  }
  
  try {
    // Обновляем баланс
    if (!balances[telegramId]) {
      balances[telegramId] = 0;
    }
    
    const oldBalance = balances[telegramId];
    balances[telegramId] += amount;
    const newBalance = balances[telegramId];
    
    // Записываем транзакцию
    if (!transactions[telegramId]) {
      transactions[telegramId] = [];
    }
    
    transactions[telegramId].push({
      amount,
      reason: reason || 'Обновление баланса',
      timestamp: new Date().toISOString(),
      oldBalance,
      newBalance
    });
    
    // Сохраняем немедленно
    saveJSONData(BALANCES_FILE, balances);
    saveJSONData(TRANSACTIONS_FILE, transactions);
    
    console.log(`💰 Баланс обновлен: ${telegramId} | ${oldBalance} -> ${newBalance} (${amount >= 0 ? '+' : ''}${amount})`);
    
    res.json({
      success: true,
      telegramId: parseInt(telegramId),
      oldBalance,
      newBalance,
      amount
    });
  } catch (error) {
    console.error('Ошибка обновления баланса:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка обновления баланса'
    });
  }
});

// API: Получить транзакции
app.get('/api/transactions/:telegramId', async (req, res) => {
  const { telegramId } = req.params;
  
  try {
    const userTransactions = transactions[telegramId] || [];
    
    res.json({
      success: true,
      telegramId: parseInt(telegramId),
      transactions: userTransactions.slice(-50) // Последние 50
    });
  } catch (error) {
    console.error('Ошибка получения транзакций:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения транзакций'
    });
  }
});

// ============================================================
// REFERRAL SYSTEM - ИНТЕГРАЦИЯ БОТ + ПАРТНЕРКА
// ============================================================

// API: Получить реферальные данные пользователя
app.get('/api/referral/:telegramId', async (req, res) => {
  const { telegramId } = req.params;
  
  try {
    if (!referrals[telegramId]) {
      referrals[telegramId] = {
        referrerId: null,
        referrals: [],
        totalEarnings: 0,
        level: 1
      };
    }
    
    res.json({
      success: true,
      data: referrals[telegramId]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка получения данных' });
  }
});

// API: Регистрация реферала
app.post('/api/referral/register', async (req, res) => {
  const { telegramId, referrerId } = req.body;
  
  if (!telegramId || !referrerId) {
    return res.status(400).json({ success: false, message: 'Необходимы telegramId и referrerId' });
  }
  
  try {
    // Проверяем что пользователь еще не зарегистрирован с рефералом
    if (referrals[telegramId] && referrals[telegramId].referrerId) {
      return res.json({
        success: false,
        message: 'Пользователь уже зарегистрирован с рефералом'
      });
    }
    
    // Инициализируем данные нового пользователя
    if (!referrals[telegramId]) {
      referrals[telegramId] = {
        referrerId: null,
        referrals: [],
        totalEarnings: 0,
        level: 1
      };
    }
    
    // Устанавливаем реферера
    referrals[telegramId].referrerId = referrerId;
    
    // Добавляем в список рефералов реферера
    if (!referrals[referrerId]) {
      referrals[referrerId] = {
        referrerId: null,
        referrals: [],
        totalEarnings: 0,
        level: 1
      };
    }
    
    referrals[referrerId].referrals.push({
      telegramId: parseInt(telegramId),
      registeredAt: new Date().toISOString(),
      totalSpent: 0
    });
    
    saveJSONData(REFERRALS_FILE, referrals);
    
    console.log(`🔗 Реферал зарегистрирован: ${telegramId} -> ${referrerId}`);
    
    res.json({
      success: true,
      message: 'Реферал успешно зарегистрирован'
    });
  } catch (error) {
    console.error('Ошибка регистрации реферала:', error);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// API: Начисление реферальных бонусов
app.post('/api/referral/add-earnings', async (req, res) => {
  const { referrerId, amount, referralId } = req.body;
  
  if (!referrerId || typeof amount !== 'number') {
    return res.status(400).json({ success: false, message: 'Необходимы referrerId и amount' });
  }
  
  try {
    if (!referrals[referrerId]) {
      referrals[referrerId] = {
        referrerId: null,
        referrals: [],
        totalEarnings: 0,
        level: 1
      };
    }
    
    // Начисляем реферальный бонус
    referrals[referrerId].totalEarnings += amount;
    
    // Обновляем баланс реферера
    if (!balances[referrerId]) {
      balances[referrerId] = 0;
    }
    balances[referrerId] += amount;
    
    // Записываем транзакцию
    if (!transactions[referrerId]) {
      transactions[referrerId] = [];
    }
    transactions[referrerId].push({
      amount,
      reason: `Реферальный бонус от пользователя ${referralId || 'неизвестен'}`,
      timestamp: new Date().toISOString(),
      oldBalance: balances[referrerId] - amount,
      newBalance: balances[referrerId]
    });
    
    // Обновляем totalSpent для реферала
    if (referralId) {
      const referral = referrals[referrerId].referrals.find(r => r.telegramId === parseInt(referralId));
      if (referral) {
        referral.totalSpent = (referral.totalSpent || 0) + (amount * 10); // Примерная сумма траты
      }
    }
    
    saveJSONData(REFERRALS_FILE, referrals);
    saveJSONData(BALANCES_FILE, balances);
    saveJSONData(TRANSACTIONS_FILE, transactions);
    
    console.log(`💎 Реферальный бонус: ${referrerId} +${amount} (от ${referralId})`);
    
    res.json({
      success: true,
      message: 'Бонус начислен',
      newBalance: balances[referrerId],
      totalEarnings: referrals[referrerId].totalEarnings
    });
  } catch (error) {
    console.error('Ошибка начисления бонуса:', error);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// API: Получить данные Telegram пользователя
app.get('/api/telegram-user/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Здесь можно добавить логику получения данных из Telegram
    // Пока возвращаем заглушку
    res.json({
      success: true,
      user: {
        id: parseInt(userId),
        first_name: 'User',
        username: `user${userId}`,
        photo_url: null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка получения данных' });
  }
});

// ============================================================
// SOCKET.IO - LIVE PRIZES & GAMES (ВСЯ ЛОГИКА БОТА)
// ============================================================

// Namespace для live prizes
const livePrizesNamespace = io.of('/live-prizes');
const recentWins = [];
const MAX_RECENT_WINS = 20;

livePrizesNamespace.on('connection', (socket) => {
  console.log('✅ Live Prizes client connected:', socket.id);
  
  socket.emit('init', { wins: recentWins });
  
  socket.on('win', (data) => {
    const winData = {
      prize: data.prize,
      isChips: data.isChips,
      color: data.color,
      imagePath: data.imagePath,
      timestamp: Date.now()
    };
    
    recentWins.push(winData);
    if (recentWins.length > MAX_RECENT_WINS) {
      recentWins.shift();
    }
    
    livePrizesNamespace.emit('new_win', { win: winData });
    console.log(`📣 Broadcast win: ${data.prize}${data.isChips ? ' chips' : '₽'}`);
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Live Prizes client disconnected:', socket.id);
  });
});

// Хранилище онлайн пользователей и комнат
const onlineUsers = new Map();
const activeRooms = new Map();
const userSockets = new Map();

// Палитра цветов для игроков
const colors = [
  '#bde0fe', '#ffafcc', '#ade8f4', '#edede9', '#6f2dbd',
  '#b8c0ff', '#ff9e00', '#826aed', '#ffff3f', '#1dd3b0',
  '#ffd449', '#54defd', '#2fe6de', '#00f2f2', '#2d00f7'
];

const playerColors = new Map();
const usedColors = new Set();

function getPlayerColor(userId) {
  if (!playerColors.has(userId)) {
    let availableColors = colors.filter(color => !usedColors.has(color));
    
    if (availableColors.length === 0) {
      usedColors.clear();
      availableColors = [...colors];
    }
    
    const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
    playerColors.set(userId, randomColor);
    usedColors.add(randomColor);
  }
  return playerColors.get(userId);
}

// ROLL BOTS
const ROLL_BOTS = [
  { id: 'bot_den', nickname: 'den', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/1.png?raw=true' },
  { id: 'bot_sagarius', nickname: 'Sagarius', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/2.png?raw=true' },
  { id: 'bot_dev_fenomen', nickname: 'dev_fenomen', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/3.png?raw=true' },
  { id: 'bot_majer', nickname: 'Majer', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/4.png?raw=true' },
  { id: 'bot_ovi', nickname: 'OVI', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/5.png?raw=true' }
];

const BOT_BET_MIN = 100;
const BOT_BET_MAX = 2000;
const BOT_BET_INTERVAL = 10000;
const activeBotsData = new Map();

// Глобальные игры
const globalGames = {
  speedcash: {
    status: 'betting',
    bettingTime: 5,
    blueMultiplier: 1.00,
    orangeMultiplier: 1.00,
    blueStopMultiplier: null,
    orangeStopMultiplier: null,
    delayedCar: null,
    winner: null,
    raceStartTime: null,
    bettingTimer: null,
    raceInterval: null,
    isInitialized: false
  },
  roll: {
    status: 'waiting',
    players: [],
    timer: 30,
    startTime: null,
    timerInterval: null,
    winner: null,
    totalBet: 0,
    bets: {},
    activeBots: []
  },
  crash: {
    status: 'waiting',
    players: [],
    multiplier: 1.00,
    crashPoint: null,
    startTime: null,
    gameInterval: null,
    waitingTimer: null,
    waitingTime: 5,
    isInitialized: false
  },
  blackjack: {
    status: 'waiting',
    players: [],
    history: [],
    isInitialized: false
  }
};

// Загружаем комнаты
function loadPersistedData() {
  try {
    if (fs.existsSync(ROOMS_FILE)) {
      const roomsData = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
      roomsData.forEach(room => {
        room.createdAt = new Date(room.createdAt);
        activeRooms.set(room.id, room);
      });
      console.log(`✅ Загружено ${roomsData.length} комнат`);
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки комнат:', error);
  }
}

function savePersistedData() {
  try {
    const roomsData = Array.from(activeRooms.values());
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(roomsData, null, 2));
  } catch (error) {
    console.error('❌ Ошибка сохранения комнат:', error);
  }
}

setInterval(savePersistedData, 30000);
loadPersistedData();

// ============================================================
// SOCKET.IO CONNECTION
// ============================================================
io.on('connection', (socket) => {
  console.log(`🔌 Новое подключение: ${socket.id}`);

  // Авторизация пользователя
  socket.on('auth', async (telegramData) => {
    try {
      const { id, first_name, username, photo_url } = telegramData;
      
      let user;
      if (User) {
        user = await User.findOne({ telegramId: id });
        
        if (!user) {
          user = new User({
            telegramId: id,
            firstName: first_name,
            username: username,
            photoUrl: photo_url,
            nickname: first_name || username || `Player${id}`,
            stats: { gamesPlayed: 0, gamesWon: 0, totalWinnings: 0 }
          });
          await user.save();
          console.log(`✅ Новый пользователь: ${user.nickname}`);
        } else {
          user.firstName = first_name;
          user.username = username;
          user.photoUrl = photo_url;
          user.lastSeen = new Date();
          await user.save();
        }
      } else {
        user = {
          _id: id,
          telegramId: id,
          nickname: first_name || username || `Player${id}`,
          photoUrl: photo_url,
          stats: { gamesPlayed: 0, gamesWon: 0, totalWinnings: 0 }
        };
      }

      onlineUsers.set(socket.id, {
        socketId: socket.id,
        userId: user._id.toString(),
        telegramId: id,
        nickname: user.nickname,
        photoUrl: photo_url,
        isOnline: true
      });
      
      userSockets.set(user._id.toString(), socket.id);

      socket.emit('auth_success', {
        user: {
          id: user._id,
          telegramId: user.telegramId,
          nickname: user.nickname,
          photoUrl: user.photoUrl,
          stats: user.stats
        }
      });

      io.emit('online_users', Array.from(onlineUsers.values()));
      
      console.log(`✅ Авторизован: ${user.nickname} (${socket.id})`);
    } catch (error) {
      console.error('❌ Ошибка авторизации:', error);
      socket.emit('auth_error', { message: 'Ошибка авторизации' });
    }
  });

  // Отключение
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      userSockets.delete(user.userId);
      io.emit('online_users', Array.from(onlineUsers.values()));
      console.log(`👋 Пользователь отключился: ${user.nickname}`);
    }
  });
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      sqlite: true,
      mongodb: mongoose.connection.readyState === 1,
      socketio: true
    }
  });
});

// ============================================================
// FALLBACK - ОТДАЕМ BOT INDEX
// ============================================================
app.get('*', (req, res) => {
  // Если путь начинается с /partner - уже обработан выше
  if (req.path.startsWith('/partner')) {
    return res.status(404).send('Partner page not found');
  }
  
  // Все остальное - бот
  const botIndexPath = path.join(BOT_DIR, 'index.html');
  if (fs.existsSync(botIndexPath)) {
    res.sendFile(botIndexPath);
  } else {
    res.status(404).send('Not found');
  }
});

// ============================================================
// START SERVER
// ============================================================
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('========================================');
  console.log('🚀 UNIFIED SERVER ЗАПУЩЕН');
  console.log('========================================');
  console.log(`📍 Порт: ${PORT}`);
  console.log(`🤖 Бот: http://localhost:${PORT}/`);
  console.log(`👥 Партнерка: http://localhost:${PORT}/partner`);
  console.log(`🌐 Socket.IO: готов к подключениям`);
  console.log(`💾 Данные: ${DATA_DIR}`);
  console.log('========================================');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️ Остановка сервера...');
  saveJSONData(BALANCES_FILE, balances);
  saveJSONData(TRANSACTIONS_FILE, transactions);
  saveJSONData(REFERRALS_FILE, referrals);
  savePersistedData();
  console.log('✅ Данные сохранены');
  process.exit(0);
});
