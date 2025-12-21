# 🎮 DUO - Telegram Mini App + Partner Site

Игровой бот для Telegram с интегрированной партнерской программой.

---

## 🚀 Быстрый старт

### Локально:

1. **Читай START_HERE.md** ← Начни с этого файла!

### На Render:

1. **Читай DEPLOY_CHECKLIST.md** ← Пошаговая инструкция

---

## 📚 Документация

| Файл | Для чего |
|------|----------|
| **START_HERE.md** | 🚀 Быстрый старт (локально) |
| **FINAL_SUMMARY.md** | 📋 Итоговая сводка |
| **DEPLOY_CHECKLIST.md** | ✅ Чеклист деплоя на Render |
| **RENDER_SETUP.md** | 🌐 Полная инструкция Render |
| **RENDER_QUICK.md** | ⚡ Быстрая справка Render |
| **KEYS_EXPLAINED.md** | 🔑 Про ключи простым языком |
| **FIX_APPLIED.md** | 🔧 Исправление async/await |

---

## 📂 Структура

```
duo/
├── bot/                    # Telegram Mini App (игры)
│   └── server/
│       ├── server.js       # Socket.IO + игры
│       ├── package.json
│       ├── partner-webhook.js
│       └── referral-tracker.js
│
├── site/                   # Партнерский сайт
│   └── server/
│       ├── server.js       # REST API + реф. программа
│       └── package.json
│
└── render.yaml             # Автоконфигурация Render
```

---

## 🎯 Функции

### Бот:
- 🎰 Roll (рулетка)
- 🚀 Crash (множитель)
- 🃏 BlackJack
- ⚡ SpeedCash
- 💣 Mine
- 📡 Live Prizes (WebSocket)

### Партнерка:
- 👥 Регистрация партнеров
- 🔐 JWT авторизация
- 🔗 Реферальные ссылки
- 📊 Статистика (клики, депозиты, доход)
- 💰 Начисление процентов

### Интеграция:
- 🔗 Бот отправляет данные на сайт (webhook)
- 📈 Партнеры видят статистику в реальном времени
- 💎 Автоматическое начисление % при проигрыше реферала

---

## 🔑 Ключи

**PARTNER_API_SECRET** = общий пароль между ботом и сайтом

Придумай любой сложный пароль и укажи **ОДИНАКОВЫЙ** на обоих сервисах:

```env
# На боте:
PARTNER_API_SECRET=твой-секретный-ключ

# На сайте:
PARTNER_API_SECRET=твой-секретный-ключ  ← ТАКОЙ ЖЕ!
```

Подробно читай **KEYS_EXPLAINED.md**

---

## 🚀 Деплой на Render

### Способ 1: Blueprint (автоматически)

```bash
1. Закоммить render.yaml
2. Render Dashboard → New + → Blueprint
3. Готово! Оба сервиса создадутся автоматически
```

### Способ 2: Вручную

Читай **DEPLOY_CHECKLIST.md** - подробная инструкция.

### Настройки:

**БОТ:**
```
Root Directory: bot/server
Build Command: npm install
Start Command: npm start
```

**САЙТ:**
```
Root Directory: site/server
Build Command: npm install
Start Command: npm start
```

---

## ✅ Проверка после деплоя

### Логи БОТА должны показывать:
```
✅ Referral tracker initialized
✅ Partner Webhook enabled
🚀 Сервер запущен
```

### Логи САЙТА должны показывать:
```
✅ SQLite подключена
Server running
```

### Webhook работает:
```
БОТ:  ✅ Webhook success
САЙТ: ✅ Webhook authenticated
```

---

## 🔧 Если проблемы

### Build Failed?
- Проверь Root Directory (должно быть `bot/server` и `site/server`)

### Cannot find module?
- Проверь что все файлы закоммичены:
  - `bot/server/referral-tracker.js`
  - `bot/server/partner-webhook.js`

### 401 Unauthorized?
- Проверь что `PARTNER_API_SECRET` одинаковый на обоих сервисах

### Сервер падает?
- Читай **FIX_APPLIED.md**

---

## 📞 Контакты

Telegram: @dev_fenomen

---

## 🎉 Готово к деплою!

Всё исправлено, протестировано и готово к запуску.

**Начни с START_HERE.md** →
