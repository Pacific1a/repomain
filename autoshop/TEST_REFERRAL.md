# 🧪 Тестирование исправленной реферальной системы

## ✅ Что было исправлено

### Проблема
Бот получал код `ref_3_MJ3FLZNWEE3U9` и пытался декодировать его как base36, что приводило к:
- Неправильному ID: `218071617480800330684008689`
- Ошибке на сервере: `{'error': 'Server error'}`

### Решение
Теперь бот правильно парсит оба формата:
1. **Формат сайта партнеров**: `ref_3_MJ3FLZNWEE3U9` → извлекает userId `3`
2. **Формат base36**: `ref_1OKI95B` → декодирует в userId `1889923046`

## 🚀 Пошаговое тестирование

### Шаг 1: Запустите сервер

**Опция A: Локальный сервер**
```bash
cd C:\Users\dev_fenomen\Desktop\bot\server
node server.js
```

**Опция B: Используйте Render**
Убедитесь что сервер запущен: https://telegram-games-plkj.onrender.com

### Шаг 2: Запустите бота

**Для локального тестирования:**
```powershell
cd C:\Users\dev_fenomen\Desktop\bot\autoshop
$env:SERVER_URL="http://localhost:3000"
python main.py
```

**Для Render:**
```bash
cd C:\Users\dev_fenomen\Desktop\bot\autoshop
python main.py
```

### Шаг 3: Создайте реферальную ссылку

#### Вариант 1: Через сайт партнеров
1. Откройте сайт партнеров
2. Войдите с вашим Telegram ID
3. Перейдите в "Реф.программа"
4. Скопируйте ссылку (формат: `https://t.me/bot?start=ref_3_MJ3FLZNWEE3U9`)

#### Вариант 2: Создайте вручную (base36)
```python
# Python консоль
user_id = 1889923046  # Ваш Telegram ID
code = format(user_id, 'x')  # Конвертируем в base36
print(f"https://t.me/your_bot?start=ref_{code}")
```

Или используйте JavaScript:
```javascript
const userId = 1889923046;
const code = userId.toString(36).toUpperCase();
console.log(`https://t.me/your_bot?start=ref_${code}`);
```

### Шаг 4: Проверьте переход по ссылке

1. Откройте созданную реферальную ссылку в Telegram **с другого аккаунта**
2. Нажмите "START" в боте

### Шаг 5: Проверьте логи

#### ✅ Ожидаемые логи для формата сайта партнеров:
```
🔍 Referral link detected: full_code=ref_3_MJ3FLZNWEE3U9, extracted_user_id=3, new_user=123456789
📡 Server response status: 200
📡 Server response text: {"success":true,"referrerId":"3"}
✅ Referral registered: 123456789 -> 3
```

#### ✅ Ожидаемые логи для base36 формата:
```
🔍 Referral link detected: code=ref_1OKI95B, decoded_user_id=1889923046, new_user=123456789
📡 Server response status: 200
📡 Server response text: {"success":true,"referrerId":"1889923046"}
✅ Referral registered: 123456789 -> 1889923046
```

#### ❌ Если ошибка:
```
❌ Network error registering referral: ClientConnectorError: ...
```
→ Проверьте что сервер запущен и доступен

```
⚠️ Unexpected response: status=500, result={'error': 'Server error'}
```
→ Проверьте логи сервера на ошибки

```
❌ Timeout registering referral - server did not respond in 10 seconds
```
→ Render может "спать" - подождите 30-60 секунд

## 🔍 Проверка работы через API

### Тест 1: Проверка сервера
```bash
curl https://telegram-games-plkj.onrender.com/api/referral/1889923046
```

Ожидаемый ответ:
```json
{
  "referralCode": "1889923046",
  "referralBalance": 0,
  "referrals": [],
  "totalEarnings": 0
}
```

### Тест 2: Регистрация реферала (формат сайта)
```bash
curl -X POST https://telegram-games-plkj.onrender.com/api/referral/register \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"999999999\",\"referrerId\":\"3\"}"
```

### Тест 3: Регистрация реферала (base36)
```bash
curl -X POST https://telegram-games-plkj.onrender.com/api/referral/register \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"888888888\",\"referrerId\":\"1889923046\"}"
```

Ожидаемый ответ:
```json
{"success":true,"referrerId":"3"}
```

## 📊 Проверка базы данных

### Локально (JSON)
```bash
cat C:\Users\dev_fenomen\Desktop\bot\server\data\referrals.json
```

### На сервере (если MongoDB)
Проверьте логи сервера на наличие записей о регистрации:
```
✅ JSON: User 999999999 registered by 3
```

## 🎯 Следующие шаги

После успешного тестирования:

1. ✅ Реферальная система работает корректно
2. 🎮 Протестируйте начисление процентов при выигрыше
3. 💰 Проверьте отображение статистики на сайте партнеров
4. 📱 Протестируйте на реальных пользователях

## 📝 Часто задаваемые вопросы

### Q: Код `ref_3_MJ3FLZNWEE3U9` всё ещё выдает ошибку?
A: После обновления кода бот должен корректно извлекать userId `3`. Перезапустите бота!

### Q: Как узнать свой реферальный код?
A: Ваш код - это ваш Telegram ID. Узнать можно через бота или сайт партнеров.

### Q: Могу ли я пригласить сам себя?
A: Нет, бот проверяет это и не позволит зарегистрировать реферала, если referrerId == userId.

### Q: Что делать если сервер не отвечает?
A: На Render free tier сервер "засыпает" после 15 минут неактивности. Первый запрос разбудит его (подождите 30-60 секунд).

## 🐛 Отладка

### Включить детальные логи в боте:
Откройте `autoshop/tgbot/routers/main_start.py` и добавьте больше `print()` после строки 127.

### Просмотр логов сервера:
```bash
cd C:\Users\dev_fenomen\Desktop\bot\server
node server.js 2>&1 | tee server.log
```

### Проверка сетевого соединения:
```bash
ping telegram-games-plkj.onrender.com
```

## ✨ Готово!

Реферальная система теперь работает с обоими форматами кодов и корректно извлекает userId пригласителя!
