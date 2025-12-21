# 🔧 ПАТЧИ ДЛЯ ИНТЕГРАЦИИ

Эти патчи показывают **ТОЧНО ГДЕ** добавить код в существующие файлы.

---

## 📝 ПАТЧ 1: bot/server/server.js

### Добавить в начало файла (после всех require):

```javascript
// ============================================
// ПОСЛЕ:
// require('dotenv').config();
// ============================================

// REFERRAL TRACKING INTEGRATION
const getReferralTracker = require('./referral-tracker');
const tracker = getReferralTracker();
console.log('✅ Referral tracker initialized');
```

---

### Добавить обработку реферальной ссылки при auth:

```javascript
// ============================================
// НАЙТИ блок:
// socket.on('auth', async (telegramData) => {
//   try {
//     const { id, first_name, username, photo_url } = telegramData;
// ============================================

// ЗАМЕНИТЬ на:
socket.on('auth', async (telegramData) => {
  try {
    const { id, first_name, username, photo_url, start_param } = telegramData;
    
    // ✨ НОВОЕ: Обработка реферальной ссылки
    if (start_param) {
      console.log(`🔗 Start param detected: ${start_param}`);
      await tracker.handleStart(id, start_param);
    }
    
    // ... остальной код без изменений ...
```

---

### Добавить отслеживание пополнений баланса:

```javascript
// ============================================
// НАЙТИ endpoint:
// app.post('/api/balance/:telegramId', async (req, res) => {
// ============================================

// ДОБАВИТЬ ПЕРЕД res.json():

    // ✨ НОВОЕ: Отслеживание депозитов для реферальной системы
    if (amount > 0 && (reason === 'deposit' || reason === 'пополнение')) {
      try {
        await tracker.handleDeposit(telegramId, amount);
        console.log(`💰 Deposit tracked: ${telegramId} - ${amount}₽`);
      } catch (error) {
        console.error('❌ Error tracking deposit:', error);
      }
    }
    
    res.json({
      success: true,
      // ... остальное ...
    });
```

---

### Добавить отслеживание проигрышей в Roll:

```javascript
// ============================================
// НАЙТИ блок где определяется победитель Roll:
// (примерно строка с winningPlayer)
// ============================================

// ДОБАВИТЬ ПОСЛЕ определения проигравших:

    // ✨ НОВОЕ: Отслеживание проигрышей для реферальной системы
    for (const [playerId, playerBet] of Object.entries(gameState.bets)) {
      if (playerId !== winningPlayer.id) {
        // Это проигравший
        const lossAmount = playerBet.amount;
        try {
          await tracker.handleLoss(playerId, lossAmount, 'roll');
          console.log(`📉 Loss tracked: ${playerId} - ${lossAmount}₽ in Roll`);
        } catch (error) {
          console.error('❌ Error tracking loss:', error);
        }
      }
    }
```

---

### Добавить отслеживание проигрышей в Crash:

```javascript
// ============================================
// НАЙТИ блок где обрабатывается крэш:
// (когда игроки которые не сделали cashout проигрывают)
// ============================================

// ДОБАВИТЬ:

    // ✨ НОВОЕ: Отслеживание проигрышей в Crash
    const crashedPlayers = gameState.players.filter(p => !p.cashedOut);
    
    for (const player of crashedPlayers) {
      try {
        await tracker.handleLoss(player.userId, player.bet, 'crash');
        console.log(`📉 Loss tracked: ${player.userId} - ${player.bet}₽ in Crash`);
      } catch (error) {
        console.error('❌ Error tracking loss:', error);
      }
    }
```

---

### Добавить отслеживание проигрышей в BlackJack:

```javascript
// ============================================
// НАЙТИ блок где игрок проигрывает в BlackJack:
// (когда у дилера больше или у игрока bust)
// ============================================

// ДОБАВИТЬ:

    if (playerLost) {
      // ✨ НОВОЕ: Отслеживание проигрыша в BlackJack
      try {
        await tracker.handleLoss(userId, betAmount, 'blackjack');
        console.log(`📉 Loss tracked: ${userId} - ${betAmount}₽ in BlackJack`);
      } catch (error) {
        console.error('❌ Error tracking loss:', error);
      }
    }
```

---

## 📝 ПАТЧ 2: site/server/server.js

### Добавить middleware для защиты webhook'ов:

