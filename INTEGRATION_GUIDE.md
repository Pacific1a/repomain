# 🔗 ИНТЕГРАЦИЯ РЕФЕРАЛЬНОЙ СИСТЕМЫ БОТ ↔ САЙТ

## 📌 Суть решения

**ДВА ОТДЕЛЬНЫХ СЕРВИСА** которые общаются по HTTP:

```
БОТ (https://bot.render.com)          САЙТ (https://site.render.com)
│                                      │
├─ Пользователь переходит              ├─ POST /api/referral/click
│  по ссылке ref_PARTNER123    ─────>  │  (регистрация клика)
│                                      │
├─ Пользователь пополняет баланс       ├─ POST /api/referral/register-referral  
│  (первый депозит)            ─────>  │  (первый депозит)
│                                      │
├─ Пользователь играет и проигрывает   ├─ POST /api/referral/add-earnings
│  (партнер получает процент)  ─────>  │  (начисление дохода)
│                                      │
└─ Повторное пополнение        ─────>  └─ POST /api/referral/update-deposit
```

---

## 🚀 ШАГ 1: Настройка САЙТА (партнерка)

### 1.1 Добавить защиту API (проверка ключа)

**Файл:** `site/server/server.js`

Найдите в файле секцию с реферальными endpoints (строки ~834-964) и добавьте middleware:

```javascript
// ============ MIDDLEWARE ДЛЯ ЗАЩИТЫ API ============
// Добавить ПЕРЕД реферальными endpoints

const webhookAuth = (req, res, next) => {
  const apiSecret = req.headers['x-api-secret'];
  
  if (!apiSecret || apiSecret !== process.env.PARTNER_API_SECRET) {
    console.warn('⚠️ Unauthorized webhook attempt');
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }
  
  next();
};

// Применить к реферальным endpoints:
app.post('/api/referral/click', webhookAuth, (req, res) => {
  // существующий код...
});

app.post('/api/referral/register-referral', webhookAuth, (req, res) => {
  // существующий код...
});

app.post('/api/referral/add-earnings', webhookAuth, (req, res) => {
  // существующий код...
});

app.post('/api/referral/update-deposit', webhookAuth, (req, res) => {
  // существующий код...
});
```

### 1.2 Настроить .env для САЙТА

**Файл:** `site/server/.env`

```env
PORT=3000
JWT_SECRET=your-jwt-secret-here

# API SECRET для защиты webhook'ов от бота
PARTNER_API_SECRET=shared-secret-between-bot-and-site

# База данных
# ... остальные настройки
```

---

## 🤖 ШАГ 2: Настройка БОТА

### 2.1 Добавить модули в bot/server/

Файлы уже созданы:
- ✅ `bot/server/partner-webhook.js`
- ✅ `bot/server/referral-tracker.js`

### 2.2 Интегрировать в bot/server/server.js

Добавьте в начало файла (после require блока):

```javascript
// ============ REFERRAL TRACKING ============
const getReferralTracker = require('./referral-tracker');
const tracker = getReferralTracker();

console.log('✅ Referral tracker loaded');
```

### 2.3 Обработка старта бота с реферальной ссылкой

Найдите Socket.IO блок `socket.on('auth', ...)` и добавьте обработку start параметра:

```javascript
socket.on('auth', async (telegramData) => {
  try {
    const { id, first_name, username, photo_url, start_param } = telegramData;
    
    // Обработка реферальной ссылки
    if (start_param) {
      await tracker.handleStart(id, start_param);
    }
    
    // ... остальной код auth
  } catch (error) {
    console.error('❌ Ошибка авторизации:', error);
  }
});
```

### 2.4 Обработка пополнения баланса

Найдите endpoint `POST /api/balance/:telegramId` или функцию добавления баланса:

```javascript
app.post('/api/balance/:telegramId', async (req, res) => {
  const { telegramId } = req.params;
  const { amount, reason } = req.body;
  
  // ... существующий код обновления баланса ...
  
  // ДОБАВИТЬ: Отслеживание депозита
  if (amount > 0 && reason === 'deposit') {
    await tracker.handleDeposit(telegramId, amount);
  }
  
  res.json({ success: true, newBalance });
});
```

### 2.5 Обработка проигрышей в играх

Найдите логику игр (Roll, Crash, BlackJack и т.д.) где списываются деньги:

```javascript
// Пример для Crash игры:
socket.on('crash_cashout', async (data) => {
  const { userId, betAmount, multiplier } = data;
  
  // ... логика кэшаута ...
  
  // Если пользователь проиграл (не успел кэшаутить до краша)
  if (!cashedOut) {
    await tracker.handleLoss(userId, betAmount, 'crash');
  }
});

// Пример для Roll:
socket.on('roll_game_end', async (data) => {
  const { userId, betAmount, won } = data;
  
  if (!won) {
    await tracker.handleLoss(userId, betAmount, 'roll');
  }
});
```

### 2.6 Настроить .env для БОТА

**Файл:** `bot/server/.env`

```env
PORT=3000

# URL партнерского сайта
PARTNER_SITE_URL=https://site.render.com

# Общий секретный ключ (ТАКОЙ ЖЕ КАК НА САЙТЕ!)
PARTNER_API_SECRET=shared-secret-between-bot-and-site

# MongoDB (опционально)
MONGODB_URI=

# ... остальные настройки
```

