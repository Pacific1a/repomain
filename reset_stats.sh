#!/bin/bash

# Скрипт для сброса реферальной статистики

echo "⚠️  СБРОС РЕФЕРАЛЬНОЙ СТАТИСТИКИ"
echo "================================"
echo ""
echo "Этот скрипт удалит:"
echo "- Все события из referral_events"
echo "- Все записи из referrals"
echo "- Сбросит счётчики в referral_stats (НЕ удалит реферальные коды!)"
echo ""
read -p "Продолжить? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Отменено"
    exit 1
fi

# Путь к базе данных
DB_PATH="/var/www/duo/site/server/data/database.db"

echo "📁 База данных: $DB_PATH"
echo ""

# Создаём бэкап
BACKUP_FILE="database_backup_$(date +%Y%m%d_%H%M%S).db"
echo "💾 Создаём бэкап: $BACKUP_FILE"
cp "$DB_PATH" "/var/www/duo/site/server/data/$BACKUP_FILE"
echo "✅ Бэкап создан"
echo ""

# Сброс статистики
echo "🗑️  Удаляем данные..."
sqlite3 "$DB_PATH" << EOF
-- Удаляем все события
DELETE FROM referral_events;

-- Удаляем все связи реферал-партнёр
DELETE FROM referrals;

-- Сбрасываем счётчики (НЕ удаляем коды!)
UPDATE referral_stats 
SET clicks = 0,
    first_deposits = 0,
    deposits = 0,
    total_deposits = 0,
    earnings = 0;

-- Показываем результат
SELECT 'referral_events: ' || COUNT(*) as count FROM referral_events;
SELECT 'referrals: ' || COUNT(*) as count FROM referrals;
SELECT 'referral_stats (коды сохранены): ' || COUNT(*) as count FROM referral_stats;
EOF

echo ""
echo "✅ СБРОС ЗАВЕРШЁН"
echo ""
echo "📊 Проверка:"
echo "- referral_events: должно быть 0"
echo "- referrals: должно быть 0"
echo "- referral_stats: коды сохранены, счётчики = 0"
echo ""
echo "🔄 Перезапусти сервисы:"
echo "   pm2 restart all"
echo ""
echo "💾 Бэкап сохранён: /var/www/duo/site/server/data/$BACKUP_FILE"
