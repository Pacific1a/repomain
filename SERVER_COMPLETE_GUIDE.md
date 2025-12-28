# 🚀 ПОЛНАЯ ДОКУМЕНТАЦИЯ ПО СЕРВЕРУ DUO PARTNERS

## 📋 ДАННЫЕ СЕРВЕРА

```
IP: 77.239.125.70
Логин: root
Пароль: G3ce12soSjWJK38jyGq
```

---

## ⚡ БЫСТРЫЙ СТАРТ

### Подключение к серверу:

```bash
ssh root@77.239.125.70
# Пароль: G3ce12soSjWJK38jyGq
cd /var/www/duo
git pull
```
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc2NjY3OTY1NiwiZXhwIjoxNzY3Mjg0NDU2fQ.aocObCtvpeIoKK2qI9DBMShkxzpAyBEfBOAQpra0rkc"
     http://localhost:3000/api/referral/partner/stats
### Проверка статуса:
 cd /var/www/duo
     git pull origin main
     pm2 restart duo-partner
```bash
pm2 status
```
cd /var/www/duo/bot/autoshop
     source venv/bin/activate
     python main.py
     
### Перезапуск всего:

```bash
pm2 restart all
```

### Логи:

```bash
# Все логи
pm2 logs

# Сайт
pm2 logs duo-partner

# Бот
pm2 logs duo-bot
```

---

## 🔧 УПРАВЛЕНИЕ СЕРВИСАМИ

### PM2 Команды

```bash
# Статус всех процессов
pm2 status

# Запустить
pm2 start <name>

# Остановить
pm2 stop <name>

# Перезапустить
pm2 restart <name>

# Удалить из PM2
pm2 delete <name>

# Логи
pm2 logs <name> --lines 100

# Очистить логи
pm2 flush

# Мониторинг в реальном времени
pm2 monit

# Сохранить текущие процессы
pm2 save
```

### Сайт партнёров (duo-partner)

```bash
# Перезапуск
pm2 restart duo-partner

# Остановка
pm2 stop duo-partner

# Логи
pm2 logs duo-partner

# Логи последние 50 строк
pm2 logs duo-partner --lines 50
```

### Python бот (duo-bot)

```bash
# Перезапуск
pm2 restart duo-bot

# Остановка
pm2 stop duo-bot

# Логи
pm2 logs duo-bot

# Если нужно запустить заново:
cd /var/www/duo/bot/autoshop
pm2 start "venv/bin/python main.py" --name duo-bot
pm2 save
```

### Nginx

```bash
# Статус
systemctl status nginx

# Перезапуск
systemctl restart nginx

# Остановка
systemctl stop nginx

# Запуск
systemctl start nginx

# Проверка конфигурации
nginx -t

# Перезагрузка конфигурации
systemctl reload nginx

# Логи
tail -f /var/log/nginx/duo-partner-access.log
tail -f /var/log/nginx/duo-partner-error.log
```

---

## 📦 ПОЛНАЯ УСТАНОВКА С НУЛЯ

### Если нужно установить всё заново:

```bash
#!/bin/bash

# 1. Обновление системы
apt update && apt upgrade -y

# 2. Установка базовых пакетов
apt install -y curl wget git build-essential software-properties-common ufw

# 3. Установка Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 4. Установка Python 3
apt install -y python3 python3-pip python3-venv python3-full

# 5. Установка PM2
npm install -g pm2

# 6. Установка Nginx
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# 7. Установка Certbot (SSL)
apt install -y certbot python3-certbot-nginx

# 8. Настройка Firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 9. Клонирование проекта
cd /var/www
git clone https://github.com/Pacific1a/repomain.git duo

# 10. Установка зависимостей Node.js
cd /var/www/duo/site/server
npm install

# 11. Установка зависимостей Python
cd /var/www/duo/bot/autoshop
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

# 12. Создание .env для сайта
cat > /var/www/duo/site/server/.env << 'EOL'
PORT=3000
JWT_SECRET=duo-partners-secret-key-change-in-production-2024
DATABASE_PATH=/var/www/duo/site/server/data/database.db
PARTNER_API_SECRET=e1e6547a80623ab936abfe561a8a0871
SITE_URL=http://77.239.125.70
NODE_ENV=production
EOL

# 13. Создание .env для бота
cat > /var/www/duo/bot/autoshop/.env << 'EOL'
SERVER_URL=http://77.239.125.70
PARTNER_API_SECRET=e1e6547a80623ab936abfe561a8a0871
EOL

# 14. Создание директории для БД
mkdir -p /var/www/duo/site/server/data
chmod 755 /var/www/duo/site/server/data

# 15. Настройка Nginx
cat > /etc/nginx/sites-available/duo-partner << 'EOL'
server {
    listen 80;
    server_name 77.239.125.70;

    access_log /var/log/nginx/duo-partner-access.log;
    error_log /var/log/nginx/duo-partner-error.log;

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

    location / {
        root /var/www/duo/site;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    location /uploads/ {
        alias /var/www/duo/site/uploads/;
    }
}
EOL

ln -sf /etc/nginx/sites-available/duo-partner /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# 16. Запуск сайта
cd /var/www/duo/site/server
pm2 start server.js --name duo-partner
pm2 save
pm2 startup systemd -u root --hp /root

# 17. Запуск бота
cd /var/www/duo/bot/autoshop
pm2 start "venv/bin/python main.py" --name duo-bot
pm2 save

# 18. Проверка
pm2 status

echo "✅ Установка завершена!"
echo "Сайт: http://77.239.125.70"
```

