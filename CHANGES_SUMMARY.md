# 📋 ЧТО ИЗМЕНЕНО В ТВОИХ ФАЙЛАХ

## ✅ ДОБАВЛЕНО

### 1. Новые модули в `bot/server/`:
```
bot/server/
├── partner-webhook.js       ← HTTP клиент для отправки на сайт
├── referral-tracker.js      ← Отслеживание событий
├── .env                     ← Готовый файл с настройками
└── .env.example             ← Пример настроек
```

---

### 2. Изменения в `bot/server/server.js`:

#### Строка 12-18: Добавлен импорт трекера
```javascript
// REFERRAL TRACKING INTEGRATION
const getReferralTracker = require('./referral-tracker');
const tracker = getReferralTracker();
console.log('✅ Referral tracker initialized');
```

#### Строка 422-428: Обработка реферальной ссылки при авторизации
```javascript
const { id, first_name, username, photo_url, start_param } = telegramData;

// REFERRAL: Обработка реферальной ссылки
if (start_param) {
  console.log(`🔗 Start param detected: ${start_param}`);
  await tracker.handleStart(id.toString(), start_param);
}
```

#### Строка 1873-1881: Отслеживание пополнений баланса
```javascript
// REFERRAL: Отслеживание депозитов
if (finalRubles > 0) {
  try {
    await tracker.handleDeposit(telegramId, finalRubles);
    console.log(`💰 Deposit tracked: ${telegramId} - ${finalRubles}₽`);
  } catch (error) {
    console.error('❌ Error tracking deposit:', error);
  }
}
```

#### Строка 975-989: Отслеживание проигрышей в Roll
```javascript
// REFERRAL: Отслеживание проигрышей в Roll
for (const player of gameState.players) {
  if (player.userId !== winner.userId) {
    if (!player.isBot && !String(player.userId).startsWith('bot_')) {
      try {
        await tracker.handleLoss(player.userId, player.bet, 'roll');
        console.log(`📉 Loss tracked: ${player.userId} - ${player.bet}₽ in Roll`);
      } catch (error) {
        console.error('❌ Error tracking loss:', error);
      }
    }
  }
}
```

#### Строка 1335-1348: Отслеживание проигрышей в Crash
```javascript
// REFERRAL: Отслеживание проигрышей в Crash
const crashedPlayers = gameState.players.filter(p => !p.cashedOut);
for (const player of crashedPlayers) {
  if (!player.isBot && !String(player.userId).startsWith('bot_')) {
    try {
      await tracker.handleLoss(player.userId, player.bet, 'crash');
      console.log(`📉 Loss tracked: ${player.userId} - ${player.bet}₽ in Crash`);
    } catch (error) {
      console.error('❌ Error tracking loss:', error);
    }
  }
}
```

---

### 3. Изменения в `site/server/server.js`:

#### Строка 833-849: Добавлен middleware для защиты API
```javascript
// WEBHOOK AUTHENTICATION MIDDLEWARE
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
```

#### Строки 852, 874, 931, 982: Защита реферальных endpoints
```javascript
// Было:
app.post('/api/referral/click', (req, res) => {

// Стало:
app.post('/api/referral/click', webhookAuth, (req, res) => {
```

То же самое для:
- `/api/referral/register-referral`
- `/api/referral/add-earnings`
- `/api/referral/update-deposit`

---

### 4. Добавлены `.env` файлы:

**bot/server/.env:**
```env
PORT=3000
PARTNER_SITE_URL=http://localhost:3001
PARTNER_API_SECRET=duo-secret-key-2024-xyz
```

**site/server/.env:**
```env
PORT=3001
JWT_SECRET=jwt-super-secret-key-2024
PARTNER_API_SECRET=duo-secret-key-2024-xyz  # ТАКОЙ ЖЕ!
```

---

## 📁 СТРУКТУРА ПРОЕКТА СЕЙЧАС

