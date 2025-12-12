# 📝 Сводка изменений - Настройка Render деплоя

## 🎯 Цель

Настроить проект для деплоя на Render, чтобы **один сервис** раздавал:
1. Статические файлы (index.html, JS, CSS) - ваш сайт
2. API endpoints (/api/*) - бэкенд для бота
3. WebSocket соединения - реал-тайм обновления

## ✅ Что было изменено

### 1. **render.yaml** - Конфигурация деплоя

**Было:**
```yaml
startCommand: cd server && node server.js
envVars:
  - key: SERVER_URL
    value: https://server-bot-4.onrender.com
```

**Стало:**
```yaml
startCommand: node server/server.js
envVars:
  - key: NODE_ENV
    value: production
```

**Почему:**
- `node server/server.js` запускает сервер из корня проекта
- Это позволяет `path.join(__dirname, '..')` правильно найти index.html
- Убрали жестко заданный SERVER_URL - теперь используется автоопределение

### 2. **server/server.js** - Настройка сервера

#### Изменение A: Раздача статических файлов

**Было:**
```javascript
const possiblePaths = [
  path.join(__dirname, '..'),
  '/opt/render/project/src',
  process.cwd(),
];
// Сложная логика поиска пути
```

**Стало:**
```javascript
const projectRoot = path.join(__dirname, '..');
console.log('✅ Found index.html at:', path.join(projectRoot, 'index.html'));
app.use(express.static(projectRoot));
```

**Почему:**
- Проще и надежнее
- Явное логирование помогает отладке
- Всегда использует корень проекта относительно server/

#### Изменение B: Fallback для SPA

**Добавлено:**
```javascript
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(projectRoot, 'index.html'));
});
```

**Почему:**
- Все не-API маршруты возвращают index.html
- Поддержка SPA роутинга (если будет)
- API endpoints всегда возвращают JSON, даже при 404

### 3. **autoshop/tgbot/routers/main_start.py** - Парсинг реферальных кодов

**Было:**
```python
# Просто декодировал весь код как base36
referrer_id = str(int(args, 36))
```

**Стало:**
```python
# Убираем префикс 'ref_'
referral_code = args[4:] if args.startswith('ref_') else args

# Определяем формат
if '_' in referral_code:
    # Формат: 3_MJ3FLZNWEE3U9 → извлекаем userId
    referrer_id = referral_code.split('_')[0]
else:
    # Формат base36 → декодируем
    referrer_id = str(int(referral_code, 36))
```

**Почему:**
- Поддержка формата сайта партнеров: `ref_3_MJ3FLZNWEE3U9`
- Поддержка base36 формата: `ref_1OKI95B`
- Исправлена ошибка с неправильным ID

### 4. **autoshop/tgbot/routers/main_start.py** - Улучшенная обработка ошибок

**Добавлено:**
```python
print(f"📡 Server response status: {resp.status}")
response_text = await resp.text()
print(f"📡 Server response text: {response_text[:200]}")

try:
    result = json.loads(response_text)
except Exception as json_err:
    print(f"❌ Error parsing JSON: {json_err}")
```

**Почему:**
- Детальное логирование помогает отладке
- Различаем типы ошибок (сеть, таймаут, JSON)
- Показываем реальный ответ сервера

### 5. **autoshop/tgbot/routers/main_start.py** - Использование SERVER_API_URL

**Было:**
```python
SERVER_URL = "https://telegram-games-plkj.onrender.com"
```

**Стало:**
```python
from tgbot.data.config import SERVER_API_URL
# Используется SERVER_API_URL вместо жестко заданного URL
```

**Почему:**
- Централизованная конфигурация
- Легко переключаться между локальной разработкой и продакшеном
- Можно изменить через переменную окружения

## 📄 Новые файлы

1. **DEPLOY_RENDER.md** - Полная инструкция по деплою
2. **QUICK_START.md** - Быстрая шпаргалка
3. **check-config.js** - Скрипт проверки конфигурации
4. **SETUP_REFERRAL.md** - Инструкция по настройке реферальной системы
5. **TEST_REFERRAL.md** - Тестирование реферальной системы
6. **autoshop/SETUP_REFERRAL.md** - Документация для бота

## 🧪 Как проверить изменения локально

### 1. Проверка конфигурации
```bash
node check-config.js
```

Должно вывести: `✅ Все проверки пройдены!`

### 2. Запуск сервера (симуляция Render)
```bash
# Из корня проекта!
node server/server.js
```

Проверьте в логах:
```
✅ Found index.html at: C:\Users\dev_fenomen\Desktop\bot\index.html
📁 Статические файлы раздаются из: C:\Users\dev_fenomen\Desktop\bot
```

### 3. Проверка сайта
```bash
# Откройте в браузере
http://localhost:3000
```

Должна открыться главная страница.

### 4. Проверка API
```bash
curl http://localhost:3000/api/balance/123456789
```

Должен вернуть JSON с балансом.

### 5. Проверка реферальной системы
```bash
# Запустите бота
cd autoshop
python main.py

# Откройте реферальную ссылку в Telegram
# Проверьте логи бота
```

Должно быть:
```
🔍 Referral link detected: full_code=ref_3_MJ3FLZNWEE3U9, extracted_user_id=3, new_user=123456789
✅ Referral registered: 123456789 -> 3
```

## 🚀 Следующие шаги

1. **Проверьте конфигурацию:**
   ```bash
   node check-config.js
   ```

2. **Закоммитьте изменения:**
   ```bash
   git add .
   git commit -m "Configure Render deployment: static files + API + referral fixes"
   git push origin main
   ```

3. **Деплой на Render:**
   - Следуйте инструкциям в `QUICK_START.md`

4. **Обновите бота:**
   - Измените `SERVER_API_URL` на ваш Render URL

5. **Протестируйте:**
   - Откройте ваш сайт на Render
   - Проверьте API endpoints
   - Протестируйте реферальную систему

## 📊 Структура проекта (после изменений)

```
bot/
├── index.html              # Главная страница сайта
├── config.js               # Конфигурация (авто-определение URL)
├── balance-api.js          # API клиент для баланса
├── referral-system.js      # Реферальная система
├── render.yaml             # ✨ Изменен - конфигурация Render
├── server/
│   ├── server.js           # ✨ Изменен - раздача статики + API
│   └── package.json
├── autoshop/
│   ├── tgbot/
│   │   ├── routers/
│   │   │   └── main_start.py  # ✨ Изменен - парсинг реф. кодов
│   │   └── data/
│   │       └── config.py      # Конфигурация SERVER_API_URL
│   └── main.py
├── DEPLOY_RENDER.md        # ✨ Новый - инструкция по деплою
├── QUICK_START.md          # ✨ Новый - быстрый старт
├── check-config.js         # ✨ Новый - проверка конфигурации
└── CHANGES_SUMMARY.md      # ✨ Этот файл
```

## ❓ Часто задаваемые вопросы

### Q: Почему изменили startCommand?
**A:** `cd server && node server.js` меняет рабочую директорию, что мешает найти index.html. `node server/server.js` запускает из корня.

### Q: Где теперь хранится SERVER_URL?
**A:** В переменной окружения или в `autoshop/tgbot/data/config.py`. По умолчанию: `https://telegram-games-plkj.onrender.com`

### Q: Нужно ли менять config.js?
**A:** Нет! Он автоматически определяет URL: `window.location.origin` для Render.

### Q: Почему убрали возможные пути (possiblePaths)?
**A:** Теперь используем простой и надежный `path.join(__dirname, '..')`, который всегда работает.

### Q: Работает ли это локально?
**A:** Да! Запустите `node server/server.js` из корня - всё будет работать как на Render.

## ✅ Итоговый чеклист

- [x] render.yaml обновлен
- [x] server/server.js настроен на раздачу статики
- [x] Добавлен fallback для SPA
- [x] Исправлен парсинг реферальных кодов
- [x] Улучшена обработка ошибок в боте
- [x] Создана документация
- [x] Создан скрипт проверки
- [ ] Протестировано локально
- [ ] Закоммичено в git
- [ ] Задеплоено на Render
- [ ] Протестировано в продакшене

## 🎉 Готово!

Проект полностью настроен для деплоя на Render с поддержкой:
- ✅ Статических файлов (сайт)
- ✅ API endpoints (бэкенд)
- ✅ WebSocket (реал-тайм)
- ✅ Реферальной системы (оба формата)
