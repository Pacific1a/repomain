# 🚀 ПЛАН СОЗДАНИЯ НОВОГО ЧИСТОГО СЕРВЕРА

## 🎯 ЦЕЛЬ
Создать один стабильный сервер, который:
- ✅ Работает с ботом (Telegram Python bot)
- ✅ Работает с миниаппом (фронтенд в Telegram)
- ✅ Работает с сайтом партнеров
- ✅ Корректно передает данные реферальной системы
- ✅ Не конфликтует сам с собой

---

## 📁 НОВАЯ СТРУКТУРА

```
duo/
├── server/                          # НОВЫЙ СЕРВЕР (единственный!)
│   ├── config/
│   │   ├── database.js             # Подключение к SQLite
│   │   └── constants.js            # Константы и настройки
│   ├── middleware/
│   │   ├── auth.js                 # JWT аутентификация
│   │   └── webhook.js              # Webhook аутентификация
│   ├── routes/
│   │   ├── auth.routes.js          # Регистрация/логин партнеров
│   │   ├── partner.routes.js       # API для партнерского сайта
│   │   ├── bot.routes.js           # API для Telegram бота
│   │   └── referral.routes.js      # Реферальная система
│   ├── services/
│   │   ├── user.service.js         # Работа с пользователями
│   │   ├── referral.service.js     # Логика реферальной системы
│   │   └── balance.service.js      # Работа с балансами
│   ├── data/
│   │   └── database.db             # SQLite база
│   ├── .env                        # Переменные окружения
│   └── server.js                   # ГЛАВНЫЙ ФАЙЛ
│
├── bot/                             # Python Telegram бот (БЕЗ серверов!)
│   ├── autoshop/
│   │   ├── main.py                 # Точка входа
│   │   └── tgbot/
│   │       ├── routers/            # Обработчики команд
│   │       └── data/
│   │           └── config.py       # SERVER_URL + PARTNER_API_SECRET
│   ├── index.html                  # Миниапп (фронтенд)
│   ├── referral-system.js          # Клиентская логика рефералов
│   └── (все остальные файлы миниаппа)
│
├── site/                            # Партнерский сайт (ТОЛЬКО фронтенд!)
│   ├── index.html                  # Главная страница
│   ├── dashboard/                  # Дашборд партнера
│   ├── css/
│   ├── js/
│   └── (другие статические файлы)
│
└── deploy/                          # Скрипты деплоя
    ├── setup.sh                    # Полная установка на сервере
    ├── clean.sh                    # Очистка сервера
    └── update.sh                   # Обновление кода
```

---

## 🔄 АРХИТЕКТУРА НОВОГО СЕРВЕРА

### 1. EXPRESS APP (server.js)

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Статика
app.use('/bot', express.static(path.join(__dirname, '../bot')));        // Миниапп
app.use('/partner', express.static(path.join(__dirname, '../site')));   // Партнерский сайт
app.use('/uploads', express.static(path.join(__dirname, './uploads'))); // Файлы

// API Routes
app.use('/api/auth', require('./routes/auth.routes'));           // Авторизация
app.use('/api/partner', require('./routes/partner.routes'));     // Партнерский API
app.use('/api/bot', require('./routes/bot.routes'));             // Бот API
app.use('/api/referral', require('./routes/referral.routes'));   // Реферальная система

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
```

---

### 2. БАЗА ДАННЫХ (config/database.js)

```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/database.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database error:', err);
        process.exit(1);
    }
    console.log('✅ Connected to database');
    initDatabase();
});

function initDatabase() {
    // Таблица пользователей (партнеры)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        login TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        telegram TEXT,
        balance REAL DEFAULT 0,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
    )`);
    
    // Таблица реферальной статистики
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
    
    // Таблица рефералов
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
    
    // Таблица событий (для графиков)
    db.run(`CREATE TABLE IF NOT EXISTS referral_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partner_id INTEGER NOT NULL,
        referral_user_id TEXT,
        event_type TEXT NOT NULL,
        amount REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partner_id) REFERENCES users(id)
    )`);
    
    console.log('✅ Database initialized');
}

module.exports = db;
```

---

### 3. РЕФЕРАЛЬНАЯ СИСТЕМА (services/referral.service.js)

