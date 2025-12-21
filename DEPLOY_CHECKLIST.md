# ✅ ЧЕКЛИСТ ДЕПЛОЯ НА RENDER

## 📋 ПЕРЕД ДЕПЛОЕМ

### 1. Проверь файлы в репозитории:

```bash
# В корне репозитория должно быть:
duo/
├── render.yaml               ← Конфигурация Render
├── bot/
│   └── server/
│       ├── server.js         ← Исправлен (async/await)
│       ├── package.json
│       ├── partner-webhook.js
│       ├── referral-tracker.js
│       └── models/
└── site/
    └── server/
        ├── server.js         ← Исправлен (webhookAuth)
        └── package.json
```

### 2. Убедись что все закоммичено:

```bash
git status
# Должно быть: nothing to commit, working tree clean
```

Если есть незакоммиченные файлы:

```bash
git add .
git commit -m "Add referral integration"
git push
```

---

## 🚀 ДЕПЛОЙ (Способ 1: Blueprint)

### 1. Открой Render Dashboard

https://dashboard.render.com/

### 2. Создай Blueprint

- Нажми **"New +"** → **"Blueprint"**
- Подключи свой репозиторий
- Render найдет `render.yaml` автоматически
- Нажми **"Apply"**

### 3. Дождись создания сервисов

Render создаст:
- ✅ `duo-bot`
- ✅ `duo-site`

---

## 🚀 ДЕПЛОЙ (Способ 2: Вручную)

Если Blueprint не работает или хочешь больше контроля:

### Сервис 1: БОТ

1. **New +** → **Web Service**
2. Выбери репозиторий
3. Настройки:
   ```
   Name: duo-bot
   Root Directory: bot/server
   Build Command: npm install
   Start Command: npm start
   ```
4. Environment Variables:
   ```env
   PORT=10000
   PARTNER_SITE_URL=https://duo-site.onrender.com
   PARTNER_API_SECRET=твой-секретный-ключ
   ```
5. **Create Web Service**

### Сервис 2: САЙТ

1. **New +** → **Web Service**
2. Выбери **ТОТ ЖЕ** репозиторий
3. Настройки:
   ```
   Name: duo-site
   Root Directory: site/server
   Build Command: npm install
   Start Command: npm start
   ```
4. Environment Variables:
   ```env
   PORT=10000
   JWT_SECRET=jwt-secret-key
   PARTNER_API_SECRET=твой-секретный-ключ (ТАКОЙ ЖЕ!)
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-password
   ```
5. **Create Web Service**

---

## 🔗 ПОСЛЕ ДЕПЛОЯ

### 1. Получи URL'ы сервисов

Открой каждый сервис → скопируй URL:

```
БОТ:  https://duo-bot.onrender.com
САЙТ: https://duo-site.onrender.com
```

### 2. Обнови Environment Variables

**На БОТЕ:**
1. Открой `duo-bot` → Settings → Environment
2. Отредактируй `PARTNER_SITE_URL`:
   ```
   PARTNER_SITE_URL=https://duo-site.onrender.com
   ```
3. Save Changes (автоматически передеплоится)

**На САЙТЕ:**
1. Открой `duo-site` → Settings → Environment
2. Отредактируй `SITE_URL`:
   ```
   SITE_URL=https://duo-site.onrender.com
   ```
3. Save Changes

### 3. Проверь что `PARTNER_API_SECRET` одинаковый

**На БОТЕ:**
```
PARTNER_API_SECRET=secret-key-123
```

**На САЙТЕ:**
```
PARTNER_API_SECRET=secret-key-123  ← ДОЛЖЕН БЫТЬ ТАКОЙ ЖЕ!
```

Если разные - отредактируй и сохрани.

---

## ✅ ПРОВЕРКА РАБОТЫ

### 1. Проверь логи БОТА

`duo-bot` → Logs

**Должно быть:**
```
✅ Referral tracker initialized
📊 Tracked users: 0
✅ Partner Webhook enabled: https://duo-site.onrender.com
🚀 Сервер запущен на порту 10000
📡 Socket.IO server initialized
```

