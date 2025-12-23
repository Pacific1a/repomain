#!/bin/bash

# ====================================
# Автоматическая установка DUO Partners
# VPS: Timeweb
# IP: 77.239.125.70
# ====================================

set -e

echo "🚀 Начинаем установку DUO Partners..."
echo "======================================="

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для логирования
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "${YELLOW}📌 $1${NC}"
}

# 1. Обновление системы
log_info "Шаг 1/10: Обновление системы..."
apt update && apt upgrade -y
log_success "Система обновлена"

# 2. Установка базовых пакетов
log_info "Шаг 2/10: Установка базовых пакетов..."
apt install -y curl wget git build-essential software-properties-common ufw
log_success "Базовые пакеты установлены"

# 3. Установка Node.js 18
log_info "Шаг 3/10: Установка Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node --version
npm --version
log_success "Node.js установлен"

# 4. Установка Python 3.11
log_info "Шаг 4/10: Установка Python 3.11..."
apt install -y python3 python3-pip python3-venv
python3 --version
pip3 --version
log_success "Python установлен"

# 5. Установка PM2
log_info "Шаг 5/10: Установка PM2..."
npm install -g pm2
pm2 --version
log_success "PM2 установлен"

# 6. Установка Nginx
log_info "Шаг 6/10: Установка Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx
log_success "Nginx установлен и запущен"

# 7. Установка Certbot для SSL
log_info "Шаг 7/10: Установка Certbot..."
apt install -y certbot python3-certbot-nginx
log_success "Certbot установлен"

# 8. Настройка Firewall
log_info "Шаг 8/10: Настройка Firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
log_success "Firewall настроен"

# 9. Клонирование проекта
log_info "Шаг 9/10: Клонирование проекта..."
cd /var/www
if [ -d "duo" ]; then
    log_info "Директория duo уже существует, обновляем..."
    cd duo
    git pull
else
    git clone https://github.com/Pacific1a/repomain.git duo
    cd duo
fi
log_success "Проект клонирован"

# 10. Установка зависимостей Node.js
log_info "Шаг 10/10: Установка зависимостей..."
cd /var/www/duo/site/server
npm install
log_success "Зависимости Node.js установлены"

# 11. Установка зависимостей Python (с виртуальным окружением)
log_info "Создание виртуального окружения для Python..."
cd /var/www/duo/bot/autoshop
python3 -m venv venv
log_success "Виртуальное окружение создано"

log_info "Установка зависимостей Python..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
log_success "Зависимости Python установлены"

# 12. Создание директории для базы данных
log_info "Создание директории для базы данных..."
mkdir -p /var/www/duo/site/server/data
chmod 755 /var/www/duo/site/server/data
log_success "Директория для БД создана"

# 13. Создание .env файла для сайта
log_info "Создание .env файла..."
cat > /var/www/duo/site/server/.env << 'EOL'
PORT=3000
JWT_SECRET=duo-partners-secret-key-change-in-production-2024
DATABASE_PATH=/var/www/duo/site/server/data/database.db
PARTNER_API_SECRET=e1e6547a80623ab936abfe561a8a0871
SITE_URL=http://77.239.125.70
NODE_ENV=production
EOL
log_success ".env файл создан"

# 14. Создание .env файла для бота
log_info "Создание .env файла для бота..."
cat > /var/www/duo/bot/autoshop/.env << 'EOL'
SERVER_URL=http://77.239.125.70
PARTNER_API_SECRET=e1e6547a80623ab936abfe561a8a0871
EOL
log_success ".env файл для бота создан"

# 15. Настройка Nginx
log_info "Настройка Nginx..."
cat > /etc/nginx/sites-available/duo-partner << 'EOL'
server {
    listen 80;
    server_name 77.239.125.70;

    # Логи
    access_log /var/log/nginx/duo-partner-access.log;
    error_log /var/log/nginx/duo-partner-error.log;

    # API и backend
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

    # Статические файлы
    location / {
        root /var/www/duo/site;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Загрузки
    location /uploads/ {
        alias /var/www/duo/site/uploads/;
    }
}
EOL

# Активируем конфиг
ln -sf /etc/nginx/sites-available/duo-partner /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
log_success "Nginx настроен"

# 16. Инициализация базы данных
log_info "Инициализация базы данных..."
cd /var/www/duo/site/server
log_success "База данных будет создана при первом запуске"

# 17. Запуск сайта через PM2
log_info "Запуск сайта через PM2..."
cd /var/www/duo/site/server
pm2 start server.js --name duo-partner
pm2 save
pm2 startup systemd -u root --hp /root
log_success "Сайт запущен"

# 18. Запуск Python бота через PM2 (с виртуальным окружением)
log_info "Запуск Python бота через PM2..."
cd /var/www/duo/bot/autoshop
pm2 start "venv/bin/python bot.py" --name duo-bot
pm2 save
log_success "Бот запущен"

# 19. Финальная проверка
log_info "Финальная проверка..."
pm2 status
log_success "Проверка завершена"

echo ""
echo "======================================="
echo "✅ УСТАНОВКА ЗАВЕРШЕНА!"
echo "======================================="
echo ""
echo "📊 Статус сервисов:"
pm2 list
echo ""
echo "🌐 Сайт доступен по адресу:"
echo "   http://77.239.125.70"
echo ""
echo "📝 Следующие шаги:"
echo "1. Создать админа: cd /var/www/duo/site/server && node create-admin.js"
echo "2. Проверить логи: pm2 logs"
echo "3. Перезапустить: pm2 restart all"
echo ""
echo "🔐 Для просмотра логов:"
echo "   pm2 logs duo-partner  # Логи сайта"
echo "   pm2 logs duo-bot      # Логи бота"
echo ""
echo "======================================="
