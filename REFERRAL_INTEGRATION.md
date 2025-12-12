# 🎁 Интеграция Реферальной Системы Бота с Сайтом Партнеров

## 📋 Описание

Реферальная система позволяет партнерам приглашать пользователей в бота через уникальную ссылку и получать **60% от каждого проигрыша** привлеченного клиента.

## 🔗 Архитектура

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   Клиент    │  Click  │  Telegram    │  Sync   │  Партнерский    │
│  Переходит  │ ───────>│     Бот      │ ───────>│      Сайт       │
│  по ссылке  │         │   (server)   │         │ (site/server)   │
└─────────────┘         └──────────────┘         └─────────────────┘
                               │
                               │ Депозит / Проигрыш
                               ▼
                        ┌──────────────┐
                        │ Referral Sync│
                        │  Отправка    │
                        │  данных      │
                        └──────────────┘
```

## 📁 Структура файлов

### Сервер Бота (`/server/`)
- `referral-sync.js` - Модуль синхронизации с сайтом партнеров

### Сервер Сайта (`/site/server/`)
- `server.js` - API endpoints для реферальной системы (уже добавлены)
- База данных:
  - `referral_stats` - Статистика партнеров
  - `referrals` - Список рефералов

### Клиент Сайта (`/site/js/`)
- `referral.js` - Управление реферальными ссылками и статистикой

## 🚀 Интеграция на сервере бота

### 1. Подключите модуль синхронизации

```javascript
// В главном файле сервера бота
const referralSync = require('./server/referral-sync');
```

### 2. Отслеживайте переходы по реферальной ссылке

Когда пользователь запускает бота с параметром `start`:

```javascript
bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const param = match[1].trim();
    
    // Проверяем реферальный код
    if (param && param.startsWith(' ref_')) {
        const referralCode = param.substring(5); // Убираем " ref_"
        
        // Отправляем клик на сервер партнеров
        await referralSync.trackClick(referralCode);
        
        // Сохраняем код в базе данных пользователя
        await saveUserReferralCode(chatId, referralCode);
    }
    
    // ... остальная логика
});
```

### 3. Регистрируйте первый депозит

При первом пополнении счета пользователя:

```javascript
async function handleFirstDeposit(userId, amount) {
    // Получаем реферальный код, по которому пришел пользователь
    const referralCode = await getUserReferralCode(userId);
    
    if (referralCode) {
        // Регистрируем реферала на сайте партнеров
        await referralSync.registerReferral(referralCode, userId, amount);
        
        // Помечаем, что первый депозит сделан
        await markFirstDepositDone(userId);
    }
    
    // ... остальная логика пополнения
}
```

### 4. Обновляйте последующие депозиты

При каждом новом пополнении (не первом):

```javascript
async function handleDeposit(userId, amount) {
    const referralCode = await getUserReferralCode(userId);
    const isFirstDeposit = await isFirstDeposit(userId);
    
    if (referralCode) {
        if (isFirstDeposit) {
            // Первый депозит - регистрируем реферала
            await referralSync.registerReferral(referralCode, userId, amount);
            await markFirstDepositDone(userId);
        } else {
            // Последующие депозиты - обновляем статистику
            await referralSync.updateDeposit(referralCode, userId, amount);
        }
    }
    
    // ... остальная логика
}
```

### 5. Начисляйте доход при проигрыше

Когда пользователь проигрывает в игре:

```javascript
async function handleGameLoss(userId, lossAmount) {
    // Получаем реферальный код
    const referralCode = await getUserReferralCode(userId);
    
    if (referralCode) {
        // Начисляем 60% партнеру
        await referralSync.addEarnings(referralCode, userId, lossAmount);
        
        console.log(`💰 Партнер получит ${lossAmount * 0.6}₽ от проигрыша ${lossAmount}₽`);
    }
    
    // ... остальная логика проигрыша
}
```

## 📊 Пример полной интеграции

```javascript
// server/bot.js
const TelegramBot = require('node-telegram-bot-api');
const referralSync = require('./referral-sync');
const db = require('./database');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Хранилище реферальных кодов (можно использовать БД)
const userReferrals = new Map();

// Команда /start с реферальным кодом
bot.onText(/\/start(.*)/, async (msg, match) => {
    const userId = msg.from.id;
    const param = match[1].trim();
    
    if (param && param.startsWith(' ref_')) {
        const referralCode = param.substring(5);
        
        // Сохраняем реферальный код пользователя
        userReferrals.set(userId, referralCode);
        
        // Отправляем клик
        await referralSync.trackClick(referralCode);
        
        bot.sendMessage(userId, '🎉 Добро пожаловать! Вы зарегистрированы по реферальной ссылке.');
    }
});