```javascript
const db = require('../config/database');

class ReferralService {
    
    // Регистрация клика по реферальной ссылке
    static registerClick(referralCode, userId) {
        return new Promise((resolve, reject) => {
            // Находим партнера по коду
            db.get('SELECT user_id FROM referral_stats WHERE referral_code = ?', 
                [referralCode], 
                (err, stats) => {
                    if (err) return reject(err);
                    if (!stats) return reject(new Error('Partner not found'));
                    
                    const partnerId = stats.user_id;
                    
                    // Проверяем, не зарегистрирован ли уже
                    db.get('SELECT id FROM referrals WHERE partner_id = ? AND referral_user_id = ?',
                        [partnerId, userId],
                        (err, existing) => {
                            if (err) return reject(err);
                            
                            // Увеличиваем clicks в любом случае
                            db.run('UPDATE referral_stats SET clicks = clicks + 1 WHERE user_id = ?',
                                [partnerId],
                                (err) => {
                                    if (err) return reject(err);
                                    
                                    // Сохраняем событие
                                    db.run('INSERT INTO referral_events (partner_id, referral_user_id, event_type) VALUES (?, ?, ?)',
                                        [partnerId, userId, 'click']);
                                    
                                    if (existing) {
                                        resolve({ success: true, alreadyExists: true, partnerId });
                                    } else {
                                        // Регистрируем нового реферала
                                        db.run('INSERT INTO referrals (partner_id, referral_user_id) VALUES (?, ?)',
                                            [partnerId, userId],
                                            function(err) {
                                                if (err) return reject(err);
                                                resolve({ success: true, referralId: this.lastID, partnerId });
                                            }
                                        );
                                    }
                                }
                            );
                        }
                    );
                }
            );
        });
    }
    
    // Регистрация первого депозита
    static registerFirstDeposit(referralCode, userId, depositAmount) {
        return new Promise((resolve, reject) => {
            db.get('SELECT user_id FROM referral_stats WHERE referral_code = ?', 
                [referralCode], 
                (err, stats) => {
                    if (err) return reject(err);
                    if (!stats) return reject(new Error('Partner not found'));
                    
                    const partnerId = stats.user_id;
                    
                    // Обновляем статистику партнера
                    db.run(`UPDATE referral_stats 
                            SET first_deposits = first_deposits + 1,
                                deposits = deposits + 1,
                                total_deposits = total_deposits + ?
                            WHERE user_id = ?`,
                        [depositAmount, partnerId],
                        (err) => {
                            if (err) return reject(err);
                            
                            // Обновляем реферала
                            db.run(`UPDATE referrals 
                                    SET first_deposit_amount = ?,
                                        total_deposits = total_deposits + ?,
                                        deposits_count = deposits_count + 1
                                    WHERE partner_id = ? AND referral_user_id = ?`,
                                [depositAmount, depositAmount, partnerId, userId],
                                (err) => {
                                    if (err) return reject(err);
                                    
                                    // Событие
                                    db.run('INSERT INTO referral_events (partner_id, referral_user_id, event_type, amount) VALUES (?, ?, ?, ?)',
                                        [partnerId, userId, 'first_deposit', depositAmount]);
                                    
                                    resolve({ success: true, partnerId, depositAmount });
                                }
                            );
                        }
                    );
                }
            );
        });
    }
    
    // Начисление дохода партнеру
    static addEarnings(referralCode, userId, lossAmount) {
        return new Promise((resolve, reject) => {
            const earnings = lossAmount * 0.6;  // 60% партнеру
            
            db.get('SELECT user_id FROM referral_stats WHERE referral_code = ?', 
                [referralCode], 
                (err, stats) => {
                    if (err) return reject(err);
                    if (!stats) return reject(new Error('Partner not found'));
                    
                    const partnerId = stats.user_id;
                    
                    // Обновляем earnings партнера
                    db.run('UPDATE referral_stats SET earnings = earnings + ? WHERE user_id = ?',
                        [earnings, partnerId],
                        (err) => {
                            if (err) return reject(err);
                            
                            // Обновляем earnings реферала
                            db.run('UPDATE referrals SET total_earnings = total_earnings + ? WHERE partner_id = ? AND referral_user_id = ?',
                                [earnings, partnerId, userId],
                                (err) => {
                                    if (err) return reject(err);
                                    
                                    // Событие
                                    db.run('INSERT INTO referral_events (partner_id, referral_user_id, event_type, amount) VALUES (?, ?, ?, ?)',
                                        [partnerId, userId, 'earning', earnings]);
                                    
                                    resolve({ success: true, earnings, partnerId });
                                }
                            );
                        }
                    );
                }
            );
        });
    }
    
    // Получить статистику партнера
    static getPartnerStats(partnerId) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM referral_stats WHERE user_id = ?', [partnerId], (err, stats) => {
                if (err) return reject(err);
                if (!stats) return resolve(null);
                
                resolve({
                    referralCode: stats.referral_code,
                    clicks: stats.clicks,
                    firstDeposits: stats.first_deposits,
                    deposits: stats.deposits,
                    totalDeposits: parseFloat(stats.total_deposits).toFixed(2),
                    earnings: parseFloat(stats.earnings).toFixed(2),
                    costPerClick: stats.clicks > 0 ? (stats.earnings / stats.clicks).toFixed(2) : 0,
                    avgIncomePerPlayer: stats.first_deposits > 0 ? (stats.total_deposits / stats.first_deposits).toFixed(2) : 0
                });
            });
        });
    }
}

module.exports = ReferralService;
```

