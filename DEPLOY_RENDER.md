# 🚀 Деплой на Render - Сайт + API Сервер

## 📋 Описание

Этот проект настроен для деплоя на Render как **единый сервис**, который:
- Раздает статические файлы (index.html и все JS/CSS) из корня проекта
- Предоставляет API endpoints через `/api/*`
- Поддерживает WebSocket соединения для реал-тайм обновлений

## ✅ Что было настроено

### 1. **render.yaml** - Конфигурация деплоя
```yaml
services:
  - type: web
    name: telegram-games
    env: node
    rootDir: .
    buildCommand: cd server && npm install
    startCommand: node server/server.js
    envVars:
      - key: NODE_ENV
        value: production
```

**Ключевые моменты:**
- `rootDir: .` - корень проекта
- `startCommand: node server/server.js` - запуск из корня (важно!)
- Сервер автоматически найдет index.html в корне

### 2. **server/server.js** - Настройки сервера

**Раздача статических файлов:**
```javascript
const projectRoot = path.join(__dirname, '..');
app.use(express.static(projectRoot));
```

**Fallback для SPA:**
```javascript
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(projectRoot, 'index.html'));
});
```

### 3. **config.js** - Автоматическое определение URL

```javascript
if (window.location.hostname === 'localhost') {
    window.GAME_SERVER_URL = 'http://localhost:3000';
} else {
    window.GAME_SERVER_URL = window.location.origin; // Для Render
}
```

## 🚀 Шаги для деплоя на Render

### Вариант A: Через веб-интерфейс Render

1. **Зайдите на Render**
   - Перейдите на https://render.com
   - Войдите в свой аккаунт

2. **Создайте новый Web Service**
   - Нажмите "New" → "Web Service"
   - Подключите ваш GitHub/GitLab репозиторий
   - Или используйте "Deploy from Git URL"

3. **Настройки сервиса**
   - **Name:** `telegram-games` (или любое имя)
   - **Environment:** `Node`
   - **Branch:** `main` (или ваша основная ветка)
   - **Root Directory:** `.` (оставьте пустым)
   - **Build Command:** `cd server && npm install`
   - **Start Command:** `node server/server.js`

4. **Environment Variables**
   ```
   NODE_ENV=production
   ```
   
   *Опционально (если используете MongoDB):*
   ```
   MONGODB_URI=mongodb+srv://...
   ```

5. **Нажмите "Create Web Service"**

### Вариант B: Через Blueprint (render.yaml)

1. **Создайте Blueprint на Render**
   - Перейдите в "Blueprints"
   - Нажмите "New Blueprint Instance"
   - Подключите репозиторий с `render.yaml`

2. **Render автоматически:**
   - Прочитает конфигурацию из `render.yaml`
   - Создаст сервис с нужными настройками
   - Запустит деплой

### Вариант C: Через Git (автодеплой)

1. **Подключите репозиторий к Render**
   - В настройках сервиса включите "Auto-Deploy"
   - При каждом push в main ветку будет автоматический деплой

2. **Запушьте изменения:**
   ```bash
   git add .
   git commit -m "Configure Render deployment"
   git push origin main
   ```

## 🧪 Проверка после деплоя

### 1. Проверка главной страницы
```bash
curl https://your-app.onrender.com
```

Должен вернуть HTML содержимое index.html.

### 2. Проверка API
```bash
# Получить баланс пользователя
curl https://your-app.onrender.com/api/balance/123456789

# Проверить реферальную систему
curl https://your-app.onrender.com/api/referral/123456789
```

### 3. Проверка WebSocket
Откройте консоль браузера на вашем сайте:
```javascript
const socket = io(window.location.origin);
socket.on('connect', () => console.log('✅ WebSocket connected'));
```

### 4. Проверка логов
В Render Dashboard:
- Перейдите в ваш сервис
- Откройте вкладку "Logs"
- Проверьте что видите:
```
🚀 Сервер запущен на порту 10000
📁 Статические файлы раздаются из: /opt/render/project/src
✅ Found index.html at: /opt/render/project/src/index.html
```