**❌ Если ошибка:**
- `Cannot find module 'referral-tracker'` → файл не закоммичен
- `SyntaxError: await` → исправление async не применено
- Build failed → неправильный Root Directory

---

### 2. Проверь логи САЙТА

`duo-site` → Logs

**Должно быть:**
```
✅ SQLite подключена
✅ Таблица users готова
✅ Таблица materials готова
Server running on http://localhost:10000
```

**❌ Если ошибка:**
- `Cannot find module` → проверь Root Directory
- `ENOENT` → файл не найден

---

### 3. Проверь доступность

**БОТ:**
```bash
curl https://duo-bot.onrender.com/api/health
```

**Ожидаемо:**
```json
{"status":"ok","timestamp":"..."}
```

**САЙТ:**
```bash
curl https://duo-site.onrender.com/api/health
```

---

### 4. Проверь webhook

Открой в браузере:
```
https://duo-bot.onrender.com/?tgWebAppStartParam=ref_test123
```

**Логи БОТА:**
```
🔗 Start param detected: ref_test123
✅ User XXX linked to partner test123
✅ Webhook success [/api/referral/click]
```

**Логи САЙТА:**
```
✅ Webhook authenticated
POST /api/referral/click 200
```

---

## ⚠️ ЧАСТЫЕ ПРОБЛЕМЫ

### ❌ Build Failed

**Ошибка:**
```
npm ERR! Cannot find module 'express'
```

**Причина:** Неправильный Root Directory

**Решение:**
1. Settings → Root Directory
2. БОТ: `bot/server` (не `bot`)
3. САЙТ: `site/server` (не `site`)
4. Manual Deploy

---

### ❌ Application failed to respond

**Ошибка:**
```
Your service is failing its health checks
```

**Причина:** Сервер падает при запуске

**Решение:**
1. Открой Logs
2. Найди ошибку (красный текст)
3. Исправь в коде
4. Закоммить и запушь

Частые причины:
- `Cannot find module 'referral-tracker'` → файл не в репо
- `await is only valid in async` → исправление не применено

---

### ❌ 401 Unauthorized

**Логи сайта:**
```
⚠️ Unauthorized webhook attempt
```

**Причина:** `PARTNER_API_SECRET` не совпадают

**Решение:**
1. Открой Environment Variables на БОТЕ
2. Скопируй значение `PARTNER_API_SECRET`
3. Открой Environment Variables на САЙТЕ
4. Вставь **ТОЧНО ТАКОЕ ЖЕ** значение
5. Save Changes на обоих

---

### ❌ Webhook disabled

**Логи бота:**
```
⚠️ Partner Webhook disabled: PARTNER_SITE_URL not set
```

**Не критично!** Webhook просто выключен.

**Чтобы включить:**
1. Получи URL сайта (напр. `https://duo-site.onrender.com`)
2. Открой Environment Variables бота
3. Добавь/обнови:
   ```
   PARTNER_SITE_URL=https://duo-site.onrender.com
   ```
4. Save Changes

---

## 🎯 ФИНАЛЬНАЯ ПРОВЕРКА

После всех настроек должно быть:

✅ Оба сервиса `Active` (зелёный статус)  
✅ Логи бота показывают: `Partner Webhook enabled`  
✅ Логи сайта показывают: `Server running`  
✅ При тесте webhook'а: оба лога показывают успех  
✅ `PARTNER_API_SECRET` одинаковый на обоих  

---

## 📊 ИТОГ

```
RENDER
│
├─ duo-bot (Active)
│  ├─ https://duo-bot.onrender.com
│  ├─ Root: bot/server
│  └─ ENV:
│      ├─ PORT=10000
│      ├─ PARTNER_SITE_URL=https://duo-site.onrender.com
│      └─ PARTNER_API_SECRET=secret-123
│
└─ duo-site (Active)
   ├─ https://duo-site.onrender.com
   ├─ Root: site/server
   └─ ENV:
       ├─ PORT=10000
       ├─ JWT_SECRET=jwt-456
       └─ PARTNER_API_SECRET=secret-123  ← ТАКОЙ ЖЕ!
```

**Всё работает!** 🎉
