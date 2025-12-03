# 🚀 Деплой на Render

## Проблема: 404 ошибка на /api/referral/register

Сервер на Render не видит новые эндпоинты, потому что **код не был задеплоен**.

## Решение:

### Вариант 1: Автоматический деплой через Git

```bash
cd C:\Users\dev_fenomen\Desktop\bot
git add .
git commit -m "Add referral API endpoints"
git push origin main
```

Render автоматически перезапустит сервер с новым кодом.

### Вариант 2: Ручной рестарт на Render

1. Откройте https://dashboard.render.com/
2. Найдите ваш сервис `bot-websocket-server`
3. Нажмите **"Manual Deploy"** → **"Deploy latest commit"**
4. Дождитесь завершения деплоя (3-5 минут)

### Вариант 3: Проверка через Render Shell

1. Откройте https://dashboard.render.com/
2. Выберите ваш сервис
3. Перейдите в **Shell** (консоль)
4. Выполните:
```bash
cat server.js | grep "app.post('/api/referral"
ls -la data/
```

Это покажет, есть ли код на сервере.

## Проверка после деплоя:

### Проверьте эндпоинт:

```bash
curl -X POST https://bot-websocket-server.onrender.com/api/referral/register \
  -H "Content-Type: application/json" \
  -d '{"userId":"123","referrerId":"456"}'
```

**Ожидаемый ответ:**
```json
{"success":true,"referrerId":"456"}
```

### Проверьте логи:

В Render Dashboard → Logs должно быть:
```
✅ Referral API endpoints loaded
🚀 Сервер запущен на порту 3000
```

## Структура файлов на сервере:

```
/opt/render/project/src/
├── server.js              (с referral API на строках 2112-2327)
└── data/
    ├── referrals.json     (должен быть создан автоматически)
    ├── balances.json
    └── transactions.json
```

## Если проблема остается:

### 1. Проверьте порядок роутов

Статические файлы должны быть ПОСЛЕ API роутов:

```javascript
// ✅ ПРАВИЛЬНО:
app.post('/api/referral/register', ...);
app.use(express.static(staticPath));

// ❌ НЕПРАВИЛЬНО:
app.use(express.static(staticPath));
app.post('/api/referral/register', ...);
```

### 2. Проверьте переменную окружения

В Render Dashboard → Environment:
```
PORT=3000
```

### 3. Проверьте логи ошибок

```bash
# В Render Shell
tail -f /var/log/render/*.log
```

## Текущая ситуация:

**Ошибка:**
```
❌ Error registering referral: 404, message='Attempt to decode JSON with unexpected mimetype: text/plain; charset=utf-8'
```

**Причина:** Сервер возвращает HTML страницу (404) вместо JSON.

**Решение:** Задеплоить новый код на Render через git push.

## Быстрая проверка локально:

```bash
cd C:\Users\dev_fenomen\Desktop\bot\server
node server.js
```

В другом окне:
```bash
curl -X POST http://localhost:3000/api/referral/register \
  -H "Content-Type: application/json" \
  -d '{"userId":"123","referrerId":"456"}'
```

Если работает локально, но не работает на Render → нужен деплой.
