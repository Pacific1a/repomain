# ❌ ИСПРАВЛЕНИЕ ОШИБКИ ROOT DIRECTORY

## 🔴 ОШИБКА

```
Root directory "server" does not exist.
cd: /opt/render/project/src/bot/server: No such file or directory
```

## 🔍 ПРИЧИНА

Render не может найти папки `bot/server` и `site/server` потому что:

1. **Структура репозитория другая** чем ожидается
2. Файлы не закоммичены в Git
3. Root Directory указан неправильно

---

## ✅ РЕШЕНИЕ

### Вариант 1: Файлы в подпапках (bot/server/ и site/server/)

Если структура такая:
```
repomain/ (корень репо на GitHub)
├── bot/
│   └── server/
│       ├── server.js
│       └── package.json
└── site/
    └── server/
        ├── server.js
        └── package.json
```

**Root Directory должен быть:**
- БОТ: `bot/server`
- САЙТ: `site/server`

---

### Вариант 2: Файлы в корне (bot/ и site/ в корне репо)

Если структура такая:
```
Pacific1a/repomain/ (корень репо)
├── bot/
│   ├── server.js
│   ├── package.json
│   └── server/
└── site/
    ├── server.js
    ├── package.json
    └── server/
```

**Root Directory должен быть:**
- БОТ: `bot` (если server.js в bot/)
- САЙТ: `site` (если server.js в site/)

---

### Вариант 3: Всё в корне репо

Если структура такая:
```
repomain/ (корень)
├── server.js (бот)
├── package.json
└── (всё в корне)
```

**Root Directory должен быть:**
- Оставить пустым (корень)

---

## 🔍 КАК УЗНАТЬ ПРАВИЛЬНУЮ СТРУКТУРУ?

### 1. Проверь локально:

```bash
cd C:\Users\dev_fenomen\Desktop\duo
dir
```

### 2. Проверь что закоммичено в Git:

```bash
git ls-tree -r HEAD --name-only
```

Найди где `server.js` и `package.json`:
- Если видишь `bot/server/server.js` → Root: `bot/server`
- Если видишь `bot/server.js` → Root: `bot`
- Если видишь просто `server.js` → Root: (пусто)

### 3. Проверь на GitHub:

Открой https://github.com/Pacific1a/repomain

Посмотри структуру файлов в браузере.

---

## ✅ ПРАВИЛЬНЫЕ НАСТРОЙКИ ДЛЯ ТВОЕГО СЛУЧАЯ

Судя по твоим скриншотам, репо: `https://github.com/Pacific1a/repomain`

### 📂 Если у тебя структура:

```
repomain/ (корень GitHub репо)
├── bot/
│   ├── index.html
│   ├── server/
│   │   ├── server.js
│   │   └── package.json
│   └── ...
└── site/
    ├── index.html
    ├── server/
    │   ├── server.js
    │   └── package.json
    └── ...
```

### 🤖 БОТ - Настройки:

| Параметр | Значение |
|----------|----------|
| **Repository** | `https://github.com/Pacific1a/repomain` |
| **Branch** | `main` |
| **Root Directory** | `bot/server` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

### 👥 САЙТ - Настройки:

| Параметр | Значение |
|----------|----------|
| **Repository** | `https://github.com/Pacific1a/repomain` |
| **Branch** | `main` |
| **Root Directory** | `site/server` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

---

## 🔧 ЕСЛИ НЕ РАБОТАЕТ

### Проблема 1: Папки не в репо

Проверь что папки закоммичены:

```bash
cd C:\Users\dev_fenomen\Desktop\duo
git status
```

Если видишь `bot/` или `site/` в untracked:

```bash
git add bot/
git add site/
git commit -m "Add bot and site servers"
git push
```

### Проблема 2: Структура другая

Если файлы в другом месте, проверь:

```bash
git ls-files | findstr "server.js"
```

Результат покажет где файлы, например:
- `bot/server/server.js` → Root: `bot/server` ✅
- `bot/server.js` → Root: `bot` ✅
- `server/server.js` → Root: `server` ✅

### Проблема 3: Неправильный репозиторий

На скриншоте вижу:
```
https://github.com/Pacific1a/repomain
```

Это правильный репозиторий? Проверь:

```bash
cd C:\Users\dev_fenomen\Desktop\duo
git remote -v
```

Должно быть:
```
origin  https://github.com/Pacific1a/repomain.git
```

Если другой репозиторий - укажи правильный в Render!

---

## ✅ ПОШАГОВОЕ ИСПРАВЛЕНИЕ

### Шаг 1: Проверь структуру

```bash
cd C:\Users\dev_fenomen\Desktop\duo
dir bot
dir bot\server
```

Должно быть:
```
bot/server/
├── server.js     ← ВАЖНО!
├── package.json  ← ВАЖНО!
└── ...
```

### Шаг 2: Проверь что всё в Git

```bash
git status
```

Если есть незакоммиченные файлы:

```bash
git add .
git commit -m "Add all files"
git push
```

### Шаг 3: Проверь на GitHub

Открой: https://github.com/Pacific1a/repomain

Убедись что видишь:
- `bot/server/server.js` ✅
- `bot/server/package.json` ✅
- `site/server/server.js` ✅
- `site/server/package.json` ✅

### Шаг 4: Исправь Root Directory в Render

**БОТ:**
1. Открой сервис `duo-bot`
2. Settings → Build & Deploy
3. Root Directory: `bot/server` (БЕЗ слеша в конце!)
4. Save Changes
5. Manual Deploy

**САЙТ:**
1. Открой сервис `duo-site`
2. Settings → Build & Deploy
3. Root Directory: `site/server` (БЕЗ слеша в конце!)
4. Save Changes
5. Manual Deploy

---

## 📊 ИТОГ

**Правильные Root Directory:**

```
БОТ:  bot/server   (если server.js в bot/server/)
САЙТ: site/server  (если server.js в site/server/)
```

**БЕЗ:**
- ❌ Слеша в начале: `/bot/server`
- ❌ Слеша в конце: `bot/server/`
- ❌ Лишних пробелов

**С:**
- ✅ Просто: `bot/server`
- ✅ Или: `site/server`

---

## 🆘 ЕСЛ НЕ ПОНЯТНО

Отправь мне результат этих команд:

```bash
cd C:\Users\dev_fenomen\Desktop\duo
dir bot /s /b | findstr "server.js"
dir site /s /b | findstr "server.js"
git ls-files | findstr "server.js"
```

И я скажу точный Root Directory!
