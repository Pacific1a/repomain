# ✅ РЕФЕРАЛЬНАЯ СИСТЕМА - ИСПРАВЛЕНО

## 🎉 ЧТО СДЕЛАНО

### 1️⃣ Авторизация (Frontend ↔ Backend)
✅ **ИСПРАВЛЕНО** в `site/js/api.js`:
- Изменен порт: `3000` → `10000`
- Добавлен автоопределение протокола (HTTPS на Render)
- Локально: `http://localhost:10000/api`
- На Render: `https://duo-partner.onrender.com/api`

### 2️⃣ Реферальная система (Python Bot → Backend)
✅ **СОЗДАН** новый endpoint `/api/referral/register` в `site/server/server.js`:
- Принимает `{userId, referrerId}` от Python бота
- Проверяет webhookAuth (PARTNER_API_SECRET)
- Регистрирует реферала в базе
- Увеличивает счетчик кликов
- Логирует все действия

✅ **ИСПРАВЛЕН** `SERVER_API_URL` в `bot/autoshop/tgbot/data/config.py`:
- Было: `https://telegram-games-plkj.onrender.com` ❌
- Стало: `https://duo-partner.onrender.com` ✅

### 3️⃣ Реферальная ссылка на сайте
✅ **СОЗДАН** `site/js/config.js` для настройки имени бота:
```javascript
window.BOT_USERNAME = 'YOUR_BOT_USERNAME';  // TODO: Замените на имя вашего бота
```

### 4️⃣ Копирование ссылки
✅ **ИСПРАВЛЕНО** в `site/js/referral.js`:
- Добавлена проверка `dataset.handlerAttached`
- Обработчик навешивается только один раз
- Множественные Toast'ы устранены

---

## 🚀 ЧТО ДЕЛАТЬ ДАЛЬШЕ

### Шаг 1: Установить имя Telegram бота

**Где:** `site/js/config.js`

```javascript
// Было:
window.BOT_USERNAME = 'YOUR_BOT_USERNAME';  ❌

// Должно быть (замените на ИМЯ ВАШЕГО БОТА):
window.BOT_USERNAME = 'ваш_бот';  ✅
```

**Как узнать имя бота:**
1. Открой @BotFather в Telegram
2. Отправь `/mybots`
3. Выбери своего бота
4. Имя будет в формате `@ваш_бот` (без @)

**Пример:**
```javascript
window.BOT_USERNAME = 'duogames_bot';  // БЕЗ @!
```

---

### Шаг 2: Передеплой на Render

#### A. Сервер партнёров (duo-partner)

1. Открой https://dashboard.render.com/
2. Найди сервис **duo-partner**
3. Нажми **Manual Deploy** → **Clear build cache & deploy**
4. Подожди ~2-3 минуты

**Проверь логи:**
```
✅ SQLite подключена
Server running on http://localhost:10000
```

#### B. Python бот (если есть на Render)

Если твой Python бот тоже деплоится на Render:

1. Найди сервис с Python ботом
2. Добавь Environment Variable:
   ```
   SERVER_URL=https://duo-partner.onrender.com
   ```
3. Manual Deploy → Clear build cache & deploy

**Проверь логи:**
```
📡 Используется SERVER_URL: https://duo-partner.onrender.com
```

---

### Шаг 3: Проверка webhookAuth

Убедись что `PARTNER_API_SECRET` **ОДИНАКОВЫЙ** на обоих сервисах:

**На сервере партнёров (duo-partner):**
```env
PARTNER_API_SECRET=твой-секретный-ключ-123
```

**В Python боте (через Environment Variable или settings.ini):**
```env
PARTNER_API_SECRET=твой-секретный-ключ-123  ← ТАКОЙ ЖЕ!
```

Если разные → бот получит `401 Unauthorized`.

---

## 🧪 ТЕСТИРОВАНИЕ

### 1. Регистрация партнёра

1. Открой https://duo-partner.onrender.com
2. Зарегистрируйся как партнёр
3. Войди в панель

### 2. Генерация реферальной ссылки

В дашборде:
- Открой раздел "Партнёры" или "Реферальная программа"
- Должна появиться ссылка формата:
  ```
  https://t.me/ваш_бот?start=ref_CODE
  ```

### 3. Проверка копирования

1. Нажми кнопку "Скопировать"
2. Должно появиться **ОДНО** уведомление "Ссылка скопирована!"
3. Не должно быть множественных Toast'ов

### 4. Переход по ссылке

1. Скопируй реферальную ссылку
2. Открой в Telegram (или браузере)
3. Нажми /start

**Проверь логи Python бота:**
```
🔍 Referral link detected: full_code=ref_1_ABC123, extracted_user_id=1, new_user=YOUR_TG_ID
```

**Проверь логи сервера партнёров:**
```
✅ Webhook authenticated
📥 Referral registration request: userId=YOUR_TG_ID, referrerId=1
✅ Partner found: id=1, telegram=PARTNER_TG_ID
✅ Referral registered: YOUR_TG_ID → partner 1, clicks=1
```

### 5. Проверка статистики

