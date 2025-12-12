# 🔧 Настройка и Тестирование Реферальной Системы

## ✅ Исправленные проблемы

1. **Улучшена обработка ошибок** - теперь бот показывает детальную информацию об ошибках:
   - HTTP статус код
   - Текст ответа сервера
   - Тип ошибки (сетевая ошибка, таймаут, ошибка парсинга JSON)

2. **Исправлена конфигурация SERVER_URL** - теперь бот использует настроенный URL из конфигурации вместо жестко заданного

## 🚀 Варианты запуска

### Вариант 1: Локальный сервер (рекомендуется для разработки)

1. **Запустите Node.js сервер:**
   ```bash
   cd C:\Users\dev_fenomen\Desktop\bot\server
   node server.js
   ```
   
   Вы должны увидеть:
   ```
   🚀 Сервер запущен на порту 3000
   ```

2. **Настройте бота на локальный сервер:**
   
   **Windows (PowerShell):**
   ```powershell
   $env:SERVER_URL="http://localhost:3000"
   python main.py
   ```
   
   **Windows (CMD):**
   ```cmd
   set SERVER_URL=http://localhost:3000
   python main.py
   ```

3. **Проверьте в логах:**
   ```
   📡 Используется SERVER_URL: http://localhost:3000
   ```

### Вариант 2: Удаленный сервер (Render)

Если ваш сервер уже развернут на Render и работает:

1. **Просто запустите бота:**
   ```bash
   cd C:\Users\dev_fenomen\Desktop\bot\autoshop
   python main.py
   ```

2. **Бот автоматически будет использовать:**
   ```
   📡 Используется SERVER_URL: https://telegram-games-plkj.onrender.com
   ```

⚠️ **Важно:** Убедитесь, что сервер на Render запущен и отвечает на запросы!

## 🧪 Тестирование реферальной системы

### 1. Создайте реферальную ссылку

Реферальная ссылка может иметь два формата:

**Формат 1: Сайт партнеров** (генерируется автоматически)
```
https://t.me/your_bot?start=ref_3_MJ3FLZNWEE3U9
```
Где `3_MJ3FLZNWEE3U9` = `${userId}_${timestamp}${random}`
- `3` - Telegram ID пригласителя
- `MJ3FLZNWEE3U9` - уникальный код из timestamp и случайного числа

**Формат 2: Простой base36** (для упрощенных интеграций)
```
https://t.me/your_bot?start=ref_1OKI95B
```
Где `1OKI95B` - это Telegram ID пригласителя в формате base36

Бот автоматически определяет и обрабатывает оба формата.

### 2. Проверьте переход по ссылке

Откройте ссылку другим пользователем и проверьте логи бота:

**Успешная регистрация (формат сайта партнеров):**
```
🔍 Referral link detected: full_code=ref_3_MJ3FLZNWEE3U9, extracted_user_id=3, new_user=123456789
📡 Server response status: 200
📡 Server response text: {"success":true,"referrerId":"3"}
✅ Referral registered: 123456789 -> 3
```

**Успешная регистрация (формат base36):**
```
🔍 Referral link detected: code=1OKI95B, decoded_user_id=1889923046, new_user=123456789
📡 Server response status: 200
📡 Server response text: {"success":true,"referrerId":"1889923046"}
✅ Referral registered: 123456789 -> 1889923046
```

**Ошибка сети:**
```
❌ Network error registering referral: ClientConnectorError: Cannot connect to host localhost:3000
```

**Таймаут:**
```
❌ Timeout registering referral - server did not respond in 10 seconds
```

**Ошибка парсинга JSON:**
```
❌ Error parsing JSON response: ...
Response was: <HTML_ERROR_PAGE>
```

## 🔍 Проверка работы сервера

### Проверка локально:

```bash
# Проверка что сервер запущен
curl http://localhost:3000/api/referral/123456789

# Тест регистрации реферала
curl -X POST http://localhost:3000/api/referral/register \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"123456789\",\"referrerId\":\"1889923046\"}"
```

### Проверка на Render:

```bash
# Проверка что сервер доступен
curl https://telegram-games-plkj.onrender.com/api/referral/123456789

# Тест регистрации
curl -X POST https://telegram-games-plkj.onrender.com/api/referral/register \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"123456789\",\"referrerId\":\"1889923046\"}"
```

Ожидаемый ответ:
```json
{"success":true,"referrerId":"1889923046"}
```

## 📊 Логи

Теперь все операции с реферальной системой логируются:

**В боте:**
- `C:\Users\dev_fenomen\Desktop\bot\autoshop\tgbot\data\logs.log`

**На сервере:**
- Консоль где запущен `node server.js`

## ❓ Устранение проблем

### Ошибка: Cannot connect to host

**Проблема:** Сервер не запущен или недоступен

**Решение:**
1. Убедитесь что `node server.js` запущен в другом терминале
2. Проверьте что порт 3000 не занят другим процессом
3. Проверьте что в конфигурации указан правильный URL

### Ошибка: Timeout

**Проблема:** Сервер не отвечает в течение 10 секунд

**Решение:**
1. Render free tier может "спать" - первый запрос разбудит его (подождите 30-60 секунд)
2. Проверьте интернет соединение
3. Убедитесь что сервер не упал (проверьте логи)

### Ошибка: Error parsing JSON

**Проблема:** Сервер вернул не JSON (например HTML страницу ошибки)

**Решение:**
1. Проверьте URL - возможно он неправильный
2. Проверьте логи сервера на ошибки
3. Попробуйте открыть URL в браузере и посмотрите что возвращается

### Already referred

**Не ошибка!** Это значит что пользователь уже был зарегистрирован по реферальной ссылке ранее.

## 🎯 Следующие шаги

После успешного тестирования локально:

1. **Разверните сервер на Render** (если еще не развернут)
2. **Обновите настройки** - уберите `SERVER_URL` из переменных окружения для продакшена
3. **Протестируйте** реферальную систему в реальных условиях
4. **Мониторьте логи** на наличие ошибок

## 📝 Дополнительная информация

Полная документация по интеграции:
- `C:\Users\dev_fenomen\Desktop\bot\REFERRAL_INTEGRATION.md`

Файлы реферальной системы:
- Bot: `autoshop/tgbot/routers/main_start.py`
- Server: `server/server.js` (строка 2135)
- Database: `server/referral-db.js`
- API: `server/referral-api.js`
