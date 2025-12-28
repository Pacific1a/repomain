# 🚀 DUO DEPLOYMENT GUIDE

Пошаговая инструкция по деплою нового чистого сервера на удаленный сервер.

---

## 📋 ПРЕДВАРИТЕЛЬНАЯ ИНФОРМАЦИЯ

**Сервер:**
- IP: `77.239.125.70`
- Пользователь: `root`
- Пароль: `G3ce12soSjWJK38jyGq`

**Telegram Бот:**
- Username: `@aasasdasdadsddasdbot`

---

## 🎯 ШАГ 1: ПОДКЛЮЧЕНИЕ К СЕРВЕРУ

С вашего компьютера:

```bash
ssh root@77.239.125.70
# Пароль: G3ce12soSjWJK38jyGq
```

---

## 🧹 ШАГ 2: ОЧИСТКА СТАРОГО СЕРВЕРА

На удаленном сервере:

```bash
# Перейти в папку проекта
cd /var/www/duo

# Загрузить скрипт очистки
# (если его еще нет, создайте его вручную)

# Запустить очистку
bash deploy/clean.sh
```

Это остановит все старые процессы PM2 и очистит порт 3000.

---

## 📦 ШАГ 3: ЗАГРУЗКА НОВОГО КОДА

### Вариант А: Через Git (рекомендуется)

```bash
cd /var/www/duo

# Сохранить изменения
git stash

# Загрузить новый код
git pull origin main

# Вернуть изменения
git stash pop
```

### Вариант Б: Вручную через SCP

С вашего компьютера:

```bash
# Загрузить папку server/
scp -r C:\Users\dev_fenomen\Desktop\duo\server root@77.239.125.70:/var/www/duo/

# Загрузить обновленный config.py бота
scp C:\Users\dev_fenomen\Desktop\duo\bot\autoshop\tgbot\data\config.py \
    root@77.239.125.70:/var/www/duo/bot/autoshop/tgbot/data/
```

---

## ⚙️  ШАГ 4: УСТАНОВКА ЗАВИСИМОСТЕЙ

На удаленном сервере:

```bash
# Node.js зависимости для сервера
cd /var/www/duo/server
npm install
```

**Ожидаемый вывод:**
```
added 150 packages
✅ Dependencies installed
```

---

## 🔐 ШАГ 5: НАСТРОЙКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ

### Сервер

```bash
cat > /var/www/duo/server/.env << 'EOL'
PORT=3000
NODE_ENV=production
JWT_SECRET=duo-super-secret-jwt-key-change-in-production-2024
PARTNER_API_SECRET=e1e6547a80623ab936abfe561a8a0871
DATABASE_PATH=./data/database.db
SITE_URL=http://77.239.125.70
BOT_USERNAME=aasasdasdadsddasdbot
EOL
```

### Python Бот

```bash
cat > /var/www/duo/bot/autoshop/.env << 'EOL'
SERVER_URL=http://77.239.125.70:3000
PARTNER_API_SECRET=e1e6547a80623ab936abfe561a8a0871
EOL
```

**Проверить:**
```bash
cat /var/www/duo/server/.env
cat /var/www/duo/bot/autoshop/.env
```

---

## 🚀 ШАГ 6: ЗАПУСК СЕРВЕРА

```bash
# Остановить все старые процессы
pm2 stop all
pm2 delete all

# Запустить новый сервер
cd /var/www/duo/server
pm2 start server.js --name duo-server

# Запустить бота
cd /var/www/duo/bot/autoshop
pm2 start "venv/bin/python main.py" --name duo-bot

# Сохранить конфигурацию PM2
pm2 save
```

**Проверить статус:**
```bash
pm2 status
```

**Ожидаемый вывод:**
```
┌─────────────┬────┬─────────┬──────┐
│ Name        │ id │ status  │ cpu  │
├─────────────┼────┼─────────┼──────┤
│ duo-server  │ 0  │ online  │ 0%   │
│ duo-bot     │ 1  │ online  │ 0%   │
└─────────────┴────┴─────────┴──────┘
```

---

## 🌐 ШАГ 7: НАСТРОЙКА NGINX