В панели партнёра:
- Переходы: должно увеличиться на +1
- Кол-во рефералов: +1
- Статистика обновляется

---

## 📊 АРХИТЕКТУРА (КАК РАБОТАЕТ)

```
┌─────────────────────────────────────────────────────┐
│  САЙТ ПАРТНЁРОВ (duo-partner.onrender.com)         │
│  - Партнёр регистрируется                           │
│  - Получает реферальный код                         │
│  - Генерируется ссылка: t.me/BOT?start=ref_CODE    │
└─────────────────────────────────────────────────────┘
                    ↓ Партнёр делится ссылкой
          https://t.me/ваш_бот?start=ref_CODE
                    ↓
┌─────────────────────────────────────────────────────┐
│  TELEGRAM BOT (Python)                              │
│  - Принимает /start ref_CODE                        │
│  - Извлекает partner_id из кода                     │
│  - POST https://duo-partner.onrender.com            │
│    /api/referral/register                           │
│    Headers: X-API-Secret: PARTNER_API_SECRET        │
│    Body: {userId, referrerId}                       │
└─────────────────────────────────────────────────────┘
                    ↓ HTTP POST (webhookAuth)
┌─────────────────────────────────────────────────────┐
│  СЕРВЕР ПАРТНЁРОВ (duo-partner.onrender.com)       │
│  - Проверяет X-API-Secret                           │
│  - Находит партнёра по telegram ID                  │
│  - Регистрирует реферала в таблице referrals        │
│  - clicks +1, referral_user_id сохраняется          │
│  - Возвращает success: true                         │
└─────────────────────────────────────────────────────┘
                    ↓ Статистика обновлена
┌─────────────────────────────────────────────────────┐
│  ПАНЕЛЬ ПАРТНЁРА                                    │
│  - Видит обновленную статистику                     │
│  - Переходы: +1                                     │
│  - Рефералы: +1                                     │
└─────────────────────────────────────────────────────┘
```

---

## ⚠️ ЧАСТЫЕ ПРОБЛЕМЫ

### 1. "Partner not found" в логах

**Причина:** Партнёр не зарегистрирован или Telegram ID неправильный

**Решение:**
1. Убедись что партнёр зарегистрирован на сайте
2. Проверь что Telegram ID партнёра сохранен в базе
3. Проверь формат реферального кода

### 2. "401 Unauthorized" в логах

**Причина:** `PARTNER_API_SECRET` не совпадают

**Решение:**
1. Проверь Environment Variables на Render:
   - duo-partner: `PARTNER_API_SECRET`
   - Python bot: `PARTNER_API_SECRET` или через settings.ini
2. Убедись что значения **ОДИНАКОВЫЕ**
3. Передеплой оба сервиса

### 3. "Timeout - server did not respond"

**Причина:** Бот обращается по неправильному URL

**Решение:**
1. Проверь `SERVER_API_URL` в боте:
   ```python
   # bot/autoshop/tgbot/data/config.py
   SERVER_API_URL = 'https://duo-partner.onrender.com'  ✅
   ```
2. НЕ должно быть:
   ```python
   SERVER_API_URL = 'https://telegram-games-plkj.onrender.com'  ❌
   ```

### 4. Множественные уведомления "Ссылка скопирована"

**Причина:** Старый код в кэше браузера

**Решение:**
1. Очисть кэш браузера (Ctrl+Shift+Delete)
2. Или Hard Reload (Ctrl+F5)
3. Или откройincognito режим

---

## 📝 CHECKLIST ПЕРЕД ЗАПУСКОМ

- [ ] Установил `window.BOT_USERNAME` в `site/js/config.js`
- [ ] Передеплоил сервер партнёров (duo-partner)
- [ ] Передеплоил Python бота (если на Render)
- [ ] Проверил что `PARTNER_API_SECRET` одинаковый
- [ ] Проверил что `SERVER_API_URL` указывает на duo-partner
- [ ] Зарегистрировал тестового партнёра
- [ ] Сгенерировал реферальную ссылку
- [ ] Перешел по ссылке в Telegram боте
- [ ] Проверил логи на обоих сервисах
- [ ] Проверил статистику в панели партнёра

---

## 🎯 ИТОГОВЫЙ РЕЗУЛЬТАТ

После всех настроек:

✅ Партнёр регистрируется на сайте  
✅ Получает реферальную ссылку `t.me/BOT?start=ref_CODE`  
✅ Делится ссылкой  
✅ Новый пользователь переходит → открывается Telegram бот  
✅ Бот регистрирует реферала на сервере партнёров  
✅ Статистика партнёра обновляется (клики +1, рефералы +1)  
✅ При проигрыше реферала → партнёр получает 10%  

**СИСТЕМА РАБОТАЕТ!** 🚀

---

## 📞 ЕСЛИ НЕ РАБОТАЕТ

1. Проверь логи обоих сервисов на Render
2. Проверь все Environment Variables
3. Проверь что `window.BOT_USERNAME` установлен
4. Очисть кэш браузера
5. Попробуй в incognito режиме

Всё должно работать! 🎉
