# ⚡ БЫСТРОЕ ИСПРАВЛЕНИЕ - Root Directory

## 🔴 ОШИБКА НА ТВОИХ СКРИНШОТАХ

```
Root directory "server" does not exist.
cd: /opt/render/project/src/bot/server: No such file or directory
```

## ✅ ИСПРАВЛЕНИЕ

### На скриншотах вижу Root Directory:
- БОТ: `bot/server` ← ПРАВИЛЬНО!
- САЙТ: `site/server` ← ПРАВИЛЬНО!

### НО! Проблема в том, что файлы НЕ ЗАКОММИЧЕНЫ в Git!

---

## 🚀 ЧТО ДЕЛАТЬ СЕЙЧАС

### Шаг 1: Проверь что файлы есть локально

```bash
dir bot\server\server.js
dir site\server\server.js
```

Должно показать файлы. Если показывает - переходи к Шагу 2.

### Шаг 2: Закоммить ВСЁ в Git

```bash
cd C:\Users\dev_fenomen\Desktop\duo

git status
git add .
git commit -m "Add bot and site servers with referral integration"
git push origin main
```

**ВАЖНО:** Без этого Render не увидит файлы!

### Шаг 3: Подожди 2-3 минуты

После `git push` подожди пару минут, чтобы GitHub обработал изменения.

### Шаг 4: Render - Manual Deploy

1. Открой сервис БОТ на Render
2. Нажми **"Manual Deploy"** → **"Clear build cache & deploy"**
3. Открой Logs - смотри результат

Повтори для САЙТА.

---

## ✅ ПРАВИЛЬНЫЕ НАСТРОЙКИ (как на твоих скриншотах)

### 🤖 БОТ

```
Repository: https://github.com/Pacific1a/repomain
Branch: main
Root Directory: bot/server
Build Command: npm install
Start Command: npm start
```

### 👥 САЙТ

```
Repository: https://github.com/Pacific1a/repomain  
Branch: main
Root Directory: site/server
Build Command: npm install
Start Command: npm start
```

---

## 📝 ПОЛНАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ

### 1. Закоммить изменения:

```powershell
cd "C:\Users\dev_fenomen\Desktop\duo"
git add .
git status
git commit -m "Add referral integration"
git push
```

### 2. Проверить на GitHub:

Открой: https://github.com/Pacific1a/repomain

Убедись что видишь:
- ✅ `bot/server/server.js`
- ✅ `bot/server/package.json`
- ✅ `bot/server/referral-tracker.js`
- ✅ `bot/server/partner-webhook.js`
- ✅ `site/server/server.js`
- ✅ `site/server/package.json`

Если НЕ видишь - значит не закоммичено!

### 3. Render - Manual Deploy:

**БОТ:**
1. Dashboard → duo-bot
2. Manual Deploy → Clear build cache & deploy
3. Смотри Logs

**САЙТ:**
1. Dashboard → duo-site
2. Manual Deploy → Clear build cache & deploy
3. Смотри Logs

---

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

### В логах БОТ должно быть:

```
==> Cloning from https://github.com/Pacific1a/repomain...
==> Checking out commit...
==> Using Node version 18.x
==> Docs: https://render.com/docs/node-version
==> Running 'npm install'
npm WARN EBADENGINE ...
added XXX packages
==> Build successful 🎉
==> Uploading build...
==> Starting service with 'npm start'
✅ Referral tracker initialized
📊 Tracked users: 0
✅ Partner Webhook enabled: ...
🚀 Сервер запущен на порту 10000
```

### В логах САЙТ должно быть:

```
==> Cloning from https://github.com/Pacific1a/repomain...
==> Using Node version 18.x
==> Running 'npm install'
added XXX packages
==> Build successful 🎉
==> Starting service with 'npm start'
✅ SQLite подключена
✅ Таблица users готова
Server running on http://localhost:10000
```

---

## ❌ ЕСЛИ ВСЁ ЕЩЁ ОШИБКА

### Ошибка: "Root directory does not exist"

**Причина:** Файлы не закоммичены в Git

**Решение:**
```bash
cd "C:\Users\dev_fenomen\Desktop\duo"
git add bot/
git add site/
git commit -m "Add servers"
git push
```

Подожди 2 минуты → Manual Deploy

---

### Ошибка: "Cannot find module 'express'"

**Причина:** `package.json` не найден

**Проверь:**
```bash
dir bot\server\package.json
dir site\server\package.json
```

Если нет - значит файлы в другом месте!

**Решение:** Проверь где `package.json`:
```bash
dir bot /s /b | findstr "package.json"
```

Если показывает `bot\package.json` (без `server\`), то Root Directory должен быть `bot` (не `bot/server`)!

---

## 🔍 ДИАГНОСТИКА

### Отправь мне результаты этих команд:

```powershell
cd "C:\Users\dev_fenomen\Desktop\duo"
dir bot\server
dir site\server
git status
git ls-files | Select-String "server.js"
```

Скопируй вывод и я скажу точно что делать!