// Пополнение счета
async function processDeposit(userId, amount) {
    const referralCode = userReferrals.get(userId);
    
    if (referralCode) {
        // Проверяем, первый ли это депозит
        const deposits = await db.getUserDepositCount(userId);
        
        if (deposits === 0) {
            // Первый депозит - регистрируем реферала
            await referralSync.registerReferral(referralCode, userId, amount);
        } else {
            // Последующие депозиты
            await referralSync.updateDeposit(referralCode, userId, amount);
        }
    }
    
    // ... логика пополнения
}

// Обработка проигрыша в игре
async function processGameLoss(userId, lossAmount) {
    const referralCode = userReferrals.get(userId);
    
    if (referralCode) {
        // Начисляем 60% партнеру
        await referralSync.addEarnings(referralCode, userId, lossAmount);
    }
    
    // ... логика проигрыша
}

module.exports = { bot, processDeposit, processGameLoss };
```

## 🎯 API Endpoints на сервере сайта

### GET `/api/referral/partner/stats`
**Описание:** Получение статистики партнера  
**Заголовки:** `Authorization: Bearer <token>`  
**Ответ:**
```json
{
  "success": true,
  "referralCode": "1_LXE4TKQ2",
  "stats": {
    "clicks": 45,
    "firstDeposits": 12,
    "deposits": 28,
    "totalDeposits": "5430.50",
    "costPerClick": "120.68",
    "avgIncomePerPlayer": "452.54",
    "earnings": "3258.30"
  }
}
```

### POST `/api/referral/click`
**Описание:** Регистрация клика по реферальной ссылке  
**Тело:**
```json
{
  "referralCode": "1_LXE4TKQ2"
}
```

### POST `/api/referral/register-referral`
**Описание:** Регистрация нового реферала (первый депозит)  
**Тело:**
```json
{
  "referralCode": "1_LXE4TKQ2",
  "referralUserId": "123456789",
  "depositAmount": 100
}
```

### POST `/api/referral/update-deposit`
**Описание:** Обновление депозита реферала  
**Тело:**
```json
{
  "referralCode": "1_LXE4TKQ2",
  "referralUserId": "123456789",
  "depositAmount": 50
}
```

### POST `/api/referral/add-earnings`
**Описание:** Начисление дохода партнеру (60% от проигрыша)  
**Тело:**
```json
{
  "referralCode": "1_LXE4TKQ2",
  "referralUserId": "123456789",
  "lossAmount": 100
}
```

## 🔧 Настройка переменных окружения

### Сервер бота (`/server/.env`)
```env
PARTNER_SITE_URL=http://localhost:3000
# или
PARTNER_SITE_URL=https://your-partner-site.com
```

### Сервер сайта (`/site/server/.env`)
```env
PORT=3000
JWT_SECRET=your-secret-key
```

## ✅ Проверка работы

1. **Запустите оба сервера:**
   ```bash
   # Сервер сайта
   cd site/server
   node server.js
   
   # Сервер бота
   cd server
   node bot.js
   ```

2. **Проверьте генерацию ссылки:**
   - Откройте сайт партнеров
   - Перейдите в "Реф.программа"
   - Скопируйте реферальную ссылку

3. **Тестируйте переход:**
   - Откройте ссылку в Telegram
   - Проверьте логи сервера бота: должен появиться `✅ Клик отправлен`
   - Проверьте логи сервера сайта: `✅ Клик по реферальной ссылке`

4. **Тестируйте депозит:**
   - Пополните счет в боте
   - Проверьте статистику на сайте партнеров

5. **Тестируйте проигрыш:**
   - Проиграйте в игре
   - Проверьте баланс партнера на сайте

## 📈 Метрики в Dashboard

На главной странице партнерского сайта отображаются:

### Карточка 1:
- Переходы по ссылке
- Первые депозиты  
- Кол-во пополнений

### Карточка 2:
- Сумма депозитов
- Стоимость перехода (доход / клики)
- Средний доход с игрока

## 🐛 Отладка

Логи синхронизации:
```javascript
// В referral-sync.js все действия логируются:
console.log(`✅ Клик отправлен: ${referralCode}`);
console.log(`✅ Реферал зарегистрирован: ${referralUserId}`);
console.log(`✅ Доход начислен: ${earnings}₽`);
```

Проверка БД:
```sql
-- Статистика партнеров
SELECT * FROM referral_stats;

-- Список рефералов
SELECT * FROM referrals;
```

## 🎉 Готово!

Теперь реферальная система полностью интегрирована между ботом и сайтом партнеров.
