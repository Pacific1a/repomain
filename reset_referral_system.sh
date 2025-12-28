#!/bin/bash
# Скрипт для сброса реферальной системы

echo "========================================="
echo "СБРОС РЕФЕРАЛЬНОЙ СИСТЕМЫ"
echo "========================================="
echo ""

# 1. Останавливаем серверы
echo "[1/6] Останавливаем серверы..."
pm2 stop duo-casino duo-partner

# 2. Чиним JSON файлы
echo "[2/6] Чиним JSON файлы..."
echo "{}" > /var/www/duo/bot/server/data/referral-links.json
echo "{}" > /var/www/duo/bot/server/data/deposit-history.json

# 3. Сбрасываем БД партнёрского сайта
echo "[3/6] Сбрасываем статистику партнёров..."
sqlite3 /var/www/duo/site/server/database.db <<EOF
-- Обнуляем статистику партнёров
UPDATE referral_stats SET 
  clicks = 0,
  referrals = 0,
  earnings = 0,
  deposits = 0
WHERE user_id != 1;

-- Удаляем все рефералы
DELETE FROM referrals WHERE partner_id != 1;

-- Удаляем события timeline
DELETE FROM referral_events WHERE partner_id != 1;

-- Показываем результат
SELECT 'Партнёров:', COUNT(*) FROM referral_stats;
SELECT 'Рефералов:', COUNT(*) FROM referrals;
SELECT 'Событий:', COUNT(*) FROM referral_events;
EOF

# 4. Проверяем .env
echo "[4/6] Проверяем .env..."
if grep -q "PARTNER_SITE_URL" /var/www/duo/bot/.env; then
    echo "✅ PARTNER_SITE_URL найден"
    grep "PARTNER_SITE_URL" /var/www/duo/bot/.env
else
    echo "❌ PARTNER_SITE_URL НЕ НАЙДЕН! Добавляю..."
    echo "PARTNER_SITE_URL=http://localhost:3000" >> /var/www/duo/bot/.env
fi

# 5. Запускаем серверы
echo "[5/6] Запускаем серверы..."
pm2 start duo-casino duo-partner

# 6. Проверяем логи
echo "[6/6] Проверяем логи..."
sleep 2
pm2 logs duo-casino --lines 10 --nostream

echo ""
echo "========================================="
echo "✅ ГОТОВО!"
echo "========================================="
echo ""
echo "Проверь:"
echo "1. Логи: pm2 logs duo-casino"
echo "2. Статистику: sqlite3 /var/www/duo/site/server/database.db 'SELECT * FROM referral_stats;'"
echo "3. JSON файлы: cat /var/www/duo/bot/server/data/referral-links.json"
