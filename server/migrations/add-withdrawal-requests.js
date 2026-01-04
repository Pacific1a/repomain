/**
 * Миграция: Создание таблицы заявок на вывод средств
 * Система ручных выплат через Telegram бота
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database.db');
const db = new Database(dbPath);

console.log('🔄 Начинаем миграцию: добавление таблицы withdrawal_requests...\n');

try {
    // Создаём таблицу заявок на вывод
    db.exec(`
        CREATE TABLE IF NOT EXISTS withdrawal_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            
            -- Информация о пользователе
            email TEXT NOT NULL,
            telegram_username TEXT,
            
            -- Информация о выводе
            amount REAL NOT NULL,
            usdt_address TEXT NOT NULL,
            
            -- Статистика пользователя на момент заявки
            referrals_count INTEGER DEFAULT 0,
            total_earnings REAL DEFAULT 0,
            
            -- Статус заявки
            status TEXT DEFAULT 'pending', -- pending, approved, rejected
            
            -- Даты
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            processed_at DATETIME,
            processed_by TEXT, -- admin telegram username
            
            -- Telegram
            telegram_message_id INTEGER, -- ID сообщения в боте для обновления
            
            -- Комментарий админа
            admin_comment TEXT,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    console.log('✅ Таблица withdrawal_requests создана');

    // Индексы для быстрого поиска
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_withdrawal_user_id ON withdrawal_requests(user_id);
        CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON withdrawal_requests(status);
        CREATE INDEX IF NOT EXISTS idx_withdrawal_created_at ON withdrawal_requests(created_at DESC);
    `);

    console.log('✅ Индексы созданы');

    // Проверяем что таблица создана
    const tableCheck = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='withdrawal_requests'
    `).get();

    if (tableCheck) {
        console.log('\n✅ Миграция успешно завершена!');
        console.log('\n📊 Структура таблицы:');
        console.log('   - id: уникальный ID заявки');
        console.log('   - user_id: ID пользователя');
        console.log('   - email: email пользователя');
        console.log('   - telegram_username: @username из Telegram');
        console.log('   - amount: сумма вывода');
        console.log('   - usdt_address: USDT TRC20 адрес');
        console.log('   - referrals_count: сколько рефералов');
        console.log('   - total_earnings: сколько заработал');
        console.log('   - status: pending/approved/rejected');
        console.log('   - created_at: дата создания');
        console.log('   - processed_at: дата обработки');
        console.log('   - processed_by: кто обработал');
        console.log('   - telegram_message_id: ID сообщения в боте');
        console.log('   - admin_comment: комментарий админа\n');
    } else {
        throw new Error('Таблица не была создана!');
    }

} catch (error) {
    console.error('❌ Ошибка миграции:', error.message);
    process.exit(1);
} finally {
    db.close();
}
