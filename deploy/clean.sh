#!/bin/bash

# ============================================
# DUO - CLEAN OLD INSTALLATION
# Remove old servers and processes
# ============================================

set -e

echo "========================================="
echo "🧹 CLEANING OLD INSTALLATION"
echo "========================================="
echo ""

# ============================================
# 1. STOP ALL PM2 PROCESSES
# ============================================

echo "⏹️  Stopping PM2 processes..."
pm2 stop all || true
pm2 delete all || true
pm2 kill || true

echo "✅ PM2 processes stopped"

# ============================================
# 2. KILL ANY PROCESSES ON PORT 3000
# ============================================

echo "🔍 Checking for processes on port 3000..."
lsof -ti:3000 | xargs kill -9 || true

echo "✅ Port 3000 cleared"

# ============================================
# 3. REMOVE OLD SERVER DIRECTORIES
# ============================================

echo "📂 Cleaning old files..."

# Remove old unified-server.js if exists
if [ -f "/var/www/duo/unified-server.js" ]; then
    rm -f /var/www/duo/unified-server.js
    echo "✅ Removed unified-server.js"
fi

# Remove old site/server if exists
if [ -d "/var/www/duo/site/server" ]; then
    echo "⚠️  Found old site/server directory"
    read -p "Remove it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf /var/www/duo/site/server
        echo "✅ Removed site/server"
    fi
fi

# Remove old bot/server if exists
if [ -d "/var/www/duo/bot/server" ]; then
    echo "⚠️  Found old bot/server directory"
    read -p "Remove it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf /var/www/duo/bot/server
        echo "✅ Removed bot/server"
    fi
fi

# ============================================
# 4. CLEAN PM2 LOGS
# ============================================

echo "🗑️  Cleaning PM2 logs..."
pm2 flush || true

echo "✅ PM2 logs cleaned"

# ============================================
# 5. VERIFY CLEANUP
# ============================================

echo ""
echo "========================================="
echo "✅ CLEANUP COMPLETE"
echo "========================================="
echo ""
echo "📊 Current state:"
echo "   - PM2 processes: $(pm2 list | grep -c 'online' || echo '0')"
echo "   - Port 3000: $(lsof -ti:3000 | wc -l || echo '0') processes"
echo ""
echo "Ready for fresh installation!"
echo ""
