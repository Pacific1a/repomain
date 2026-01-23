# 🚀 ГАЙД ПО ДЕПЛОЮ НА СЕРВЕР

## 📋 ЧТО У НАС ЕСТЬ:

```
duo/
├── bot/                  # Mini App фронтенд
├── server/               # Node.js бэкенд
├── withdrawal-bot/       # Telegram бот для вывода
└── site/                 # Партнерский сайт
```

---

## 🖥️ ТРЕБОВАНИЯ К СЕРВЕРУ:

- **OS:** Ubuntu 20.04+ / Debian 11+
- **RAM:** Минимум 1GB (рекомендуется 2GB)
- **CPU:** 1 ядро (рекомендуется 2)
- **Диск:** 10GB минимум
- **Node.js:** v18+
- **Nginx:** Для проксирования

---

## 📦 СПОСОБ 1: ДЕПЛОЙ НА VPS (РЕКОМЕНДУЕТСЯ)

### **Шаг 1: Подключение к серверу**

```bash
ssh root@YOUR_SERVER_IP
```

### **Шаг 2: Установка Node.js**

```bash
# Обновляем систему
apt update && apt upgrade -y

# Устанавливаем Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Проверяем версию
node -v  # Должно быть v18+
npm -v
```

### **Шаг 3: Установка PM2 (менеджер процессов)**

```bash
npm install -g pm2
```

### **Шаг 4: Клонируем проект**

```bash
# Переходим в домашнюю папку
cd /home

# Клонируем репозиторий
git clone https://github.com/Pacific1a/repomain.git duo
cd duo
```

### **Шаг 5: Настройка сервера**

```bash
# Переходим в server
cd server

# Устанавливаем зависимости
npm install

# Создаем .env файл
nano .env
```

**Содержимое .env:**
```bash
# ОСНОВНЫЕ
NODE_ENV=production
PORT=3000

# TELEGRAM BOT
BOT_TOKEN=ВАШ_TELEGRAM_BOT_TOKEN
BOT_USERNAME=ваш_бот_username

# JWT
JWT_SECRET=ГЕНЕРИРУЙТЕ_ДЛИННЫЙ_РАНДОМНЫЙ_КЛЮЧ_ЗДЕСЬ

# БАЗА ДАННЫХ (SQLite, уже настроено)
DB_PATH=./data/database.sqlite

# БЕЗОПАСНОСТЬ
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Генерация JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### **Шаг 6: Запуск сервера через PM2**

```bash
# Запускаем сервер
pm2 start server.js --name "duo-server"

# Автозапуск при перезагрузке
pm2 startup
pm2 save

# Проверяем статус
pm2 status
pm2 logs duo-server
```

### **Шаг 7: Установка Nginx**

```bash
apt install -y nginx

# Создаем конфиг
nano /etc/nginx/sites-available/duo
```

**Содержимое конфига:**
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN.com;  # Или IP

    # Размер загружаемых файлов
    client_max_body_size 10M;

    # Mini App (bot)
    location /bot/ {
        alias /home/duo/bot/;
        try_files $uri $uri/ /bot/index.html;
        
        # Cache для статики
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 7d;
            add_header Cache-Control "public, immutable";
        }
    }

    # Partner Site
    location /partner/ {
        alias /home/duo/site/;
        try_files $uri $uri/ /partner/index.html;
    }

    # API и Socket.IO
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000;
    }
}
```

**Активация конфига:**
```bash
# Создаем симлинк
ln -s /etc/nginx/sites-available/duo /etc/nginx/sites-enabled/

# Удаляем дефолтный конфиг
rm /etc/nginx/sites-enabled/default

# Проверяем конфиг
nginx -t

# Перезапускаем Nginx
systemctl restart nginx
systemctl enable nginx
```

### **Шаг 8: SSL сертификат (опционально, но рекомендуется)**

```bash
# Установка Certbot
apt install -y certbot python3-certbot-nginx

# Получение сертификата
certbot --nginx -d YOUR_DOMAIN.com

# Автообновление сертификата
certbot renew --dry-run
```

### **Шаг 9: Настройка Telegram Webhook**

```bash
curl -X POST "https://api.telegram.org/botВАШ_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR_DOMAIN.com/api/webhook/telegram"}'
```

---

## 🔥 СПОСОБ 2: ДЕПЛОЙ НА RAILWAY / RENDER

### **Railway:**

