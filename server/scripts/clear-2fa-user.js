// ============================================
// СКРИПТ ДЛЯ ОЧИСТКИ 2FA ДЛЯ КОНКРЕТНОГО ПОЛЬЗОВАТЕЛЯ
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Получаем ID пользователя из аргументов командной строки
const userId = process.argv[2];

if (!userId) {
    console.error('❌ Usage: node clear-2fa-user.js <user_id>');
    console.error('   Example: node clear-2fa-user.js 4');
    process.exit(1);
}

// Используем тот же путь к БД что и в config/database.js
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'database.db');
console.log('📂 Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err);
        process.exit(1);
    }
    console.log('✅ Database connected');
});

console.log(`🧹 Clearing 2FA data for user ID: ${userId}\n`);

db.serialize(() => {
    // Сначала проверяем что пользователь существует
    db.get('SELECT id, login, two_factor_enabled FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error('❌ Error reading user:', err);
            db.close();
            process.exit(1);
        }
        
        if (!user) {
            console.error(`❌ User with ID ${userId} not found!`);
            db.close();
            process.exit(1);
        }
        
        console.log(`📋 Found user: ${user.login} (ID: ${user.id})`);
        console.log(`   Current 2FA status: ${user.two_factor_enabled ? 'ENABLED' : 'DISABLED'}`);
        
        // Очищаем 2FA данные
        db.run(`
            UPDATE users 
            SET two_factor_secret = NULL, 
                two_factor_enabled = 0
            WHERE id = ?
        `, [userId], function(err) {
            if (err) {
                console.error('❌ Error clearing 2FA data:', err);
                db.close();
                process.exit(1);
            }
            
            console.log('\n✅ 2FA data cleared successfully!');
            console.log('   - two_factor_secret: NULL');
            console.log('   - two_factor_enabled: 0');
            
            // Закрываем БД
            db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err);
                } else {
                    console.log('\n✅ Database connection closed');
                    console.log('✅ Cleanup completed!\n');
                }
            });
        });
    });
});