```bash
cat > /etc/nginx/sites-available/duo << 'EOL'
server {
    listen 80;
    server_name 77.239.125.70;

    access_log /var/log/nginx/duo-access.log;
    error_log /var/log/nginx/duo-error.log;

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Bot miniapp
    location /bot/ {
        proxy_pass http://localhost:3000/bot/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Partner site (root)
    location / {
        proxy_pass http://localhost:3000/partner/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
EOL

# Активировать конфигурацию
ln -sf /etc/nginx/sites-available/duo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверить конфигурацию
nginx -t

# Перезагрузить Nginx
systemctl reload nginx
```

**Проверить статус Nginx:**
```bash
systemctl status nginx
```

---

## ✅ ШАГ 8: ПРОВЕРКА РАБОТЫ

### 1. Health Check

```bash
curl http://localhost:3000/health
```

**Ожидаемый ответ:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-28T...",
  "uptime": 123.45
}
```

### 2. API Status

```bash
curl http://localhost:3000/api/status
```

**Ожидаемый ответ:**
```json
{
  "success": true,
  "server": "DUO Unified Server",
  "version": "2.0.0",
  "timestamp": "..."
}
```

### 3. Проверка через браузер

Откройте в браузере:
- **Партнерский сайт:** http://77.239.125.70/
- **Бот миниапп:** http://77.239.125.70/bot/
- **Health check:** http://77.239.125.70/health

---

## 📊 ШАГ 9: МОНИТОРИНГ

### Посмотреть логи

```bash
# Логи сервера
pm2 logs duo-server

# Логи бота
pm2 logs duo-bot

# Все логи
pm2 logs

# Последние 100 строк
pm2 logs duo-server --lines 100
```

### Проверить использование ресурсов

```bash
# Процессы PM2
pm2 monit

# Общая информация
htop
```

### Проверить порты

```bash
# Порт 3000 (должен быть занят Node.js)
lsof -i:3000

# Порт 80 (должен быть занят Nginx)
lsof -i:80
```

---

## 🧪 ШАГ 10: ТЕСТИРОВАНИЕ РЕФЕРАЛЬНОЙ СИСТЕМЫ

### 1. Создать тестового партнера

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "login": "testpartner",
    "password": "test123",
    "telegram": "@testuser"
  }'
```

**Сохраните токен из ответа!**

### 2. Получить статистику

```bash
curl http://localhost:3000/api/referral/partner/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Симуляция клика от бота

```bash
curl -X POST http://localhost:3000/api/referral/register \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: e1e6547a80623ab936abfe561a8a0871" \
  -d '{
    "userId": "123456789",
    "referrerId": "1_..."
  }'
```

---

## 🔄 ОБНОВЛЕНИЕ КОДА (в будущем)

```bash
cd /var/www/duo
bash deploy/update.sh
```

---

## ⚠️ TROUBLESHOOTING

### Проблема: Порт 3000 занят

```bash
# Найти процесс
lsof -i:3000

# Убить процесс
kill -9 <PID>

# Или убить все на порту 3000
lsof -ti:3000 | xargs kill -9
```

### Проблема: PM2 не запускается

```bash
# Полная перезагрузка PM2
pm2 kill
pm2 start server.js --name duo-server
```

### Проблема: Nginx ошибки

```bash
# Проверить конфигурацию
nginx -t

# Логи Nginx
tail -f /var/log/nginx/duo-error.log
```

### Проблема: База данных не создается

```bash
# Проверить права
ls -la /var/www/duo/server/data

# Создать папку вручную
mkdir -p /var/www/duo/server/data
chmod 755 /var/www/duo/server/data
```

---

## 📞 КОНТАКТЫ И ИНФОРМАЦИЯ

**Сервер:** 77.239.125.70  
**Пользователь:** root  
**Telegram Бот:** @aasasdasdadsddasdbot

**URLs:**
- Партнерский сайт: http://77.239.125.70/
- Бот миниапп: http://77.239.125.70/bot/
- API: http://77.239.125.70/api/
- Health: http://77.239.125.70/health

---

## ✅ CHECKLIST

- [ ] Подключились к серверу
- [ ] Остановили старые процессы
- [ ] Загрузили новый код
- [ ] Установили зависимости
- [ ] Настроили .env файлы
- [ ] Запустили сервер через PM2
- [ ] Настроили Nginx
- [ ] Проверили health check
- [ ] Протестировали API
- [ ] Проверили логи
- [ ] Протестировали реферальную систему

---

**Готово! Сервер запущен и работает!** 🚀