```
duo/
├── START_HERE.md                    ← 🚀 НАЧНИ С ЭТОГО ФАЙЛА
├── KEYS_EXPLAINED.md                ← Про ключи
├── INTEGRATION_GUIDE.md             ← Полное руководство
├── INTEGRATION_PATCHES.md           ← Детали патчей
├── SUMMARY.md                       ← Краткая схема
├── CHANGES_SUMMARY.md               ← Этот файл
│
├── bot/
│   └── server/
│       ├── server.js                ← ✏️ ИЗМЕНЕН
│       ├── partner-webhook.js       ← ✨ НОВЫЙ
│       ├── referral-tracker.js      ← ✨ НОВЫЙ
│       ├── .env                     ← ✨ НОВЫЙ (настрой!)
│       └── .env.example
│
└── site/
    └── server/
        ├── server.js                ← ✏️ ИЗМЕНЕН
        ├── .env                     ← ✨ НОВЫЙ (настрой!)
        └── .env.example
```

---

## 🔑 ПРО КЛЮЧ PARTNER_API_SECRET

### Это общий пароль между ботом и сайтом

**Зачем?**
Чтобы только твой бот мог отправлять данные на твой сайт.

**Где указать?**
В двух местах (должен быть ОДИНАКОВЫЙ):
1. `bot/server/.env` → `PARTNER_API_SECRET=твой-ключ`
2. `site/server/.env` → `PARTNER_API_SECRET=твой-ключ`

**Как придумать?**
Любой сложный пароль:
- Простой: `my-secret-key-2024`
- Сложный: `k8Pq2mN9xR5tL7wY3bH6jF4vC1nM0zX`
- Сгенерировать: https://randomkeygen.com/

**Пример:**
```env
# В bot/server/.env:
PARTNER_API_SECRET=duo-partner-xyz-2024

# В site/server/.env:
PARTNER_API_SECRET=duo-partner-xyz-2024  ← ТАКОЙ ЖЕ!
```

---

## 🚀 КАК ЗАПУСТИТЬ

### 1. Локально (для теста):

**Терминал 1:**
```bash
cd bot/server
npm install
npm start
```

**Терминал 2:**
```bash
cd site/server
npm install
npm start
```

### 2. На Render:

**Для БОТА (Environment Variables):**
```
PARTNER_SITE_URL = https://duo-site.onrender.com
PARTNER_API_SECRET = твой-ключ
```

**Для САЙТА (Environment Variables):**
```
PARTNER_API_SECRET = твой-ключ  (ТАКОЙ ЖЕ!)
JWT_SECRET = другой-ключ
```

---

## ✅ ПРОВЕРКА ЧТО ВСЁ РАБОТАЕТ

### Запусти оба сервера и проверь логи:

**БОТ (должно быть):**
```
✅ Referral tracker initialized
📊 Tracked users: 0
✅ Partner Webhook enabled: http://localhost:3001
🚀 Сервер запущен на порту 3000
```

**САЙТ (должно быть):**
```
✅ SQLite подключена
Server running on http://localhost:3001
```

---

## 🧪 ТЕСТ

### Открой в браузере:
```
http://localhost:3000/?tgWebAppStartParam=ref_test123
```

### Ожидаемо в логах БОТА:
```
🔗 Start param detected: ref_test123
✅ User XXX linked to partner test123
✅ Webhook success [/api/referral/click]
```

### Ожидаемо в логах САЙТА:
```
✅ Webhook authenticated
POST /api/referral/click 200
```

---

## ❓ ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

### Ошибка: Cannot find module 'referral-tracker'
**Решение:** Проверь что файлы в папке `bot/server/`

### Ошибка: 401 Unauthorized
**Решение:** Ключи `PARTNER_API_SECRET` не совпадают

### Ошибка: Webhook disabled
**Решение:** Не указан `PARTNER_SITE_URL` в `.env` бота

---

## 📞 ВАЖНО

**НЕ ТРОГАЙ** старые файлы:
- `unified-server.js` - это была первая версия (не используется)
- Работают два отдельных сервера:
  - `bot/server/server.js`
  - `site/server/server.js`

**Все изменения уже внесены!**
Просто:
1. Настрой `.env` файлы
2. Запусти серверы
3. Протестируй

---

## 🎉 РЕЗУЛЬТАТ

После запуска у тебя будет:

✅ Бот отправляет данные на сайт через HTTP  
✅ Сайт принимает только с правильным ключом  
✅ Партнеры видят клики, депозиты, доход  
✅ Реферальная система работает между двумя сервисами  
✅ Каждый сервис на своем хосте  

**Без объединения серверов!** 🚀
