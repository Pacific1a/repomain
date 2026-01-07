# 🧪 ПОЛНОЕ РУКОВОДСТВО ПО ТЕСТИРОВАНИЮ СИСТЕМЫ

## 📋 Содержание
1. [Управление балансом](#управление-балансом)
2. [Тестирование вывода средств](#тестирование-вывода-средств)
3. [Тестирование 2FA](#тестирование-2fa)
4. [Тестирование реферальной системы](#тестирование-реферальной-системы)
5. [Проверка безопасности](#проверка-безопасности)
6. [Просмотр логов и данных](#просмотр-логов-и-данных)
7. [Автоматизированные тесты](#автоматизированные-тесты)

---

## 📊 Управление балансом

### **Просмотр текущего баланса пользователя**

```bash
# Узнать ID пользователя по логину
sqlite3 /var/www/duo/server/data/database.db \
"SELECT id, login, balance FROM users WHERE login = 'kuratormir07';"

# Результат:
# 7|kuratormir07|150000
```

### **Установить баланс пользователю**

```bash
# Установить баланс 99999₽ для пользователя ID=7
sqlite3 /var/www/duo/server/data/database.db \
"UPDATE users SET balance = 99999 WHERE id = 7;"

# Проверить что изменилось
sqlite3 /var/www/duo/server/data/database.db \
"SELECT id, login, balance FROM users WHERE id = 7;"
```

### **Добавить к балансу (не перезаписать)**

```bash
# Добавить 50000₽ к текущему балансу
sqlite3 /var/www/duo/server/data/database.db \
"UPDATE users SET balance = balance + 50000 WHERE id = 7;"
```

### **Обнулить баланс**

```bash
sqlite3 /var/www/duo/server/data/database.db \
"UPDATE users SET balance = 0 WHERE id = 7;"
```

### **Установить баланс сразу нескольким пользователям**

```bash
# Дать всем партнёрам по 100000₽
sqlite3 /var/www/duo/server/data/database.db \
"UPDATE users SET balance = 100000 WHERE id IN (4, 7, 8);"
```

---

## 💸 Тестирование вывода средств

### **Подготовка к тесту**

```bash
# 1. Установить баланс 150000₽
sqlite3 /var/www/duo/server/data/database.db \
"UPDATE users SET balance = 150000 WHERE id = 7;"

# 2. Проверить что 2FA включена
sqlite3 /var/www/duo/server/data/database.db \
"SELECT id, login, twofa_enabled FROM users WHERE id = 7;"

# Если twofa_enabled = 0, то включить на сайте через кнопку "Подключить 2FA"
```

### **Создание заявки на вывод (через сайт)**

**Шаги:**
1. Зайти на сайт партнёра: `http://77.239.125.70/partner/dashboard/`
2. Нажать кнопку **"Вывести средства"**
3. Ввести **2FA код** из Google Authenticator
4. Ввести **USDT адрес** (пример: `TYDzsYUEpvnYmQk4zGP9sWWcTEd2MiAtW6`)
5. Нажать **"Подтвердить вывод"**

**Проверка:**
```bash
# Проверить что заявка создана
sqlite3 /var/www/duo/server/data/database.db \
"SELECT * FROM withdrawal_requests ORDER BY created_at DESC LIMIT 1;"

# Проверить логи бота
pm2 logs withdrawal-bot --lines 20
```

### **Одобрение заявки (через Telegram)**

**Шаги:**
1. Открыть Telegram группу (ID: `-5140988999`)
2. Найти сообщение с новой заявкой
3. Нажать кнопку **"✅ Одобрить"**

**Проверка:**
```bash
# Проверить что баланс обнулился
sqlite3 /var/www/duo/server/data/database.db \
"SELECT id, login, balance FROM users WHERE id = 7;"

# Проверить статус заявки
sqlite3 /var/www/duo/server/data/database.db \
"SELECT id, status, amount, processed_by FROM withdrawal_requests ORDER BY created_at DESC LIMIT 1;"
```

### **Отклонение заявки с причиной**

**Шаги:**
1. Создать новую заявку (баланс снова 150000₽)
2. В Telegram нажать **"❌ Отклонить"**
3. **ОТВЕТИТЬ (reply)** на сообщение бота с причиной: `"Недостаточно документов"`

**Проверка:**
```bash
# Проверить статус и причину
sqlite3 /var/www/duo/server/data/database.db \
"SELECT id, status, admin_comment FROM withdrawal_requests ORDER BY created_at DESC LIMIT 1;"

# Проверить что баланс НЕ изменился
sqlite3 /var/www/duo/server/data/database.db \
"SELECT balance FROM users WHERE id = 7;"
```

### **Просмотр всех заявок пользователя**

```bash
sqlite3 /var/www/duo/server/data/database.db \
"SELECT id, amount, status, usdt_address, created_at, processed_at, processed_by, admin_comment 
FROM withdrawal_requests 
WHERE user_id = 7 
ORDER BY created_at DESC;"
```

### **Удалить все тестовые заявки**

```bash
# ОСТОРОЖНО! Удаляет ВСЕ заявки пользователя
sqlite3 /var/www/duo/server/data/database.db \
"DELETE FROM withdrawal_requests WHERE user_id = 7;"

# Удалить уведомления
sqlite3 /var/www/duo/server/data/database.db \
"DELETE FROM withdrawal_notifications WHERE user_id = 7;"
```

---

## 🔐 Тестирование 2FA

### **Проверить статус 2FA**

```bash
sqlite3 /var/www/duo/server/data/database.db \
"SELECT id, login, twofa_enabled, twofa_secret FROM users WHERE id = 7;"
```

### **Включить 2FA вручную (если нужно)**

```bash
# Генерировать secret можно на сайте через кнопку "Подключить 2FA"
# Или использовать существующий secret из БД

# Включить 2FA для пользователя
sqlite3 /var/www/duo/server/data/database.db \
"UPDATE users SET twofa_enabled = 1 WHERE id = 7;"
```

### **Отключить 2FA**

```bash
sqlite3 /var/www/duo/server/data/database.db \
"UPDATE users SET twofa_enabled = 0, twofa_secret = NULL WHERE id = 7;"
```

### **Тест проверки 2FA кода (через API)**

```bash
# Сначала залогиниться и получить токен
TOKEN="your-jwt-token-here"

# Получить secret из БД
SECRET=$(sqlite3 /var/www/duo/server/data/database.db \
"SELECT twofa_secret FROM users WHERE id = 7;")

echo "Secret: $SECRET"

# Сгенерировать текущий код (нужен oathtool)
# Установка: apt-get install oathtool
CODE=$(oathtool --totp -b "$SECRET")
echo "Current code: $CODE"

# Проверить код через API
curl -X POST http://77.239.125.70:3000/api/2fa/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\"}" \
  | jq .
```

---

## 👥 Тестирование реферальной системы

### **Просмотр реферального кода партнёра**

```bash
sqlite3 /var/www/duo/server/data/database.db \
"SELECT id, login, referral_code FROM users WHERE id = 7;"

# Результат:
# 7|kuratormir07|7_MJZRXNUHMD397
```

### **Получить реферальную ссылку**

```bash
# Реферальный код из предыдущей команды
REF_CODE="7_MJZRXNUHMD397"

# Ссылка для игроков (бот казино)
echo "Ссылка для игроков: https://t.me/aasasdasdadsddasdbot?start=ref_$REF_CODE"

# Ссылка для партнёров (сайт)
echo "Ссылка для партнёров: http://77.239.125.70/?partner=$REF_CODE"
```

### **Просмотр статистики партнёра**

```bash
# Общая статистика
sqlite3 /var/www/duo/server/data/database.db \
"SELECT * FROM referral_stats WHERE partner_id = 7;"

# Список всех рефералов
sqlite3 /var/www/duo/server/data/database.db \
"SELECT id, referral_user_id, created_at FROM referrals WHERE partner_id = 7;"

# История событий (переходы, депозиты, проигрыши)
sqlite3 /var/www/duo/server/data/database.db \
"SELECT event_type, amount, earnings, created_at 
FROM referral_events 
WHERE partner_id = 7 
ORDER BY created_at DESC 
LIMIT 10;"
```

### **Ручное добавление заработка партнёру**

```bash
# Симуляция: игрок проиграл 1000₽, партнёр получает 600₽ (60%)
PARTNER_ID=7
REFERRAL_USER_ID=1889923046  # ID игрока
LOSS_AMOUNT=1000
EARNINGS=600  # 60% от проигрыша

sqlite3 /var/www/duo/server/data/database.db <<EOF
-- Добавить событие
INSERT INTO referral_events (partner_id, referral_user_id, event_type, amount, earnings)
VALUES ($PARTNER_ID, $REFERRAL_USER_ID, 'loss', $LOSS_AMOUNT, $EARNINGS);

-- Обновить статистику
UPDATE referral_stats 
SET total_losses = total_losses + $LOSS_AMOUNT,
    earnings = earnings + $EARNINGS
WHERE partner_id = $PARTNER_ID;

-- Обновить баланс партнёра
UPDATE users 
SET balance = balance + $EARNINGS 
WHERE id = $PARTNER_ID;
EOF

echo "✅ Добавлено: партнёр получил $EARNINGS₽"
```

### **Зарегистрировать реферала вручную**

```bash
PARTNER_ID=7
NEW_USER_ID=123456789

sqlite3 /var/www/duo/server/data/database.db <<EOF
-- Создать реферала
INSERT INTO referrals (partner_id, referral_user_id)
VALUES ($PARTNER_ID, $NEW_USER_ID);

-- Увеличить счётчик переходов
UPDATE referral_stats 
SET clicks = clicks + 1 
WHERE partner_id = $PARTNER_ID;
EOF

echo "✅ Реферал $NEW_USER_ID зарегистрирован для партнёра $PARTNER_ID"
```

### **Очистить всю статистику партнёра**

```bash
PARTNER_ID=7

sqlite3 /var/www/duo/server/data/database.db <<EOF
DELETE FROM referral_events WHERE partner_id = $PARTNER_ID;
DELETE FROM referrals WHERE partner_id = $PARTNER_ID;
UPDATE referral_stats SET 
  clicks = 0,
  first_deposits = 0,
  deposits = 0,
  total_deposits = 0,
  total_losses = 0,
  earnings = 0
WHERE partner_id = $PARTNER_ID;
EOF

echo "✅ Статистика партнёра $PARTNER_ID очищена"
```

---

## 🔒 Проверка безопасности

### **Тест 1: Попытка вывода без авторизации**

```bash
curl -X POST http://77.239.125.70:3000/api/withdrawal/request \
  -H "Content-Type: application/json" \
  -d '{"amount":10000,"usdtAddress":"TYDzsYUEpvnYmQk4zGP9sWWcTEd2MiAtW6"}' \
  -w "\nHTTP Status: %{http_code}\n"

# Ожидается: 401 Unauthorized
```

### **Тест 2: Неправильный BOT_SECRET**

```bash
curl -X POST http://77.239.125.70:3000/api/withdrawal/approve \
  -H "X-Bot-Secret: wrong-secret-here" \
  -H "Content-Type: application/json" \
  -d '{"requestId":"1","adminName":"hacker"}' \
  -w "\nHTTP Status: %{http_code}\n"

# Ожидается: 403 Forbidden
```

### **Тест 3: SQL Injection в USDT адресе**

```bash
# Получить валидный токен (сначала залогиниться на сайте)
# Проверить в браузере: localStorage.getItem('authToken')

TOKEN="your-jwt-token-here"

curl -X POST http://77.239.125.70:3000/api/withdrawal/request \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"amount\":10000,\"usdtAddress\":\"T123'; DROP TABLE users; --\"}" \
  | jq .

# Ожидается: Ошибка валидации или безопасное экранирование
```

### **Тест 4: Проверка секретов в конфигах**

```bash
echo "=== SERVER SECRET ==="
grep PARTNER_API_SECRET /var/www/duo/server/.env

echo "=== BOT SECRET ==="
grep PARTNER_API_SECRET /var/www/duo/bot/autoshop/.env

echo "=== WITHDRAWAL BOT SECRET ==="
grep BOT_SECRET /var/www/duo/withdrawal-bot/.env

# Все должны совпадать!
```

### **Тест 5: Права доступа к файлам**

```bash
# Проверить что .env файлы недоступны извне
curl http://77.239.125.70/server/.env -I
curl http://77.239.125.70/.env -I

# Ожидается: 404 Not Found (файлы защищены)
```

### **Тест 6: Rate Limiting API**

```bash
# Попробовать 100 запросов подряд
for i in {1..100}; do
  curl -s http://77.239.125.70:3000/api/referral/partner/stats \
    -w "%{http_code}\n" -o /dev/null
  sleep 0.1
done | sort | uniq -c

# Если rate limit работает, увидим 429 Too Many Requests
```

---

## 📋 Просмотр логов и данных

### **Логи всех сервисов**

```bash
# Логи основного сервера
pm2 logs duo-server --lines 50

# Логи бота казино
pm2 logs duo-bot --lines 50

# Логи бота вывода средств
pm2 logs withdrawal-bot --lines 50

# Все логи сразу
pm2 logs --lines 30
```

### **Сохранить логи в файл**

```bash
# Создать директорию для логов
mkdir -p /var/www/duo/logs

# Сохранить логи с timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
pm2 logs duo-server --lines 500 --nostream > "/var/www/duo/logs/duo-server_$TIMESTAMP.log"
pm2 logs duo-bot --lines 500 --nostream > "/var/www/duo/logs/duo-bot_$TIMESTAMP.log"
pm2 logs withdrawal-bot --lines 500 --nostream > "/var/www/duo/logs/withdrawal-bot_$TIMESTAMP.log"

echo "✅ Логи сохранены в /var/www/duo/logs/"
ls -lh /var/www/duo/logs/
```

### **Просмотр структуры БД**

```bash
# Список всех таблиц
sqlite3 /var/www/duo/server/data/database.db ".tables"

# Структура таблицы users
sqlite3 /var/www/duo/server/data/database.db ".schema users"

# Структура таблицы withdrawal_requests
sqlite3 /var/www/duo/server/data/database.db ".schema withdrawal_requests"

# Структура всех реферальных таблиц
sqlite3 /var/www/duo/server/data/database.db ".schema referrals"
sqlite3 /var/www/duo/server/data/database.db ".schema referral_stats"
sqlite3 /var/www/duo/server/data/database.db ".schema referral_events"
```

### **Экспорт данных в CSV**

```bash
# Экспорт всех пользователей
sqlite3 /var/www/duo/server/data/database.db \
"SELECT id, login, balance, twofa_enabled, created_at FROM users;" \
.mode csv > /tmp/users_export.csv

# Экспорт всех заявок на вывод
sqlite3 /var/www/duo/server/data/database.db \
"SELECT * FROM withdrawal_requests ORDER BY created_at DESC;" \
.mode csv > /tmp/withdrawals_export.csv

echo "✅ Данные экспортированы в /tmp/"
```

### **Backup базы данных**

```bash
# Создать backup
BACKUP_DIR="/var/www/duo/backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Backup основной БД
cp /var/www/duo/server/data/database.db "$BACKUP_DIR/database_$TIMESTAMP.db"

# Backup БД бота
cp /var/www/duo/bot/autoshop/tgbot/data/database.db "$BACKUP_DIR/bot_database_$TIMESTAMP.db"

# Создать архив
tar -czf "$BACKUP_DIR/full_backup_$TIMESTAMP.tar.gz" \
  /var/www/duo/server/data/database.db \
  /var/www/duo/bot/autoshop/tgbot/data/database.db

echo "✅ Backup создан: $BACKUP_DIR/full_backup_$TIMESTAMP.tar.gz"
ls -lh $BACKUP_DIR/
```

---

## 🤖 Автоматизированные тесты

### **Создать тест-скрипт**

```bash
cat > /var/www/duo/run-tests.sh << 'EOF'
#!/bin/bash

echo "🧪 === AUTOMATED TESTING SUITE ==="
echo ""

PASSED=0
FAILED=0

# Helper function
test_api() {
  local NAME="$1"
  local EXPECTED="$2"
  local COMMAND="$3"
  
  echo -n "Testing: $NAME ... "
  RESULT=$(eval "$COMMAND")
  
  if echo "$RESULT" | grep -q "$EXPECTED"; then
    echo "✅ PASS"
    ((PASSED++))
  else
    echo "❌ FAIL"
    echo "  Expected: $EXPECTED"
    echo "  Got: $RESULT"
    ((FAILED++))
  fi
}

# Test 1: Health check
test_api "Health endpoint" \
  "ok" \
  "curl -s http://localhost:3000/health | jq -r .status"

# Test 2: Unauthorized withdrawal
test_api "Unauthorized withdrawal" \
  "401" \
  "curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/withdrawal/request"

# Test 3: Invalid bot secret
test_api "Invalid bot secret" \
  "403" \
  "curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/withdrawal/approve -H 'X-Bot-Secret: wrong'"

# Test 4: Database connection
test_api "Database access" \
  "users" \
  "sqlite3 /var/www/duo/server/data/database.db '.tables' | grep users"

# Test 5: PM2 processes
test_api "PM2 duo-server running" \
  "online" \
  "pm2 jlist | jq -r '.[] | select(.name==\"duo-server\") | .pm2_env.status'"

test_api "PM2 duo-bot running" \
  "online" \
  "pm2 jlist | jq -r '.[] | select(.name==\"duo-bot\") | .pm2_env.status'"

test_api "PM2 withdrawal-bot running" \
  "online" \
  "pm2 jlist | jq -r '.[] | select(.name==\"withdrawal-bot\") | .pm2_env.status'"

# Test 6: Config files exist
test_api "Server .env exists" \
  "PARTNER_API_SECRET" \
  "grep PARTNER_API_SECRET /var/www/duo/server/.env"

test_api "Bot .env exists" \
  "PARTNER_API_SECRET" \
  "grep PARTNER_API_SECRET /var/www/duo/bot/autoshop/.env"

# Summary
echo ""
echo "================================"
echo "📊 TEST RESULTS"
echo "================================"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "📝 Total:  $((PASSED + FAILED))"
echo "================================"

if [ $FAILED -eq 0 ]; then
  echo "🎉 ALL TESTS PASSED!"
  exit 0
else
  echo "⚠️  SOME TESTS FAILED!"
  exit 1
fi
EOF

chmod +x /var/www/duo/run-tests.sh
echo "✅ Тест-скрипт создан: /var/www/duo/run-tests.sh"
```

### **Запустить тесты**

```bash
/var/www/duo/run-tests.sh
```

---

## 📖 Быстрые команды (Cheat Sheet)

### **Управление PM2**

```bash
# Статус всех процессов
pm2 status

# Рестарт всех сервисов
pm2 restart all --update-env

# Рестарт конкретного сервиса
pm2 restart duo-server --update-env

# Остановить сервис
pm2 stop duo-server

# Запустить сервис
pm2 start duo-server

# Удалить из PM2
pm2 delete duo-server

# Логи в реальном времени
pm2 logs --lines 50
```

### **Git операции**

```bash
# Обновить код с GitHub
cd /var/www/duo
git pull origin main

# Проверить изменения
git status
git log --oneline -5

# Откатить изменения
git reset --hard HEAD~1  # ОСТОРОЖНО!
```

### **Быстрая проверка системы**

```bash
# Проверить всё за 30 секунд
cd /var/www/duo

echo "=== PM2 Status ==="
pm2 status

echo "=== Recent logs ==="
pm2 logs --lines 10 --nostream

echo "=== Database check ==="
sqlite3 /var/www/duo/server/data/database.db \
"SELECT COUNT(*) as total_users FROM users;"

echo "=== Server response ==="
curl -s http://localhost:3000/health | jq .

echo "✅ Quick check complete!"
```

### **Экстренное восстановление**

```bash
# Если что-то сломалось - перезапустить всё
pm2 restart all --update-env
pm2 logs --lines 20

# Если совсем плохо - жёсткий рестарт
pm2 kill
cd /var/www/duo/server && pm2 start server.js --name duo-server
cd /var/www/duo/bot/autoshop && pm2 start venv/bin/python --name duo-bot -- main.py
cd /var/www/duo/withdrawal-bot && pm2 start index.js --name withdrawal-bot

pm2 save
```

---

## 📞 Контакты для вопросов

- **GitHub Issues:** https://github.com/Pacific1a/repomain/issues
- **Документация:** `/var/www/duo/SERVER_COMPLETE_GUIDE.md`

---

**Последнее обновление:** 2026-01-05

**Версия:** 1.0.0
