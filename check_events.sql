-- Проверяем все события в referral_events
SELECT 
    id,
    partner_id,
    referral_user_id,
    event_type,
    amount,
    datetime(created_at, 'localtime') as created_at_local
FROM referral_events 
ORDER BY created_at DESC
LIMIT 20;

-- Проверяем события за последние 7 дней
SELECT 
    DATE(created_at) as date,
    event_type,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM referral_events
WHERE partner_id = 1 
  AND created_at >= datetime('now', '-7 days')
GROUP BY DATE(created_at), event_type
ORDER BY date DESC;

-- Проверяем общую статистику партнёра
SELECT * FROM referral_stats WHERE user_id = 1;
