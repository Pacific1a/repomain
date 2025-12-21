# 🚀 НАСТРОЙКА RENDER - Пошаговая инструкция

## 📂 СТРУКТУРА ПРОЕКТА

```
duo/
├── bot/
│   └── server/
│       ├── server.js
│       ├── package.json
│       └── models/
└── site/
    └── server/
        ├── server.js
        └── package.json
```

**ВАЖНО:** На Render будет **ДВА ОТДЕЛЬНЫХ СЕРВИСА**!

---

## 🤖 СЕРВИС 1: БОТ (Telegram Mini App)

### Подключение репозитория

1. Открой [Render Dashboard](https://dashboard.render.com/)
2. Нажми **"New +"** → **"Web Service"**
3. Подключи свой GitHub/GitLab репозиторий

---

### Основные настройки

| Параметр | Значение |
|----------|----------|
| **Name** | `duo-bot` (или любое имя) |
| **Region** | `Frankfurt (EU Central)` или ближайший |
| **Branch** | `main` |
| **Root Directory** | `bot/server` ← **ВАЖНО!** |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

---

### Environment Variables (Переменные окружения)

Добавь эти переменные (кнопка **"Add Environment Variable"**):

```env
# Порт (автоматически от Render)
PORT=10000

# URL партнерского сайта (ПОСЛЕ создания сайта!)
PARTNER_SITE_URL=https://duo-site.onrender.com

# Секретный ключ (ПРИДУМАЙ СЛОЖНЫЙ!)
PARTNER_API_SECRET=duo-secret-key-xyz-2024-production

# MongoDB (если используешь, необязательно)
MONGODB_URI=

# API Secret (необязательно)
API_SECRET=bot-api-secret-production
```

**⚠️ ВАЖНО:**
- `PARTNER_SITE_URL` - укажешь ПОСЛЕ создания второго сервиса (сайта)
- `PARTNER_API_SECRET` - должен быть **ОДИНАКОВЫЙ** на обоих сервисах!

---

### Дополнительные настройки

| Параметр | Значение |
|----------|----------|
| **Auto-Deploy** | `Yes` (автодеплой при push) |
| **Instance Type** | `Free` или `Starter` |

---

## 👥 СЕРВИС 2: САЙТ (Партнерская программа)

### Подключение репозитория

1. Нажми **"New +"** → **"Web Service"**
2. Выбери **ТОТ ЖЕ** репозиторий

---

### Основные настройки

| Параметр | Значение |
|----------|----------|
| **Name** | `duo-site` (или любое имя) |
| **Region** | `Frankfurt (EU Central)` или ближайший |
| **Branch** | `main` |
| **Root Directory** | `site/server` ← **ВАЖНО!** |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

---

### Environment Variables (Переменные окружения)

```env
# Порт (автоматически от Render)
PORT=10000

# JWT секрет (ПРИДУМАЙ СЛОЖНЫЙ!)
JWT_SECRET=jwt-super-secret-key-production-2024

# Секретный ключ (ТАКОЙ ЖЕ КАК В БОТЕ!)
PARTNER_API_SECRET=duo-secret-key-xyz-2024-production

# Email (для восстановления паролей)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=DUO Partners <noreply@duopartners.com>

# URL сайта (ПОСЛЕ деплоя!)
SITE_URL=https://duo-site.onrender.com
```

**⚠️ ВАЖНО:**
- `PARTNER_API_SECRET` - **ТОЧНО ТАКОЙ ЖЕ** как в боте!
- `SITE_URL` - укажешь после первого деплоя

---

## ✅ ЧЕКЛИСТ ПЕРЕД ДЕПЛОЕМ

### Для БОТА:

- [x] Root Directory = `bot/server`
- [x] Build Command = `npm install`
- [x] Start Command = `npm start`
- [x] Файлы на месте:
  - `bot/server/server.js` ✅
  - `bot/server/package.json` ✅
  - `bot/server/partner-webhook.js` ✅
  - `bot/server/referral-tracker.js` ✅

### Для САЙТА:

- [x] Root Directory = `site/server`
- [x] Build Command = `npm install`
- [x] Start Command = `npm start`
- [x] Файлы на месте:
  - `site/server/server.js` ✅
  - `site/server/package.json` ✅

---

## 🔗 СВЯЗЫВАНИЕ СЕРВИСОВ

После создания ОБОИХ сервисов:

### 1. Получи URL'ы:

**БОТ:**
```
https://duo-bot.onrender.com
```

**САЙТ:**
```
https://duo-site.onrender.com
```

### 2. Обнови Environment Variables на БОТЕ:

Открой настройки бота → Environment Variables → Отредактируй:

```env
PARTNER_SITE_URL=https://duo-site.onrender.com  ← URL сайта
```

Сохрани → Render автоматически передеплоит.

### 3. Обнови Environment Variables на САЙТЕ:

```env
SITE_URL=https://duo-site.onrender.com  ← Свой URL
```

---

## 🧪 ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ

### 1. Проверь логи БОТА:

Открой бот → Logs

**Ожидаемо:**
```
✅ Referral tracker initialized
📊 Tracked users: 0
✅ Partner Webhook enabled: https://duo-site.onrender.com
🚀 Сервер запущен на порту 10000
```

### 2. Проверь логи САЙТА:

Открой сайт → Logs

**Ожидаемо:**
```
✅ SQLite подключена
✅ Таблица users готова
✅ Таблица materials готова
Server running on http://localhost:10000
```

### 3. Проверь работу webhook:

Открой бот в браузере с реферальной ссылкой:
```
https://duo-bot.onrender.com/?tgWebAppStartParam=ref_test123
```

**В логах БОТА должно быть:**
```
🔗 Start param detected: ref_test123
✅ User XXX linked to partner test123
✅ Webhook success [/api/referral/click]
```

**В логах САЙТА должно быть:**
```
✅ Webhook authenticated
POST /api/referral/click 200
```

---

## ⚠️ ЧАСТЫЕ ПРОБЛЕМЫ

### 1. Build Failed: Cannot find module

**Ошибка:**
```
Error: Cannot find module 'express'
```

**Причина:** Неправильный Root Directory

**Решение:**
- БОТ: `bot/server` (не `bot` и не `bot/server/server`)
- САЙТ: `site/server`

---

### 2. Application failed to respond

**Ошибка:**
```
Your service is failing its health checks
```

**Причина:** Сервер не запускается или падает

**Решение:** Проверь логи → найди ошибку:
- `Cannot find module 'referral-tracker'` → проверь что файл закоммичен
- `SyntaxError` → проверь что исправление async/await применено

---

### 3. 401 Unauthorized в webhook

**Ошибка в логах сайта:**
```
⚠️ Unauthorized webhook attempt
```

**Причина:** `PARTNER_API_SECRET` не совпадают

**Решение:**
1. Открой Environment Variables на боте
2. Скопируй значение `PARTNER_API_SECRET`
3. Открой Environment Variables на сайте
4. Убедись что `PARTNER_API_SECRET` **ТОЧНО ТАКОЙ ЖЕ**
5. Сохрани → передеплой оба сервиса

---

### 4. Webhook disabled

**Логи бота:**
```
⚠️ Partner Webhook disabled: PARTNER_SITE_URL not set
```

**Не критично!** Webhook просто выключен.

**Чтобы включить:**
1. Создай сервис сайта
2. Получи URL (например `https://duo-site.onrender.com`)
3. Добавь в Environment Variables бота:
   ```env
   PARTNER_SITE_URL=https://duo-site.onrender.com
   ```
4. Сохрани → передеплой

---

## 📊 ИТОГОВАЯ СХЕМА

```
RENDER
│
├─ БОТ (duo-bot)
│  ├─ URL: https://duo-bot.onrender.com
│  ├─ Root: bot/server
│  └─ ENV:
│      ├─ PORT=10000
│      ├─ PARTNER_SITE_URL=https://duo-site.onrender.com
│      └─ PARTNER_API_SECRET=secret-key-123
│
└─ САЙТ (duo-site)
   ├─ URL: https://duo-site.onrender.com
   ├─ Root: site/server
   └─ ENV:
       ├─ PORT=10000
       ├─ PARTNER_API_SECRET=secret-key-123  ← ТАКОЙ ЖЕ!
       └─ JWT_SECRET=jwt-key-456
```

---

## 🎯 БЫСТРЫЙ СТАРТ

### Создание БОТ сервиса:

1. New + → Web Service
2. Выбери репо
3. Name: `duo-bot`
4. Root Directory: `bot/server`
5. Build: `npm install`
6. Start: `npm start`
7. Add env vars (см. выше)
8. Create Web Service

### Создание САЙТ сервиса:

1. New + → Web Service
2. Выбери ТОТ ЖЕ репо
3. Name: `duo-site`
4. Root Directory: `site/server`
5. Build: `npm install`
6. Start: `npm start`
7. Add env vars (см. выше)
8. Create Web Service

### Связывание:

1. Скопируй URL сайта (напр. `https://duo-site.onrender.com`)
2. Добавь в Environment Variables бота:
   ```
   PARTNER_SITE_URL=https://duo-site.onrender.com
   ```
3. Готово! ✅

---

## 🎉 РЕЗУЛЬТАТ

После настройки:

✅ Два сервиса работают независимо  
✅ Бот отправляет данные на сайт  
✅ Сайт принимает только с правильным ключом  
✅ Реферальная система синхронизирована  
✅ Партнеры видят статистику  

**Без объединения серверов!** 🚀