---

### 4. WEBHOOK ROUTES (routes/referral.routes.js)

```javascript
const express = require('express');
const router = express.Router();
const ReferralService = require('../services/referral.service');
const { webhookAuth } = require('../middleware/webhook');
const { jwtAuth } = require('../middleware/auth');

// ============ WEBHOOK ENDPOINTS (от Python бота) ============

// Регистрация клика
router.post('/register', webhookAuth, async (req, res) => {
    try {
        const { userId, referrerId } = req.body;
        
        if (!userId || !referrerId) {
            return res.status(400).json({ success: false, message: 'Missing userId or referrerId' });
        }
        
        const result = await ReferralService.registerClick(referrerId, userId);
        res.json(result);
    } catch (error) {
        console.error('Error registering click:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Регистрация первого депозита
router.post('/register-referral', webhookAuth, async (req, res) => {
    try {
        const { referralCode, referralUserId, depositAmount } = req.body;
        
        if (!referralCode || !referralUserId || !depositAmount) {
            return res.status(400).json({ success: false, message: 'Missing data' });
        }
        
        const result = await ReferralService.registerFirstDeposit(referralCode, referralUserId, depositAmount);
        res.json(result);
    } catch (error) {
        console.error('Error registering first deposit:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Начисление дохода
router.post('/add-earnings', webhookAuth, async (req, res) => {
    try {
        const { referralCode, referralUserId, lossAmount } = req.body;
        
        if (!referralCode || !referralUserId || !lossAmount) {
            return res.status(400).json({ success: false, message: 'Missing data' });
        }
        
        const result = await ReferralService.addEarnings(referralCode, referralUserId, lossAmount);
        res.json(result);
    } catch (error) {
        console.error('Error adding earnings:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ API ENDPOINTS (от партнерского сайта) ============

// Получить статистику партнера
router.get('/partner/stats', jwtAuth, async (req, res) => {
    try {
        const stats = await ReferralService.getPartnerStats(req.userId);
        
        if (!stats) {
            return res.status(404).json({ success: false, message: 'No stats found' });
        }
        
        res.json({ success: true, ...stats });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
```

---

## 🔐 MIDDLEWARE

### Webhook Auth (middleware/webhook.js)
```javascript
const webhookAuth = (req, res, next) => {
    const apiSecret = req.headers['x-api-secret'];
    const expectedSecret = process.env.PARTNER_API_SECRET;
    
    if (!apiSecret || apiSecret !== expectedSecret) {
        console.warn('⚠️ Unauthorized webhook attempt from:', req.ip);
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    next();
};

module.exports = { webhookAuth };
```

### JWT Auth (middleware/auth.js)
```javascript
const jwt = require('jsonwebtoken');

const jwtAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token missing' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

module.exports = { jwtAuth };
```

---

## 📋 PACKAGE.JSON

```json
{
  "name": "duo-server",
  "version": "1.0.0",
  "description": "Unified server for DUO project",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "sqlite3": "^5.1.6",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "express-validator": "^7.0.1",
    "dotenv": "^16.6.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

## 🌍 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ (.env)

```bash
# Server
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PARTNER_API_SECRET=e1e6547a80623ab936abfe561a8a0871

# Database
DATABASE_PATH=/var/www/duo/server/data/database.db

# Site URL
SITE_URL=http://77.239.125.70
```

---

## 🚀 NGINX КОНФИГУРАЦИЯ

```nginx
server {
    listen 80;
    server_name 77.239.125.70;

    # API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Миниапп
    location /bot/ {
        proxy_pass http://localhost:3000/bot/;
    }

    # Партнерский сайт
    location / {
        proxy_pass http://localhost:3000/partner/;
    }
}
```

---

## 📦 PM2 КОНФИГУРАЦИЯ

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'duo-server',
      script: 'server/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'duo-bot',
      script: 'bot/autoshop/main.py',
      interpreter: 'bot/autoshop/venv/bin/python',
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};
```

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

1. ✅ Создать новую структуру папок
2. ✅ Написать `server/server.js`
3. ✅ Написать все роуты и сервисы
4. ✅ Настроить Python бот (обновить SERVER_URL)
5. ✅ Создать скрипты деплоя
6. ✅ Очистить удаленный сервер
7. ✅ Задеплоить новый сервер
8. ✅ Протестировать всю цепочку

---

**Готово к реализации!** 🚀