## 🔧 Локальное тестирование

Перед деплоем протестируйте локально:

```bash
# Запуск из корня проекта (симуляция Render)
cd C:\Users\dev_fenomen\Desktop\bot
node server/server.js
```

Проверьте:
1. http://localhost:3000 - открывается сайт
2. http://localhost:3000/api/balance/123 - работает API
3. В логах: `✅ Found index.html at: ...`

## 📊 Структура URL после деплоя

```
https://your-app.onrender.com/
├── /                          → index.html (главная страница)
├── /config.js                 → статические файлы
├── /balance-api.js            → статические файлы
├── /main/                     → статические файлы
├── /site/                     → статические файлы
└── /api/
    ├── /balance/:id           → API
    ├── /referral/:id          → API
    ├── /transactions/:id      → API
    └── /telegram-user/:id     → API
```

## 🔄 Обновление URL в боте

После деплоя обновите `SERVER_API_URL` в боте:

### Локально (для разработки)
```bash
$env:SERVER_URL="http://localhost:3000"
python autoshop/main.py
```

### Продакшен (после деплоя на Render)
```bash
$env:SERVER_URL="https://your-app.onrender.com"
python autoshop/main.py
```

Или измените в `autoshop/tgbot/data/config.py`:
```python
SERVER_API_URL = os.getenv('SERVER_URL', 'https://your-app.onrender.com')
```

## 🐛 Устранение проблем

### Проблема: 404 на главной странице

**Причина:** Сервер не находит index.html

**Решение:**
1. Проверьте логи Render - должно быть `✅ Found index.html`
2. Убедитесь что `startCommand: node server/server.js` (не `cd server && node server.js`)
3. Проверьте что index.html находится в корне репозитория

### Проблема: API endpoints возвращают HTML

**Причина:** Fallback маршрут перехватывает API запросы

**Решение:**
- Проверьте что fallback `app.get('*')` идет **после** всех API маршрутов
- Убедитесь что API маршруты начинаются с `/api/`

### Проблема: CSS/JS файлы не загружаются

**Причина:** Неправильные пути в HTML

**Решение:**
1. Используйте относительные пути в index.html: `<script src="./config.js">`
2. Или абсолютные: `<script src="/config.js">`
3. Не используйте: `<script src="config.js">` (без точки)

### Проблема: WebSocket не работает

**Причина:** CORS или неправильный URL

**Решение:**
1. Проверьте что в CORS настройках разрешен ваш домен Render
2. В клиенте используйте: `io(window.location.origin)`
3. Проверьте что Render поддерживает WebSocket (должен по умолчанию)

### Проблема: Сервер "спит" после 15 минут

**Причина:** Render Free tier переводит сервис в спящий режим

**Решение:**
1. Апгрейдите на Render Paid план
2. Или используйте ping сервис (UptimeRobot) для периодических запросов
3. Первый запрос после "сна" займет 30-60 секунд

## 📝 Переменные окружения

### Обязательные:
```
NODE_ENV=production
```

### Опциональные:
```
MONGODB_URI=mongodb+srv://...  # Если используете MongoDB
PORT=3000                       # Render автоматически установит
```

## 🎯 Следующие шаги

После успешного деплоя:

1. ✅ Проверьте все функции сайта
2. ✅ Протестируйте API endpoints
3. ✅ Обновите URL в боте
4. ✅ Протестируйте реферальную систему
5. ✅ Настройте custom domain (опционально)
6. ✅ Настройте мониторинг (UptimeRobot, Sentry)

## 🔗 Полезные ссылки

- Render Dashboard: https://dashboard.render.com
- Render Docs: https://render.com/docs
- Blueprint Spec: https://render.com/docs/blueprint-spec

## ✨ Готово!

Ваш проект теперь настроен для деплоя на Render с единым сервисом для сайта и API!
