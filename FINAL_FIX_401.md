# ✅ ИСПРАВЛЕНО: 401 Unauthorized

## 🎉 ЧТО СДЕЛАНО

### 1. Добавлен заголовок X-API-Secret в Python боте

**Файл:** `bot/autoshop/tgbot/routers/main_start.py`

```python
# Теперь бот отправляет:
async with session.post(
    f"{SERVER_API_URL}/api/referral/register",
    json={
        "userId": user_id,
        "referrerId": referrer_id
    },
    headers={
        'X-API-Secret': PARTNER_API_SECRET  ← ДОБАВЛЕНО!
    },
    timeout=aiohttp.ClientTimeout(total=10)
) as resp:
```

### 2. Добавлена переменная PARTNER_API_SECRET в config

**Файл:** `bot/autoshop/tgbot/data/config.py`

```python
PARTNER_API_SECRET = os.getenv('PARTNER_API_SECRET', 'default-secret-key')
print(f"🔑 PARTNER_API_SECRET установлен: {'✅' if PARTNER_API_SECRET != 'default-secret-key' else '⚠️ ИСПОЛЬЗУЕТСЯ ДЕФОЛТНЫЙ КЛЮЧ!'}")
```

### 3. Обновлена статистика на фронтенде

**Файл:** `site/js/referral.js`

- Добавлен метод `updateDetailValue(selector, value)`
- Обновляются элементы: `.visits-value`, `.clients-value`, `.deposits-value`, `.income-value`
- Статистика обновляется автоматически при загрузке

---

## 🚀 ЧТО НУЖНО СДЕЛАТЬ

### ⚠️ КРИТИЧЕСКИ ВАЖНО!

Установи `PARTNER_API_SECRET` **ОДИНАКОВЫЙ** на всех сервисах!

---

### 1. Установи имя бота (БЕЗ @)

**Файл:** `site/js/config.js`

```javascript
// Замени YOUR_BOT_USERNAME на имя твоего бота:
window.BOT_USERNAME = 'твой_бот';  // Например: duogames_bot
```

**Как узнать:**
- Открой @BotFather в Telegram
- `/mybots` → выбери бота
- Имя будет отображено (например: `@duogames_bot`)
- Укажи **БЕЗ @**: `duogames_bot`

---

### 2. Настрой PARTNER_API_SECRET в Python боте

#### Вариант A: Через .env файл (локально)

Создай `bot/autoshop/.env`:

```env
SERVER_URL=https://duo-partner.onrender.com
PARTNER_API_SECRET=твой-секретный-ключ-abc123xyz
```

#### Вариант B: Через Environment Variables (Render)

1. Открой Python бот на Render
2. Settings → Environment Variables
3. Добавь:
   ```
   Key: PARTNER_API_SECRET
   Value: твой-секретный-ключ-abc123xyz
   ```

---

### 3. Проверь PARTNER_API_SECRET на duo-partner

1. Открой **duo-partner** на Render
2. Settings → Environment Variables
3. Найди `PARTNER_API_SECRET`
4. **Должен быть ТОЧНО ТАКОЙ ЖЕ как в боте!**

**Пример:**
```
БОТ:  PARTNER_API_SECRET=abc123xyz
САЙТ: PARTNER_API_SECRET=abc123xyz  ← ОДИНАКОВЫЙ!
```

---

### 4. Передеплой

#### A. Сервер партнёров

1. https://dashboard.render.com/
2. Найди **duo-partner**
3. Manual Deploy → **Clear build cache & deploy**
4. Подожди 2-3 минуты

#### B. Python бот (если на Render)

1. Найди Python бот сервис
2. Убедись что добавлена переменная `PARTNER_API_SECRET`
3. Manual Deploy → **Clear build cache & deploy**
4. Подожди 2-3 минуты

---

## 🧪 ПРОВЕРКА

### 1. Проверь логи Python бота

**Должно быть:**
```
📡 Используется SERVER_URL: https://duo-partner.onrender.com
🔑 PARTNER_API_SECRET установлен: ✅
```

**НЕ должно быть:**
```
🔑 PARTNER_API_SECRET установлен: ⚠️ ИСПОЛЬЗУЕТСЯ ДЕФОЛТНЫЙ КЛЮЧ!
```

Если видишь warning → ключ не установлен!

---

### 2. Тест реферальной ссылки

