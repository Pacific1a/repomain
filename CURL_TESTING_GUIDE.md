# 🧪 ТЕСТИРОВАНИЕ РЕФЕРАЛЬНОЙ СИСТЕМЫ С CURL

## 📋 СОДЕРЖАНИЕ

1. [Подготовка](#подготовка)
2. [Получение API Secret](#api-secret)
3. [Добавление переходов (кликов)](#клики)
4. [Добавление первого депозита](#первый-депозит)
5. [Добавление проигрыша (комиссии)](#проигрыш)
6. [Проверка статистики](#проверка)
7. [Быстрые тесты графика](#быстрые-тесты)
8. [Сброс статистики](#сброс)

---

## 🔧 ПОДГОТОВКА {#подготовка}

### **Подключись к серверу:**
```bash
ssh root@77.239.125.70
```

### **Переменные окружения:**
```bash
# ID партнёра (обычно 1)
PARTNER_ID=1

# ID реферала (Telegram ID пользователя)
REFERRAL_ID=1889923046

# Реферальный код партнёра
REFERRAL_CODE="1_MJIBVR2D5DA9M"
```

---

## 🔑 ПОЛУЧЕНИЕ API SECRET {#api-secret}

API реферальной системы защищён секретным ключом.

### **1. Найди секрет в .env:**
```bash
cd /var/www/duo
cat .env | grep PARTNER_API_SECRET
```

**Пример вывода:**
```
PARTNER_API_SECRET=abc123xyz456secretkey
```

### **2. Сохрани в переменную:**
```bash
API_SECRET="abc123xyz456secretkey"
```

**ВАЖНО:** Замени `abc123xyz456secretkey` на реальный ключ из .env!

---

## 👆 ДОБАВЛЕНИЕ КЛИКОВ (ПЕРЕХОДОВ) {#клики}

### **Endpoint:** `POST /api/referral/register`

**Что делает:** Регистрирует переход по реферальной ссылке

### **Команда:**
```bash
curl -X POST http://localhost:3000/api/referral/register \
  -H "Content-Type: application/json" \
  -H "x-api-secret: $API_SECRET" \
  -d '{
    "userId": "'$REFERRAL_ID'",
    "referrerId": "'$REFERRAL_CODE'"
  }'
```

### **Ожидаемый ответ:**
```json
{
  "success": true,
  "message": "Referral registered successfully"
}
```

**ИЛИ (если уже зарегистрирован):**
```json
{
  "success": true,
  "message": "Referral already registered, click counted",
  "alreadyExists": true
}
```

### **Проверка в БД:**
```bash
sqlite3 /var/www/duo/site/server/data/database.db

SELECT clicks FROM referral_stats WHERE user_id = $PARTNER_ID;
-- Должно увеличиться на 1!

SELECT * FROM referral_events WHERE event_type = 'click' ORDER BY created_at DESC LIMIT 1;
-- Должно быть новое событие!

.quit
```

### **Проверка на сайте:**
```
1. Открой http://77.239.125.70
2. Нажми Ctrl+Shift+F5
3. Статистика "Переходы" должна увеличиться!
4. График должен показать точку на сегодняшней дате!
```

---

## 💰 ДОБАВЛЕНИЕ ПЕРВОГО ДЕПОЗИТА {#первый-депозит}

### **Endpoint:** `POST /api/referral/add`

**Что делает:** Регистрирует первый депозит реферала

### **Команда:**
```bash
curl -X POST http://localhost:3000/api/referral/add \
  -H "Content-Type: application/json" \
  -H "x-api-secret: $API_SECRET" \
  -d '{
    "referralCode": "'$REFERRAL_CODE'",
    "referralUserId": "'$REFERRAL_ID'",
    "depositAmount": 100
  }'
```

### **Параметры:**
- `referralCode` - Реферальный код партнёра
- `referralUserId` - Telegram ID реферала
- `depositAmount` - Сумма депозита (в рублях)

### **Ожидаемый ответ:**
```json
{
  "success": true,
  "message": "Реферал зарегистрирован"
}
```

### **Проверка в БД:**
```bash
sqlite3 /var/www/duo/site/server/data/database.db

SELECT first_deposits, total_deposits FROM referral_stats WHERE user_id = $PARTNER_ID;
-- first_deposits должно увеличиться на 1
-- total_deposits должно увеличиться на 100

SELECT * FROM referral_events WHERE event_type = 'first_deposit' ORDER BY created_at DESC LIMIT 1;
-- Должно быть новое событие с amount = 100

.quit
```

### **Проверка на сайте:**
```
1. Обнови страницу (Ctrl+Shift+F5)
2. "Первые депозиты" должно увеличиться!
3. "Сумма депозитов" должна показать +100₽
4. График (кнопка "Первые депозиты") должен показать точку!
```

---

## 🎰 ДОБАВЛЕНИЕ ПРОИГРЫША (КОМИССИИ) {#проигрыш}

### **Endpoint:** `POST /api/referral/loss`

**Что делает:** Регистрирует проигрыш реферала и начисляет 60% комиссию партнёру

### **Команда:**
```bash
curl -X POST http://localhost:3000/api/referral/loss \
  -H "Content-Type: application/json" \
  -H "x-api-secret: $API_SECRET" \
  -d '{
    "referralCode": "'$REFERRAL_CODE'",
    "referralUserId": "'$REFERRAL_ID'",
    "lossAmount": 50
  }'
```

### **Параметры:**
- `referralCode` - Реферальный код партнёра
- `referralUserId` - Telegram ID реферала
- `lossAmount` - Сумма проигрыша (в рублях)

### **Расчёт комиссии:**
```
lossAmount = 50₽
earnings = lossAmount × 0.6 = 50 × 0.6 = 30₽
```

### **Ожидаемый ответ:**
```json
{
  "success": true,
  "message": "Комиссия начислена"
}
```

### **Проверка в БД:**
```bash
sqlite3 /var/www/duo/site/server/data/database.db

SELECT earnings FROM referral_stats WHERE user_id = $PARTNER_ID;
-- earnings должно увеличиться на 30 (50 × 0.6)

SELECT * FROM referral_events WHERE event_type = 'earning' ORDER BY created_at DESC LIMIT 1;
-- Должно быть новое событие с amount = 30

.quit
```

### **Проверка на сайте:**
```
1. Обнови страницу (Ctrl+Shift+F5)
2. "Средний доход с игрока" должен показать +30₽
3. График (кнопка "Доход") должен показать точку!
```

---

## 📊 ПРОВЕРКА СТАТИСТИКИ {#проверка}

### **1. Общая статистика:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/referral/partner/stats
```

**Где взять токен:**
```
1. Открой http://77.239.125.70
2. Нажми F12 (DevTools)
3. Application → Local Storage → authToken
4. Скопируй значение
```

**Ответ:**
```json
{
  "success": true,
  "referralCode": "1_MJIBVR2D5DA9M",
  "stats": {
    "clicks": 3,
    "firstDeposits": 1,
    "deposits": 1,
    "totalDeposits": "100.00",
    "costPerClick": "10.00",
    "avgIncomePerPlayer": "100.00",
    "earnings": "30.00"
  }
}
```

---

### **2. Timeline (данные для графика):**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/referral/partner/stats/timeline?period=week"
```

**Параметр period:**
- `week` - 7 дней
- `month` - 30 дней
- `3months` - 90 дней
- `6months` - 180 дней
- `year` - 365 дней

**Ответ:**
```json
{
  "success": true,
  "period": "week",
  "timeline": {
    "2025-12-26": {
      "clicks": 3,
      "firstDeposits": 1,
      "deposits": 1,
      "depositsAmount": 100,
      "earnings": 30
    }
  },
  "dates": ["2025-12-19", "2025-12-20", ..., "2025-12-26"]
}
```

---

### **3. Проверка в БД:**
```bash
sqlite3 /var/www/duo/site/server/data/database.db

-- Общая статистика партнёра
SELECT * FROM referral_stats WHERE user_id = 1;

-- События за сегодня
SELECT 
    event_type,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM referral_events
WHERE partner_id = 1 
  AND DATE(created_at) = DATE('now')
GROUP BY event_type;

-- Последние 10 событий
SELECT 
    datetime(created_at, 'localtime') as time,
    event_type,
    amount
FROM referral_events
WHERE partner_id = 1
ORDER BY created_at DESC
LIMIT 10;

.quit
```

---

## 🚀 БЫСТРЫЕ ТЕСТЫ ГРАФИКА {#быстрые-тесты}

### **Тест 1: Одно событие каждого типа**

```bash
# Переменные
API_SECRET="REPLACE_WITH_YOUR_SECRET"
PARTNER_ID=1
REFERRAL_ID=1889923046
REFERRAL_CODE="1_MJIBVR2D5DA9M"

# 1. Клик (переход)
curl -X POST http://localhost:3000/api/referral/register \
  -H "Content-Type: application/json" \
  -H "x-api-secret: $API_SECRET" \
  -d '{"userId": "'$REFERRAL_ID'", "referrerId": "'$REFERRAL_CODE'"}'

echo "✅ Клик добавлен"
sleep 1

# 2. Первый депозит (100₽)
curl -X POST http://localhost:3000/api/referral/add \
  -H "Content-Type: application/json" \
  -H "x-api-secret: $API_SECRET" \
  -d '{"referralCode": "'$REFERRAL_CODE'", "referralUserId": "'$REFERRAL_ID'", "depositAmount": 100}'

echo "✅ Депозит 100₽ добавлен"
sleep 1

# 3. Проигрыш (50₽ → 30₽ комиссия)
curl -X POST http://localhost:3000/api/referral/loss \
  -H "Content-Type: application/json" \
  -H "x-api-secret: $API_SECRET" \
  -d '{"referralCode": "'$REFERRAL_CODE'", "referralUserId": "'$REFERRAL_ID'", "lossAmount": 50}'

echo "✅ Проигрыш 50₽ добавлен (комиссия 30₽)"

echo ""
echo "🎉 ТЕСТ ЗАВЕРШЁН!"
echo "Обнови страницу (Ctrl+Shift+F5) и проверь график!"
```

**Сохрани как скрипт:**
```bash
nano /root/test_referral.sh
# Вставь код выше
# Нажми Ctrl+X, затем Y, затем Enter

chmod +x /root/test_referral.sh
bash /root/test_referral.sh
```

---

### **Тест 2: Несколько событий для красивого графика**

```bash
#!/bin/bash

API_SECRET="REPLACE_WITH_YOUR_SECRET"
REFERRAL_CODE="1_MJIBVR2D5DA9M"

# Добавляем 5 кликов
for i in {1..5}; do
    curl -s -X POST http://localhost:3000/api/referral/register \
      -H "Content-Type: application/json" \
      -H "x-api-secret: $API_SECRET" \
      -d '{"userId": "user'$i'", "referrerId": "'$REFERRAL_CODE'"}'
    echo "✅ Клик $i добавлен"
    sleep 0.5
done

# Добавляем 3 депозита
for i in {1..3}; do
    AMOUNT=$((100 + i * 50))
    curl -s -X POST http://localhost:3000/api/referral/add \
      -H "Content-Type: application/json" \
      -H "x-api-secret: $API_SECRET" \
      -d '{"referralCode": "'$REFERRAL_CODE'", "referralUserId": "user'$i'", "depositAmount": '$AMOUNT'}'
    echo "✅ Депозит $AMOUNT₽ добавлен"
    sleep 0.5
done

# Добавляем 4 проигрыша
for i in {1..4}; do
    LOSS=$((30 + i * 20))
    curl -s -X POST http://localhost:3000/api/referral/loss \
      -H "Content-Type: application/json" \
      -H "x-api-secret: $API_SECRET" \
      -d '{"referralCode": "'$REFERRAL_CODE'", "referralUserId": "user'$i'", "lossAmount": '$LOSS'}'
    EARNINGS=$((LOSS * 6 / 10))
    echo "✅ Проигрыш $LOSS₽ добавлен (комиссия $EARNINGS₽)"
    sleep 0.5
done

echo ""
echo "🎉 МАССОВЫЙ ТЕСТ ЗАВЕРШЁН!"
echo "Статистика:"
echo "- Клики: 5"
echo "- Депозиты: 3 (100₽ + 150₽ + 200₽ = 450₽)"
echo "- Проигрыши: 4 (комиссия ~60%)"
echo ""
echo "Обнови страницу и посмотри красивый график! 📊"
```

**Сохрани как:**
```bash
nano /root/test_referral_bulk.sh
chmod +x /root/test_referral_bulk.sh
bash /root/test_referral_bulk.sh
```

---

## 🗑️ СБРОС СТАТИСТИКИ {#сброс}

### **Перед новым тестом:**
```bash
bash /var/www/duo/reset_stats.sh
```

**Скрипт:**
- Создаёт backup БД
- Удаляет все события из `referral_events`
- Сбрасывает счётчики в `referral_stats`
- НЕ удаляет реферальные коды!

---

## 📋 ПРИМЕРЫ КОМАНД

### **Быстрое добавление 1 клика:**
```bash
curl -X POST http://localhost:3000/api/referral/register \
  -H "Content-Type: application/json" \
  -H "x-api-secret: REPLACE_WITH_SECRET" \
  -d '{"userId": "test123", "referrerId": "1_MJIBVR2D5DA9M"}'
```

### **Добавление депозита 500₽:**
```bash
curl -X POST http://localhost:3000/api/referral/add \
  -H "Content-Type: application/json" \
  -H "x-api-secret: REPLACE_WITH_SECRET" \
  -d '{"referralCode": "1_MJIBVR2D5DA9M", "referralUserId": "test123", "depositAmount": 500}'
```

### **Проигрыш 1000₽ (600₽ комиссия):**
```bash
curl -X POST http://localhost:3000/api/referral/loss \
  -H "Content-Type: application/json" \
  -H "x-api-secret: REPLACE_WITH_SECRET" \
  -d '{"referralCode": "1_MJIBVR2D5DA9M", "referralUserId": "test123", "lossAmount": 1000}'
```

---

## 🐛 TROUBLESHOOTING

### **Ошибка: 401 Unauthorized**
```json
{"success": false, "message": "Unauthorized"}
```

**Решение:**
```bash
# Проверь что API_SECRET правильный
cat /var/www/duo/.env | grep PARTNER_API_SECRET

# Убедись что заголовок x-api-secret установлен
curl -v ...  # флаг -v покажет заголовки
```

---

### **Ошибка: Partner not found**
```json
{"success": false, "message": "Партнер не найден"}
```

**Решение:**
```bash
# Проверь что referralCode существует
sqlite3 /var/www/duo/site/server/data/database.db \
  "SELECT * FROM referral_stats WHERE referral_code = '1_MJIBVR2D5DA9M';"

# Если не существует - создай партнёра:
# 1. Открой http://77.239.125.70
# 2. Залогинься
# 3. Реферальный код создастся автоматически
```

---

### **График не обновляется**

**Решение:**
```bash
# 1. Проверь что события добавились
sqlite3 /var/www/duo/site/server/data/database.db \
  "SELECT COUNT(*) FROM referral_events WHERE partner_id = 1;"

# 2. Перезапусти сервер
pm2 restart duo-partner

# 3. Жёсткая перезагрузка в браузере
# Ctrl+Shift+F5

# 4. Проверь логи в DevTools Console (F12)
```

---

## ✅ ЧЕКЛИСТ ТЕСТИРОВАНИЯ

- [ ] API_SECRET получен из .env
- [ ] Реферальный код существует в БД
- [ ] Тестовый клик добавлен через curl
- [ ] Событие появилось в `referral_events`
- [ ] Счётчик в `referral_stats` увеличился
- [ ] График на сайте показывает точку
- [ ] Тестовый депозит добавлен
- [ ] Тестовый проигрыш добавлен
- [ ] Комиссия = 60% от проигрыша
- [ ] Все 4 метрики работают (Переходы, Доход, Депозиты, Первые депозиты)
- [ ] Кнопки переключения метрик работают
- [ ] Сброс статистики работает

---

## 🎯 ИТОГО

**С этой документацией ты можешь:**
- ✅ Быстро тестировать график без бота
- ✅ Добавлять события через curl
- ✅ Проверять работу API
- ✅ Создавать красивые данные для демо
- ✅ Отлаживать проблемы

**Готово! Используй curl команды для тестирования!** 🚀
