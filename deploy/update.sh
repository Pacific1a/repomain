#!/bin/bash

# ============================================
# DUO - UPDATE CODE
# Pull latest code from Git and restart services
# ============================================

set -e

echo "========================================="
echo "🔄 UPDATING DUO"
echo "========================================="
echo ""

# ============================================
# 1. PULL LATEST CODE
# ============================================

echo "📥 Pulling latest code from Git..."
cd /var/www/duo
git stash || true
git pull origin main
git stash pop || true

echo "✅ Code updated"

# ============================================
# 2. UPDATE DEPENDENCIES
# ============================================

echo "📦 Updating Node.js dependencies..."
cd /var/www/duo/server
npm install

echo "📦 Updating Python dependencies..."
cd /var/www/duo/bot/autoshop
source venv/bin/activate
pip install -r requirements.txt --upgrade
deactivate

echo "✅ Dependencies updated"

# ============================================
# 3. RESTART SERVICES
# ============================================

echo "🔄 Restarting services..."
pm2 restart all

echo "✅ Services restarted"

# ============================================
# 4. VERIFY STATUS
# ============================================

echo ""
echo "========================================="
echo "✅ UPDATE COMPLETE"
echo "========================================="
echo ""
pm2 status
echo ""
echo "📝 View logs:"
echo "   - Server: pm2 logs duo-server"
echo "   - Bot: pm2 logs duo-bot"
echo ""