---

## 🔄 ОБНОВЛЕНИЕ ПРОЕКТА

### Обновить код с GitHub:

```bash
# 1. Перейти в проект
cd /var/www/duo

# 2. Сохранить изменения (если есть)
git stash

# 3. Обновить код
git pull origin main

# 4. Вернуть изменения
git stash pop

# 5. Обновить зависимости Node.js
cd site/server
npm install

# 6. Обновить зависимости Python
cd ../../bot/autoshop
source venv/bin/activate
pip install -r requirements.txt
deactivate

# 7. Перезапустить сервисы
pm2 restart all

# 8. Проверить
pm2 status
pm2 logs --lines 20
```

---

## 👤 УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ

### Создать админа:

```bash
cd /var/www/duo/site/server
node create-admin.js
```

**Введи:**
- Email
- Login
- Password
- Telegram ID (опционально)

### Сбросить 2FA:

```bash
cd /var/www/duo/site/server
node reset-2fa.js
```

### Проверить пользователей в БД:

```bash
cd /var/www/duo/site/server/data
sqlite3 database.db

# В sqlite3:
SELECT * FROM users;
SELECT * FROM referral_stats;
.exit
```

---

## 🗄️ РАБОТА С БАЗОЙ ДАННЫХ

### Подключение к БД:

```bash
cd /var/www/duo/site/server/data
sqlite3 database.db
```

### Полезные SQL команды:

```sql
-- Показать все таблицы
.tables

-- Показать структуру таблицы
.schema users

-- Все пользователи
SELECT * FROM users;

-- Статистика рефералов
SELECT * FROM referral_stats;

-- Все рефералы
SELECT * FROM referrals;

-- Подсчет пользователей
SELECT COUNT(*) FROM users;

-- Выход
.exit
```

### Бэкап базы данных:

```bash
# Ручной бэкап
cp /var/www/duo/site/server/data/database.db /root/backups/db_$(date +%Y%m%d_%H%M%S).db

# Восстановление
cp /root/backups/db_YYYYMMDD_HHMMSS.db /var/www/duo/site/server/data/database.db
pm2 restart duo-partner
```

### Автоматический бэкап (настройка):

```bash
# Создать скрипт
cat > /root/backup.sh << 'EOL'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p /root/backups
cp /var/www/duo/site/server/data/database.db /root/backups/db_$DATE.db
# Оставляем только последние 7 бэкапов
ls -t /root/backups/db_*.db | tail -n +8 | xargs rm -f
EOL

chmod +x /root/backup.sh

# Добавить в cron (каждый день в 3:00)
crontab -e
# Добавь строку:
0 3 * * * /root/backup.sh
```

---

## 🐛 РЕШЕНИЕ ПРОБЛЕМ

### Сайт не открывается:

```bash
# 1. Проверить PM2
pm2 status

# 2. Проверить логи
pm2 logs duo-partner --lines 50

# 3. Проверить Nginx
systemctl status nginx
nginx -t

# 4. Проверить порт 3000
netstat -tulpn | grep 3000

# 5. Перезапустить всё
pm2 restart duo-partner
systemctl restart nginx
```

### Бот не отвечает:

```bash
# 1. Проверить статус
pm2 status

# 2. Логи бота
pm2 logs duo-bot --lines 100

# 3. Проверить .env
cat /var/www/duo/bot/autoshop/.env

# 4. Проверить venv
ls -la /var/www/duo/bot/autoshop/venv

# 5. Переустановить зависимости
cd /var/www/duo/bot/autoshop
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

# 6. Перезапустить
pm2 restart duo-bot
```

### База данных не работает:

```bash
# 1. Проверить файл БД
ls -la /var/www/duo/site/server/data/database.db

# 2. Проверить права
chmod 755 /var/www/duo/site/server/data
chmod 644 /var/www/duo/site/server/data/database.db

# 3. Проверить в БД
cd /var/www/duo/site/server/data
sqlite3 database.db
.tables
.exit

# 4. Если БД битая - восстановить из бэкапа
cp /root/backups/db_LATEST.db /var/www/duo/site/server/data/database.db
pm2 restart duo-partner
```