1. Зарегистрируйся на [railway.app](https://railway.app)
2. Создай новый проект
3. Подключи GitHub репозиторий
4. Railway автоматически определит Node.js
5. Добавь переменные окружения (.env)
6. Deploy!

### **Render:**

1. Зарегистрируйся на [render.com](https://render.com)
2. New → Web Service
3. Подключи GitHub репозиторий
4. Build Command: `cd server && npm install`
5. Start Command: `cd server && npm start`
6. Добавь Environment Variables
7. Create Web Service

---

## 🎯 ПРОВЕРКА ДЕПЛОЯ

### **1. Проверяем сервер:**
```bash
curl http://YOUR_DOMAIN.com/health
# Должно вернуть: {"status":"ok","uptime":...}
```

### **2. Проверяем Mini App:**
```bash
curl http://YOUR_DOMAIN.com/bot/
# Должно вернуть HTML страницу
```

### **3. Проверяем Socket.IO:**
```bash
# В браузере открой консоль на YOUR_DOMAIN.com/bot/
# Не должно быть ошибок соединения
```

### **4. Telegram Mini App URL:**
```
https://YOUR_DOMAIN.com/bot/
```
Этот URL указываешь в BotFather → /newapp

---

## 📊 МОНИТОРИНГ

### **PM2 команды:**
```bash
pm2 status              # Статус всех процессов
pm2 logs duo-server     # Логи сервера
pm2 restart duo-server  # Перезапуск
pm2 stop duo-server     # Остановка
pm2 delete duo-server   # Удаление из PM2
```

### **Nginx логи:**
```bash
tail -f /var/log/nginx/access.log  # Access логи
tail -f /var/log/nginx/error.log   # Error логи
```

### **Системные ресурсы:**
```bash
htop              # Процессы и память
df -h             # Диск
free -m           # RAM
pm2 monit         # Мониторинг PM2
```

---

## 🔄 ОБНОВЛЕНИЕ ПРОЕКТА

```bash
# Подключаемся к серверу
ssh root@YOUR_SERVER_IP

# Переходим в проект
cd /home/duo

# Пуллим изменения
git pull origin main

# Обновляем зависимости (если нужно)
cd server
npm install

# Перезапускаем сервер
pm2 restart duo-server

# Проверяем логи
pm2 logs duo-server --lines 50
```

---

## 🛡️ БЕЗОПАСНОСТЬ

### **1. Firewall (UFW):**
```bash
# Устанавливаем
apt install -y ufw

# Разрешаем SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Включаем
ufw enable
ufw status
```

### **2. Fail2Ban (защита от брутфорса):**
```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### **3. Автообновления:**
```bash
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

---

## 🐛 TROUBLESHOOTING

### **Сервер не запускается:**
```bash
pm2 logs duo-server --lines 100  # Смотрим логи
pm2 restart duo-server            # Перезапускаем
```

### **Nginx показывает 502 Bad Gateway:**
```bash
# Проверяем работает ли Node.js
pm2 status

# Проверяем порт
netstat -tulpn | grep 3000

# Перезапускаем все
pm2 restart duo-server
systemctl restart nginx
```

### **Socket.IO не работает:**
```bash
# Проверяем конфиг Nginx (важно proxy_set_header Upgrade)
nginx -t

# Проверяем firewall
ufw status
```

### **База данных не создается:**
```bash
cd /home/duo/server
ls -la data/  # Проверяем права доступа
chmod 755 data/
```

---

## 📞 БЫСТРЫЕ КОМАНДЫ

```bash
# Статус
pm2 status && systemctl status nginx

# Логи
pm2 logs duo-server --lines 50

# Перезапуск всего
pm2 restart duo-server && systemctl restart nginx

# Проверка здоровья
curl http://localhost:3000/health

# Обновление
cd /home/duo && git pull && cd server && pm2 restart duo-server
```

---

## ✅ ЧЕКЛИСТ ДЕПЛОЯ

- [ ] Сервер арендован (VPS/Railway/Render)
- [ ] Node.js 18+ установлен
- [ ] PM2 установлен
- [ ] Проект склонирован
- [ ] .env настроен с правильными токенами
- [ ] npm install выполнен
- [ ] PM2 запущен (`pm2 start server.js`)
- [ ] Nginx настроен и работает
- [ ] SSL сертификат получен (опционально)
- [ ] Telegram webhook настроен
- [ ] Файрвол настроен
- [ ] Домен настроен (DNS)
- [ ] Mini App URL прописан в BotFather
- [ ] Всё протестировано!

---

**Готово к деплою! 🚀**

У тебя есть VPS или хочешь на Railway/Render?