```javascript
// ============================================
// ДОБАВИТЬ ПЕРЕД реферальными endpoints:
// (примерно строка 830)
// ============================================

// ============ WEBHOOK AUTHENTICATION MIDDLEWARE ============
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

---

### Применить защиту к endpoints:

```javascript
// ============================================
// НАЙТИ:
// app.post('/api/referral/click', (req, res) => {
// ============================================

// ЗАМЕНИТЬ на:
app.post('/api/referral/click', webhookAuth, (req, res) => {
  // код без изменений...
});

// ============================================
// НАЙТИ:
// app.post('/api/referral/register-referral', (req, res) => {
// ============================================

// ЗАМЕНИТЬ на:
app.post('/api/referral/register-referral', webhookAuth, (req, res) => {
  // код без изменений...
});

// ============================================
// НАЙТИ:
// app.post('/api/referral/add-earnings', (req, res) => {
// ============================================

// ЗАМЕНИТЬ на:
app.post('/api/referral/add-earnings', webhookAuth, (req, res) => {
  // код без изменений...
});

// ============================================
// НАЙТИ:
// app.post('/api/referral/update-deposit', (req, res) => {
// ============================================

// ЗАМЕНИТЬ на:
app.post('/api/referral/update-deposit', webhookAuth, (req, res) => {
  // код без изменений...
});
```

---

## 📝 ПАТЧ 3: bot/index.html (клиентская часть)

### Передать start_param в auth:

```javascript
// ============================================
// НАЙТИ блок где вызывается socket.emit('auth'):
// ============================================

// ДОБАВИТЬ start_param:

const urlParams = new URLSearchParams(window.location.search);
const startParam = urlParams.get('tgWebAppStartParam') || 
                   window.Telegram?.WebApp?.initDataUnsafe?.start_param;

socket.emit('auth', {
  id: userId,
  first_name: firstName,
  username: username,
  photo_url: photoUrl,
  start_param: startParam  // ✨ НОВОЕ
});
```

---

## 🧪 ТЕСТИРОВАНИЕ ПОСЛЕ ПАТЧЕЙ

### 1. Проверка что модули загружены:

Запустите бот и проверьте логи:

```
✅ Referral tracker initialized
📊 Tracked users: 0
✅ Partner Webhook enabled: https://site.com
```

Если видите `⚠️ Partner Webhook disabled` - проверьте .env.

---

### 2. Тест реферальной ссылки:

```bash
# Откройте бот с параметром:
http://localhost:3000/?tgWebAppStartParam=ref_test123

# Ожидаемо в логах БОТА:
🔗 Start param detected: ref_test123
✅ User 123456 linked to partner test123
```

---

### 3. Тест пополнения:

```bash
# Отправьте POST запрос:
curl -X POST http://localhost:3000/api/balance/123456 \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "deposit"}'

# Ожидаемо в логах БОТА:
💰 Deposit tracked: 123456 - 1000₽
🎉 First deposit for user 123456

# Ожидаемо в логах САЙТА:
✅ Webhook authenticated
POST /api/referral/register-referral 200
```

---

### 4. Тест проигрыша:

```
# Проиграйте в любой игре (Roll, Crash, BlackJack)

# Ожидаемо в логах БОТА:
📉 Loss tracked: 123456 - 500₽ in crash

# Ожидаемо в логах САЙТА:
✅ Webhook authenticated
POST /api/referral/add-earnings 200
```

---

## ⚠️ ВАЖНЫЕ МОМЕНТЫ

### 1. API Secret ДОЛЖЕН СОВПАДАТЬ

```bash
# В bot/server/.env:
PARTNER_API_SECRET=my-secret-key-123

# В site/server/.env:
PARTNER_API_SECRET=my-secret-key-123  # ТАКОЙ ЖЕ!
```

### 2. URL без слеша в конце

```bash
# ✅ ПРАВИЛЬНО:
PARTNER_SITE_URL=https://site.render.com

# ❌ НЕПРАВИЛЬНО:
PARTNER_SITE_URL=https://site.render.com/
```

### 3. Не забудьте перезапустить сервисы

После изменения .env файлов:

```bash
# Остановите (Ctrl+C) и запустите заново:
npm start
```

---

## 🎯 ФИНАЛЬНАЯ ПРОВЕРКА

После всех патчей должно работать:

✅ Переход по реферальной ссылке → клик регистрируется на сайте  
✅ Пополнение баланса → первый депозит учитывается  
✅ Проигрыш в игре → партнер получает процент  
✅ Статистика обновляется на сайте в реальном времени  

**Без объединения серверов!** Каждый сервис на своем хосте. 🚀
