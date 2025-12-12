# 🚀 Проект готов к деплою на Render!

## ✅ Что было сделано

### 1. Настроена раздача статических файлов + API
- Один сервис на Render раздает и сайт (index.html) и API (/api/*)
- Автоматическое определение корневой директории проекта
- Fallback маршрут для SPA

### 2. Исправлена реферальная система
- Поддержка двух форматов кодов: `ref_3_MJ3FLZNWEE3U9` и `ref_1OKI95B`
- Улучшенная обработка ошибок с детальным логированием
- Использование централизованной конфигурации SERVER_API_URL

### 3. Создана документация
- `QUICK_START.md` - быстрый старт для деплоя
- `DEPLOY_RENDER.md` - полная инструкция
- `CHANGES_SUMMARY.md` - все изменения
- `check-config.js` - скрипт проверки конфигурации

## 🎯 Следующие шаги

### Шаг 1: Закоммитьте изменения
```bash
git add .
git commit -m "Configure Render deployment: static files + API + referral fixes"
git push origin main
```

### Шаг 2: Деплой на Render

**Автоматический (через Blueprint):**
1. Зайдите на https://render.com
2. Нажмите "New" → "Blueprint"
3. Подключите репозиторий
4. Render найдет `render.yaml` и создаст сервис автоматически

**Ручной:**
1. Нажмите "New" → "Web Service"
2. Подключите репозиторий
3. Настройки:
   - **Build Command:** `cd server && npm install`
   - **Start Command:** `node server/server.js`
   - **Environment:** `Node`
4. Нажмите "Create Web Service"

### Шаг 3: Получите URL
После деплоя вы получите URL типа:
```
https://telegram-games-xxxx.onrender.com
```

### Шаг 4: Обновите бота
Измените в `autoshop/tgbot/data/config.py`:
```python
SERVER_API_URL = os.getenv('SERVER_URL', 'https://telegram-games-xxxx.onrender.com')
```

Или используйте переменную окружения:
```powershell
$env:SERVER_URL="https://telegram-games-xxxx.onrender.com"
python autoshop/main.py
```

### Шаг 5: Проверьте работу
```bash
# Сайт
https://telegram-games-xxxx.onrender.com

# API
https://telegram-games-xxxx.onrender.com/api/balance/123456789

# Реферальная система
https://telegram-games-xxxx.onrender.com/api/referral/123456789
```

## 📖 Документация

- **QUICK_START.md** - Быстрая шпаргалка (начните отсюда!)
- **DEPLOY_RENDER.md** - Полная инструкция с troubleshooting
- **CHANGES_SUMMARY.md** - Детальное описание всех изменений
- **SETUP_REFERRAL.md** - Настройка реферальной системы
- **TEST_REFERRAL.md** - Тестирование рефералки

## 🧪 Проверка конфигурации

Запустите перед деплоем:
```bash
node check-config.js
```

Должно вывести: `✅ Все проверки пройдены!`

## 🔧 Локальное тестирование

```bash
# Запуск сервера (из корня проекта)
node server/server.js
```

Откройте:
- http://localhost:3000 - сайт
- http://localhost:3000/api/balance/123 - API

## 📊 Структура деплоя

```
Render Web Service
├── Статика (из корня)
│   ├── index.html
│   ├── config.js
│   ├── balance-api.js
│   └── ...
└── API (server/server.js)
    ├── /api/balance/:id
    ├── /api/referral/:id
    ├── /api/transactions/:id
    └── WebSocket
```

## ❓ Часто задаваемые вопросы

**Q: Нужно ли два сервиса на Render?**
A: Нет! Один сервис раздает и сайт и API.

**Q: Как изменить URL сервера?**
A: Через переменную окружения `SERVER_URL` или в `config.py`.

**Q: Работает ли WebSocket?**
A: Да! Socket.IO автоматически работает на том же порту.

**Q: Что делать если сайт не открывается?**
A: Проверьте логи Render - должно быть `✅ Found index.html`.

**Q: Сервер не отвечает?**
A: Render Free tier "засыпает" - первый запрос займет 30-60 секунд.

## ✨ Готово!

Ваш проект полностью настроен и готов к деплою на Render! 🎉

Начните с **QUICK_START.md** для быстрого старта.