### Out of Memory:

```bash
# 1. Проверить память
free -h

# 2. Проверить процессы
pm2 monit

# 3. Создать swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 4. Проверить swap
free -h
```

### Nginx ошибка:

```bash
# 1. Проверить конфигурацию
nginx -t

# 2. Логи Nginx
tail -f /var/log/nginx/duo-partner-error.log

# 3. Перезагрузить конфиг
systemctl reload nginx

# 4. Полный рестарт
systemctl restart nginx
```

---

## 🔐 БЕЗОПАСНОСТЬ

### Смена пароля root:

```bash
passwd
```

### Создание нового пользователя:

```bash
adduser duoadmin
usermod -aG sudo duoadmin
```

### SSH ключи (рекомендуется):

```bash
# На локальной машине:
ssh-keygen -t rsa -b 4096

# Скопировать на сервер:
ssh-copy-id root@77.239.125.70

# На сервере отключить вход по паролю:
nano /etc/ssh/sshd_config
# Изменить: PasswordAuthentication no
systemctl restart sshd
```

### Проверка открытых портов:

```bash
netstat -tulpn
ufw status
```

---

## 📊 МОНИТОРИНГ

### Использование ресурсов:

```bash
# CPU и память
htop

# Память
free -h

# Диск
df -h

# Нагрузка
uptime

# Процессы
top
```

### Логи системы:

```bash
# Системные логи
journalctl -xe

# Логи Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# PM2 логи
pm2 logs

# Логи конкретного сервиса
pm2 logs duo-partner
pm2 logs duo-bot
```

---

## 🌐 НАСТРОЙКА ДОМЕНА

### Если у тебя есть домен:

```bash
# 1. В DNS панели домена добавь A-запись:
# Тип: A
# Имя: @
# Значение: 77.239.125.70

# 2. Обновить Nginx конфиг
nano /etc/nginx/sites-available/duo-partner
# Изменить:
# server_name 77.239.125.70;
# На:
# server_name yourdomain.com www.yourdomain.com;

# 3. Проверить и перезагрузить
nginx -t
systemctl reload nginx

# 4. Установить SSL
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 5. Обновить .env файлы
nano /var/www/duo/site/server/.env
# SITE_URL=https://yourdomain.com

nano /var/www/duo/bot/autoshop/.env
# SERVER_URL=https://yourdomain.com

# 6. Перезапустить
pm2 restart all
```

---

## ⚡ БЫСТРЫЕ КОМАНДЫ

### Перезапустить всё:

```bash
pm2 restart all && systemctl reload nginx
```

### Полный рестарт:

```bash
pm2 stop all && pm2 start all
```

### Обновить проект:

```bash
cd /var/www/duo && git pull && cd site/server && npm install && pm2 restart duo-partner
```

### Проверить всё:

```bash
pm2 status && systemctl status nginx && free -h && df -h
```

### Посмотреть все логи:

```bash
pm2 logs --lines 50
```

---

## 📞 КОНТАКТЫ И АДРЕСА

```
Сайт: http://77.239.125.70
Админка: http://77.239.125.70 (после логина)

SSH: ssh root@77.239.125.70
Пароль: G3ce12soSjWJK38jyGq

Проект на GitHub: https://github.com/Pacific1a/repomain
```

---

## 📝 CHECKLIST ПЕРЕД ЗАПУСКОМ

- [ ] Сервер доступен по SSH
- [ ] Node.js установлен (node --version)
- [ ] Python установлен (python3 --version)
- [ ] PM2 установлен (pm2 --version)
- [ ] Nginx установлен (nginx -v)
- [ ] Проект клонирован в /var/www/duo
- [ ] Зависимости Node.js установлены
- [ ] Зависимости Python установлены в venv
- [ ] .env файлы созданы
- [ ] База данных создана
- [ ] Nginx конфиг настроен
- [ ] duo-partner запущен (pm2 status)
- [ ] duo-bot запущен (pm2 status)
- [ ] Сайт открывается в браузере
- [ ] Админ создан
- [ ] Бот отвечает в Telegram

---

## 🚨 ВАЖНО ЗАПОМНИТЬ

1. **Всегда делай бэкапы БД перед обновлениями**
2. **Проверяй логи после перезапуска** (`pm2 logs`)
3. **Бот использует venv** - запускай через `venv/bin/python`
4. **После git pull всегда делай** `npm install` и `pm2 restart all`
5. **Nginx конфиг:** `/etc/nginx/sites-available/duo-partner`
6. **База данных:** `/var/www/duo/site/server/data/database.db`
7. **PM2 автозапуск настроен** - после перезагрузки сервера всё запустится автоматически

---

## 🎯 ГОТОВО!

**Теперь у тебя есть всё что нужно для работы с сервером!**

**Добавь этот файл в закладки и используй когда нужно!** 🚀
