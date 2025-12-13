# 🌐 Структура URL после деплоя

## 📋 Два сайта на одном домене

Ваш проект настроен так, что **один сервис** на Render раздает:

### 1️⃣ Бот с играми (главная страница)
```
https://your-app.onrender.com/
```
- Файл: `index.html` (в корне)
- Папки: `main/`, `roll/`, `crash/`, `mine/` и т.д.
- Стили: `pages_bot/main/`

### 2️⃣ Сайт партнеров (dashboard)
```
https://your-app.onrender.com/partner/
```
- Файл: `site/index.html`
- Папки: `site/dashboard/`, `site/css/`, `site/js/`
- Стили: `duo-partner/css/`

### 3️⃣ API для бота
```
https://your-app.onrender.com/api/
```
- `/api/balance/:id` - баланс пользователя
- `/api/referral/:id` - реферальная система
- `/api/transactions/:id` - транзакции
- `/api/telegram-user/:id` - данные пользователя

## 🔗 Примеры использования

### После деплоя на Render:

**Бот открывается:**
```
https://telegram-games-xxxx.onrender.com/
```

**Сайт партнеров открывается:**
```
https://telegram-games-xxxx.onrender.com/partner/
```

**API работает:**
```
https://telegram-games-xxxx.onrender.com/api/balance/123456789
```

## 📱 Telegram Bot

В вашем боте используйте ссылки:

**Для игр:**
```
https://t.me/your_bot/app?startapp=game_roll
→ Открывает: https://your-app.onrender.com/roll/
```

**Для сайта партнеров:**
```
https://your-app.onrender.com/partner/
```

**Реферальная ссылка:**
```
https://t.me/your_bot?start=ref_3_MJ3FLZNWEE3U9
```

## 🛠️ Локальное тестирование

```bash
node server/server.js
```

Проверьте:
- http://localhost:3000/ - бот с играми ✅
- http://localhost:3000/partner/ - сайт партнеров ✅
- http://localhost:3000/api/balance/123 - API ✅

## 📊 Структура проекта

```
Render: https://your-app.onrender.com
│
├── /                           → index.html (бот с играми)
│   ├── /main/                  → Главная бота
│   ├── /roll/                  → Игра Roll
│   ├── /crash/                 → Игра Crash
│   ├── /mine/                  → Игра Mine
│   └── ...
│
├── /partner/                   → site/index.html (сайт партнеров)
│   ├── /partner/dashboard/     → Dashboard партнера
│   ├── /partner/css/           → Стили сайта
│   ├── /partner/js/            → JS сайта
│   └── ...
│
└── /api/                       → API endpoints
    ├── /api/balance/:id
    ├── /api/referral/:id
    └── /api/transactions/:id
```

## ⚙️ Настройка ссылок в сайте партнеров

Если внутри `site/index.html` есть ссылки на другие страницы:

**Было:**
```html
<a href="dashboard/index.html">Dashboard</a>
<link rel="stylesheet" href="css/style.css">
<script src="js/referral.js"></script>
```

**Должно быть (с учетом /partner/):**
```html
<a href="/partner/dashboard/">Dashboard</a>
<link rel="stylesheet" href="/partner/css/style.css">
<script src="/partner/js/referral.js"></script>
```

Или используйте относительные пути (они будут работать автоматически):
```html
<a href="dashboard/">Dashboard</a>
<link rel="stylesheet" href="css/style.css">
<script src="js/referral.js"></script>
```

## 🔧 Если нужен другой URL для партнеров

Хотите вместо `/partner/` использовать другой путь? Измените в `server/server.js`:

```javascript
// Вместо /partner/ используйте любой путь:
app.use('/site', express.static(path.join(projectRoot, 'site')));
// или
app.use('/dashboard', express.static(path.join(projectRoot, 'site')));
// или
app.use('/partners', express.static(path.join(projectRoot, 'site')));
```

## ✅ Чеклист проверки

После деплоя проверьте:

- [ ] `https://your-app.onrender.com/` - открывается бот
- [ ] Стили бота загружаются (pages_bot/main/)
- [ ] Игры работают (roll, crash, mine)
- [ ] `https://your-app.onrender.com/partner/` - открывается сайт партнеров
- [ ] Стили сайта загружаются (duo-partner/css/)
- [ ] `https://your-app.onrender.com/api/balance/123` - API работает
- [ ] WebSocket подключается

## 🐛 Если стили не загружаются

### Проблема: Стили бота пропали

**Причина:** Неправильные пути в `index.html`

**Решение:** Убедитесь что в корневом `index.html` используются правильные пути:
```html
<!-- ✅ Правильно -->
<link rel="stylesheet" href="pages_bot/main/globals.css" />
<link rel="stylesheet" href="./pages_bot/main/globals.css" />
<link rel="stylesheet" href="/pages_bot/main/globals.css" />

<!-- ❌ Неправильно -->
<link rel="stylesheet" href="../pages_bot/main/globals.css" />
```

### Проблема: Стили сайта партнеров пропали

**Причина:** Пути относительно /partner/

**Решение:** В `site/index.html` используйте:
```html
<!-- ✅ Правильно (относительные пути) -->
<link rel="stylesheet" href="duo-partner/css/style.css">

<!-- или абсолютные с /partner/ -->
<link rel="stylesheet" href="/partner/duo-partner/css/style.css">
```

## 📝 Итого

**Главная страница (бот):**
```
https://your-app.onrender.com/
```

**Сайт партнеров:**
```
https://your-app.onrender.com/partner/
```

**API:**
```
https://your-app.onrender.com/api/*
```

Теперь оба сайта работают на одном домене без конфликтов! 🎉
