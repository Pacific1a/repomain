/**
 * Миграция: Добавление таблицы уведомлений о статусе заявок на вывод
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/database.db');

console.log('🔄 Начинаем миграцию: добавление таблицы withdrawal_notifications...\n');
console.log('📁 База данных:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к базе:', err.message);
        process.exit(1);
    }
    console.log('✅ Подключение к базе данных установлено\n');
});

function runSQL(sql) {
    return new Promise((resolve, reject) => {
        db.run(sql, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function getOne(sql) {
    return new Promise((resolve, reject) => {
        db.get(sql, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function migrate() {
    try {
        // Создаём таблицу уведомлений
        await runSQL(`
            CREATE TABLE IF NOT EXISTS withdrawal_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                request_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (request_id) REFERENCES withdrawal_requests(id) ON DELETE CASCADE
            );
        `);

        console.log('✅ Таблица withdrawal_notifications создана');

        // Индексы
        await runSQL(`CREATE INDEX IF NOT EXISTS idx_notif_user_id ON withdrawal_notifications(user_id);`);
        await runSQL(`CREATE INDEX IF NOT EXISTS idx_notif_is_read ON withdrawal_notifications(is_read);`);

        console.log('✅ Индексы созданы');

        const tableCheck = await getOne(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='withdrawal_notifications'
        `);

        if (tableCheck) {
            console.log('\n✅ Миграция успешно завершена!');
            console.log('\n📊 Структура таблицы:');
            console.log('   - id: ID уведомления');
            console.log('   - user_id: ID пользователя');
            console.log('   - request_id: ID заявки');
            console.log('   - status: approved/rejected');
            console.log('   - message: текст уведомления');
            console.log('   - is_read: прочитано (0/1)');
            console.log('   - created_at: дата создания\n');
        } else {
            throw new Error('Таблица не была создана!');
        }

    } catch (error) {
        console.error('❌ Ошибка миграции:', error.message);
        db.close();
        process.exit(1);
    }

    db.close((err) => {
        if (err) {
            console.error('❌ Ошибка закрытия БД:', err.message);
        } else {
            console.log('✅ Соединение с БД закрыто');
        }
        process.exit(0);
    });
}

migrate();
