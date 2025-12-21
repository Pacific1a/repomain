# ⚡ RENDER - Быстрая настройка

## 🎯 КРАТКО

Создаешь **2 ОТДЕЛЬНЫХ** сервиса на Render из одного репо.

---

## 🤖 БОТ

| Параметр | Значение |
|----------|----------|
| **Name** | `duo-bot` |
| **Root Directory** | `bot/server` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

**Environment Variables:**
```env
PORT=10000
PARTNER_SITE_URL=https://duo-site.onrender.com
PARTNER_API_SECRET=твой-секретный-ключ-123
```

---

## 👥 САЙТ

| Параметр | Значение |
|----------|----------|
| **Name** | `duo-site` |
| **Root Directory** | `site/server` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

**Environment Variables:**
```env
PORT=10000
JWT_SECRET=jwt-secret-key-456
PARTNER_API_SECRET=твой-секретный-ключ-123
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-password
```

---

## 🔑 ВАЖНО!

**`PARTNER_API_SECRET` ДОЛЖЕН БЫТЬ ОДИНАКОВЫЙ!**

```
БОТ:  PARTNER_API_SECRET=secret-123
САЙТ: PARTNER_API_SECRET=secret-123  ← ТАКОЙ ЖЕ!
```

---

## ✅ ПРОВЕРКА

### Логи БОТА:
```
✅ Referral tracker initialized
✅ Partner Webhook enabled
🚀 Сервер запущен
```

### Логи САЙТА:
```
✅ SQLite подключена
Server running
```

### Webhook работает:
```
БОТ: ✅ Webhook success
САЙТ: ✅ Webhook authenticated
```

---

## 📞 ЕСЛИ НЕ РАБОТАЕТ

### Build Failed?
- Проверь Root Directory: `bot/server` или `site/server`

### 401 Unauthorized?
- Проверь что `PARTNER_API_SECRET` одинаковый

### Cannot find module?
- Проверь что файлы закоммичены:
  - `bot/server/referral-tracker.js`
  - `bot/server/partner-webhook.js`

---

**Подробная инструкция: RENDER_SETUP.md** →
