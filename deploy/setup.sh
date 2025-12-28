#!/bin/bash

# ============================================
# DUO UNIFIED SERVER - SETUP SCRIPT
# Full installation on remote server
# ============================================

set -e  # Exit on error

echo "========================================="
echo "🚀 DUO UNIFIED SERVER - SETUP"
echo "========================================="
echo ""

# ============================================
# 1. SYSTEM UPDATE
# ============================================

echo "📦 Updating system packages..."
apt update && apt upgrade -y

# ============================================
# 2. INSTALL DEPENDENCIES
# ============================================

echo "📦 Installing system dependencies..."
apt install -y curl wget git build-essential software-properties-common ufw nginx

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Python 3
echo "📦 Installing Python 3..."
apt install -y python3 python3-pip python3-venv python3-full

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# ============================================
# 3. CONFIGURE FIREWALL
# ============================================

echo "🔥 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ============================================
# 4. SETUP PROJECT DIRECTORY
# ============================================

echo "📁 Setting up project directory..."
cd /var/www
if [ -d "duo" ]; then
    echo "⚠️  Directory /var/www/duo already exists"
    read -p "Do you want to remove it and start fresh? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf duo
        git clone https://github.com/Pacific1a/repomain.git duo
    fi
else
    git clone https://github.com/Pacific1a/repomain.git duo
fi

cd /var/www/duo

# ============================================
# 5. INSTALL NODE.JS DEPENDENCIES
# ============================================

echo "📦 Installing Node.js dependencies..."
cd /var/www/duo/server
npm install

# ============================================
# 6. SETUP PYTHON BOT
# ============================================

echo "📦 Setting up Python bot..."
cd /var/www/duo/bot/autoshop

# Create virtual environment
python3 -m venv venv

# Activate and install dependencies
source venv/bin/activate
pip install --upgrade pip
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
fi
deactivate

# ============================================
# 7. CONFIGURE ENVIRONMENT VARIABLES
# ============================================

echo "📝 Configuring environment variables..."

# Server .env
cat > /var/www/duo/server/.env << 'EOL'
PORT=3000
NODE_ENV=production
JWT_SECRET=duo-super-secret-jwt-key-change-in-production-2024
PARTNER_API_SECRET=e1e6547a80623ab936abfe561a8a0871
DATABASE_PATH=./data/database.db
SITE_URL=http://77.239.125.70
BOT_USERNAME=aasasdasdadsddasdbot
EOL

echo "✅ Server .env created"

# Bot .env
cat > /var/www/duo/bot/autoshop/.env << 'EOL'
SERVER_URL=http://77.239.125.70:3000
PARTNER_API_SECRET=e1e6547a80623ab936abfe561a8a0871
EOL

echo "✅ Bot .env created"

# ============================================
# 8. CONFIGURE NGINX
# ============================================

echo "⚙️  Configuring Nginx..."

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

# Enable site
ln -sf /etc/nginx/sites-available/duo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx

echo "✅ Nginx configured"

# ============================================
# 9. START SERVICES WITH PM2
# ============================================

echo "🚀 Starting services with PM2..."

# Stop any existing processes
pm2 stop all || true
pm2 delete all || true

# Start Node.js server
cd /var/www/duo/server
pm2 start server.js --name duo-server

# Start Python bot
cd /var/www/duo/bot/autoshop
pm2 start "venv/bin/python main.py" --name duo-bot

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root

echo "✅ Services started"

# ============================================
# 10. VERIFY INSTALLATION
# ============================================

echo ""
echo "========================================="
echo "✅ INSTALLATION COMPLETE"
echo "========================================="
echo ""
echo "📊 Service status:"
pm2 status
echo ""
echo "🌐 URLs:"
echo "   - Partner Site: http://77.239.125.70/"
echo "   - Bot Miniapp: http://77.239.125.70/bot/"
echo "   - API: http://77.239.125.70/api/"
echo "   - Health: http://77.239.125.70/health"
echo ""
echo "📝 Logs:"
echo "   - Server: pm2 logs duo-server"
echo "   - Bot: pm2 logs duo-bot"
echo ""
echo "========================================="
