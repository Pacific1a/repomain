# ✅ ГОТОВО К ДЕПЛОЮ НА RENDER!

## 🎉 ЧТО СДЕЛАНО

✅ Submodules удалены  
✅ Все файлы добавлены в Git как обычные папки  
✅ Коммит создан (2689 файлов)  
✅ Запушено на GitHub  

---

## 🔍 ПРОВЕРЬ НА GITHUB

Открой: **https://github.com/Pacific1a/repomain**

Должен увидеть:
- ✅ `bot/server/server.js`
- ✅ `bot/server/package.json`
- ✅ `bot/server/partner-webhook.js`
- ✅ `bot/server/referral-tracker.js`
- ✅ `site/server/server.js`
- ✅ `site/server/package.json`

Если видишь - **ОТЛИЧНО!** Теперь Render увидит файлы!

---

## 🚀 ДЕПЛОЙ НА RENDER

### 🤖 СЕРВИС 1: БОТ

1. Открой https://dashboard.render.com/
2. Найди свой сервис **duo-bot** (или создай новый)
3. Открой **Settings → Build & Deploy**
4. Настрой:

```
Repository: https://github.com/Pacific1a/repomain
Branch: main
Root Directory: bot/server          ← ВАЖНО!
Build Command: npm install
Start Command: npm start
```

5. **Environment Variables:**

```env
PORT=10000
PARTNER_SITE_URL=https://duo-site.onrender.com
PARTNER_API_SECRET=твой-секретный-ключ-123
API_SECRET=bot-api-secret
MONGODB_URI=
```

6. Save Changes
7. **Manual Deploy** → **Clear build cache & deploy**

---

### 👥 СЕРВИС 2: САЙТ

1. Найди сервис **duo-site** (или создай новый)
2. Открой **Settings → Build & Deploy**
3. Настрой:

```
Repository: https://github.com/Pacific1a/repomain
Branch: main
Root Directory: site/server         ← ВАЖНО!
Build Command: npm install
Start Command: npm start
```

4. **Environment Variables:**

```env
PORT=10000
JWT_SECRET=jwt-secret-key-456
PARTNER_API_SECRET=твой-секретный-ключ-123    ← ТАКОЙ ЖЕ КАК В БОТЕ!
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=DUO Partners <noreply@duopartners.com>
SITE_URL=https://duo-site.onrender.com
```

5. Save Changes
6. **Manual Deploy** → **Clear build cache & deploy**

---

## ✅ ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ

### Логи БОТА должны показывать:

```
==> Cloning from https://github.com/Pacific1a/repomain...
==> Checking out commit 5a1fbc3...
==> Using Node version 18.x
==> Running 'npm install'
npm WARN EBADENGINE ...
added XXX packages
==> Build successful 🎉
==> Uploading build...
==> Starting service with 'npm start'

✅ Referral tracker initialized
📊 Tracked users: 0
✅ Partner Webhook enabled: https://duo-site.onrender.com
🚀 Сервер запущен на порту 10000
📡 Socket.IO server initialized
```

### Логи САЙТА должны показывать:

```
==> Cloning from https://github.com/Pacific1a/repomain...
==> Using Node version 18.x
==> Running 'npm install'
added XXX packages
==> Build successful 🎉
==> Starting service with 'npm start'

✅ SQLite подключена
✅ Таблица users готова
✅ Таблица materials готова
Server running on http://localhost:10000
```

---

## 🧪 ТЕСТ WEBHOOK

После деплоя обоих сервисов:

1. Получи URL бота (например `https://duo-bot-xyz.onrender.com`)
2. Открой в браузере:
   ```
   https://duo-bot-xyz.onrender.com/?tgWebAppStartParam=ref_test123
   ```

3. Проверь логи:

**БОТ:**
```
🔗 Start param detected: ref_test123
✅ User XXX linked to partner test123
✅ Webhook success [/api/referral/click]
```

**САЙТ:**
```
✅ Webhook authenticated
POST /api/referral/click 200
```

Если видишь - **WEBHOOK РАБОТАЕТ!** ✅

---

## ⚠️ ЕСЛИ ОШИБКА

### Ошибка: "Root directory does not exist"

**Решение:** Проверь что Root Directory указан правильно:
- БОТ: `bot/server` (без слешей!)
- САЙТ: `site/server`

### Ошибка: "Cannot find module 'express'"

**Решение:** 
1. Проверь что `package.json` в правильном месте
2. Проверь Build Command: `npm install`
3. Clear build cache & deploy

### Ошибка: 401 Unauthorized в webhook

**Решение:**
1. Открой Environment Variables на ОБОИХ сервисах
2. Проверь что `PARTNER_API_SECRET` **ОДИНАКОВЫЙ**
3. Save Changes на обоих
4. Подожди передеплоя

---

## 🔑 ПРО КЛЮЧ (ВАЖНО!)

`PARTNER_API_SECRET` должен быть **ОДИНАКОВЫЙ** на обоих сервисах!

```
БОТ:  PARTNER_API_SECRET=secret-123
САЙТ: PARTNER_API_SECRET=secret-123  ← ТАКОЙ ЖЕ!
```

Если разные - webhook не работает (401 ошибка).

**Придумай ЛЮБОЙ сложный пароль:**
- `duo-secret-production-2024`
- `my-super-secret-key-xyz`
- `k8Pq2mN9xR5tL7wY3bH6`

---

## 📊 ИТОГОВАЯ СХЕМА

```
RENDER
│
├─ duo-bot (Active)
│  ├─ https://duo-bot-xyz.onrender.com
│  ├─ Root: bot/server
│  └─ ENV:
│      ├─ PORT=10000
│      ├─ PARTNER_SITE_URL=https://duo-site-xyz.onrender.com
│      └─ PARTNER_API_SECRET=secret-123
│
└─ duo-site (Active)
   ├─ https://duo-site-xyz.onrender.com
   ├─ Root: site/server
   └─ ENV:
       ├─ PORT=10000
       ├─ JWT_SECRET=jwt-456
       └─ PARTNER_API_SECRET=secret-123  ← ТАКОЙ ЖЕ!
```

---

## 🎯 ЧТО ДАЛЬШЕ

1. ✅ Файлы на GitHub - **ГОТОВО**
2. ⏳ Деплой на Render - **ТВОЙ ШАГ**
3. ⏳ Настройка Environment Variables - **ТВОЙ ШАГ**
4. ⏳ Проверка работы - **ТВОЙ ШАГ**

---

## 🎉 РЕЗУЛЬТАТ

После деплоя:

✅ Бот и сайт работают на отдельных URL  
✅ Партнеры создают реферальные ссылки  
✅ Бот отправляет данные на сайт через webhook  
✅ Партнеры видят статистику в реальном времени  
✅ Автоматическое начисление 10% при проигрыше  

**ВСЁ ГОТОВО К ЗАПУСКУ!** 🚀