1. Зарегистрируйся на https://duo-partner.onrender.com
2. Войди в панель
3. Получи реферальную ссылку (должна быть вида: `https://t.me/твой_бот?start=ref_CODE`)
4. Открой в Telegram боте
5. Нажми /start

**Логи Python бота должны показать:**
```
🔍 Referral link detected: full_code=ref_1_ABC123, extracted_user_id=1, new_user=YOUR_ID
📡 Server response status: 200  ← БЫЛО: 401
📡 Server response text: {"success":true,...}  ← БЫЛО: Unauthorized
✅ Referral registered: YOUR_ID -> 1
```

**Логи duo-partner должны показать:**
```
✅ Webhook authenticated  ← НОВОЕ!
📥 Referral registration request: userId=YOUR_ID, referrerId=1
✅ Partner found: id=1, telegram=PARTNER_TG_ID
✅ Referral registered: YOUR_ID → partner 1, clicks=1
```

---

### 3. Проверь статистику на сайте

Открой панель партнёра:
- **Переходы:** должно быть +1
- **Клиенты (первые депозиты):** 0 (пока не было депозита)
- **Кол-во пополнений:** 0

Статистика должна обновиться!

---

## ⚠️ ЕСЛИ ВСЁ ЕЩЁ 401

### Проверь Environment Variables

**На duo-partner:**
```bash
# Открой Shell в Render:
echo $PARTNER_API_SECRET
# Должно вывести твой ключ
```

**В Python боте:**
```python
# Добавь в main.py временно:
from tgbot.data.config import PARTNER_API_SECRET
print(f"DEBUG: PARTNER_API_SECRET = {PARTNER_API_SECRET}")
```

### Убедись что значения ОДИНАКОВЫЕ

```
БОТ:  abc123xyz
САЙТ: abc123xyz  ✅

БОТ:  abc123xyz
САЙТ: ABC123XYZ  ❌ (разный регистр!)

БОТ:  abc123xyz
САЙТ: abc123xyz   ❌ (лишний пробел!)
```

Должно быть **ТОЧНОЕ СОВПАДЕНИЕ**!

---

## 📊 ИТОГОВАЯ СХЕМА

```
┌─────────────────────────────────────────────────┐
│  PYTHON БОТ                                     │
│  ├─ SERVER_URL=https://duo-partner.onrender.com │
│  └─ PARTNER_API_SECRET=abc123xyz                │
└─────────────────────────────────────────────────┘
                    ↓ POST /api/referral/register
                    ↓ Headers: X-API-Secret: abc123xyz
┌─────────────────────────────────────────────────┐
│  DUO-PARTNER                                    │
│  └─ PARTNER_API_SECRET=abc123xyz  ← ТАКОЙ ЖЕ!   │
│     ├─ Проверяет X-API-Secret                   │
│     ├─ Если совпадает → 200 OK ✅                │
│     └─ Если не совпадает → 401 ❌                │
└─────────────────────────────────────────────────┘
```

---

## 📝 CHECKLIST

Перед тестированием:

- [ ] Установлено имя бота в `site/js/config.js`
- [ ] Установлен `PARTNER_API_SECRET` в Python боте
- [ ] Установлен `PARTNER_API_SECRET` на duo-partner
- [ ] Значения **ОДИНАКОВЫЕ** (копировал-вставлял)
- [ ] Передеплоен duo-partner
- [ ] Передеплоен/перезапущен Python бот
- [ ] Проверены логи бота (✅ ключ установлен)
- [ ] Выполнен тест `/start ref_CODE`
- [ ] Получен статус 200 (не 401)
- [ ] Статистика обновилась

---

## 🎉 РЕЗУЛЬТАТ

После всех настроек:

✅ Бот отправляет X-API-Secret заголовок  
✅ Сервер проверяет и принимает  
✅ Статус 200 вместо 401  
✅ Реферал регистрируется  
✅ Статистика обновляется в панели  
✅ detail-value элементы показывают актуальные данные  

**ПРОБЛЕМА РЕШЕНА!** 🚀

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ ФАЙЛЫ

- **ENV_SETUP.md** - подробная инструкция по настройке переменных окружения
- **REFERRAL_SYSTEM_FIXED.md** - полная документация реферальной системы
- **QUICK_START.md** - быстрый старт (3 шага)