---

## 📦 ШАГ 3: Деплой на Render

### 3.1 Сервис БОТА

**render.yaml** (если используется):

```yaml
services:
  - type: web
    name: duo-bot
    runtime: node
    buildCommand: cd bot/server && npm install
    startCommand: cd bot/server && npm start
    envVars:
      - key: PARTNER_SITE_URL
        value: https://duo-site.onrender.com
      - key: PARTNER_API_SECRET
        generateValue: true  # Render сгенерирует ключ
```

**Environment Variables в Render dashboard:**
```
PARTNER_SITE_URL = https://duo-site.onrender.com
PARTNER_API_SECRET = your-shared-secret-key
```

### 3.2 Сервис САЙТА

**render.yaml**:

```yaml
services:
  - type: web
    name: duo-site
    runtime: node
    buildCommand: cd site/server && npm install
    startCommand: cd site/server && npm start
    envVars:
      - key: PARTNER_API_SECRET
        value: your-shared-secret-key  # ТАКОЙ ЖЕ как в боте!
      - key: JWT_SECRET
        generateValue: true
```

**Environment Variables в Render dashboard:**
```
PARTNER_API_SECRET = your-shared-secret-key (ТАКОЙ ЖЕ!)
JWT_SECRET = your-jwt-secret
```

---

## 🧪 ШАГ 4: Тестирование

### Локальное тестирование

1. **Запустите БОТ:**
   ```bash
   cd bot/server
   npm start
   # Порт 3000
   ```

2. **Запустите САЙТ:**
   ```bash
   cd site/server
   PORT=3001 npm start
   # Порт 3001
   ```

3. **Настройте .env бота:**
   ```env
   PARTNER_SITE_URL=http://localhost:3001
   PARTNER_API_SECRET=test-secret-key
   ```

4. **Настройте .env сайта:**
   ```env
   PARTNER_API_SECRET=test-secret-key
   ```

### Проверка работы

1. **Тест 1: Переход по реферальной ссылке**
   ```
   Откройте бот: http://localhost:3000/?start=ref_test123
   
   Ожидаемо в логах БОТА:
   ✅ User XXX linked to partner test123
   🔗 Tracking click: ref=test123, user=XXX
   
   Ожидаемо в логах САЙТА:
   POST /api/referral/click 200
   ```

2. **Тест 2: Пополнение баланса**
   ```javascript
   // В браузерной консоли бота:
   fetch('/api/balance/123456', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ amount: 1000, reason: 'deposit' })
   });
   
   Ожидаемо в логах БОТА:
   💰 Deposit: user=123456, amount=1000
   🎉 First deposit for user 123456
   
   Ожидаемо в логах САЙТА:
   POST /api/referral/register-referral 200
   ```

3. **Тест 3: Проигрыш в игре**
   ```
   Проиграйте в игре (Roll, Crash и т.д.)
   
   Ожидаемо в логах БОТА:
   📉 Loss: user=123456, amount=500, game=crash
   📈 Tracking earnings: ref=test123, user=123456, loss=500
   
   Ожидаемо в логах САЙТА:
   POST /api/referral/add-earnings 200
   ```

---

## 🔍 Диагностика проблем

### Проблема: Webhook не отправляется

**Проверьте:**
1. `PARTNER_SITE_URL` установлен в .env бота
2. Сайт доступен (попробуйте открыть в браузере)
3. Логи бота показывают `✅ Partner Webhook enabled: ...`

### Проблема: 401 Unauthorized

**Причина:** API ключи не совпадают

**Решение:**
1. Убедитесь что `PARTNER_API_SECRET` одинаковый на боте и сайте
2. Перезапустите оба сервиса после изменения .env

### Проблема: Timeout

**Причина:** Сайт медленно отвечает или недоступен

**Решение:**
1. Проверьте что сайт работает: `curl https://site.render.com/api/health`
2. Увеличьте таймаут в `partner-webhook.js` (строка 32)

### Проблема: Данные не обновляются на сайте

**Проверьте:**
1. Логи сайта показывают входящие webhook'и
2. База данных сайта обновляется (SQLite)
3. Запросы приходят с правильными параметрами

---

## 📊 Мониторинг

### В логах БОТА должно быть:

```
✅ Referral tracker initialized
📊 Tracked users: 5
✅ Partner Webhook enabled: https://site.render.com
🔗 Tracking click: ref=partner123, user=456789
💰 Deposit: user=456789, amount=1000
📉 Loss: user=456789, amount=500, game=crash
```

### В логах САЙТА должно быть:

```
POST /api/referral/click 200
POST /api/referral/register-referral 200
POST /api/referral/add-earnings 200
```

---

## 🎯 Результат

После настройки:

1. ✅ Партнер создает реферальную ссылку на сайте
2. ✅ Пользователь переходит по ссылке → бот уведомляет сайт
3. ✅ Пользователь пополняет баланс → сайт видит первый депозит
4. ✅ Пользователь играет и проигрывает → партнер получает процент
5. ✅ Партнер видит статистику в реальном времени

**Все работает БЕЗ ОБЪЕДИНЕНИЯ серверов!** 🎉
