// ============================================
// СКРИПТ ДЛЯ ПОЛНОЙ ОЧИСТКИ 2FA ДАННЫХ
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

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

console.log('🧹 Starting 2FA data cleanup...\n');

db.serialize(() => {
    // Очищаем 2FA данные для ВСЕХ пользователей
    db.run(`
        UPDATE users 
        SET two_factor_secret = NULL, 
            two_factor_enabled = 0
    `, function(err) {
        if (err) {
            console.error('❌ Error clearing 2FA data:', err);
            db.close();
            process.exit(1);
        }
        
        console.log('✅ 2FA data cleared successfully!');
        console.log(`📊 Rows updated: ${this.changes}`);
        console.log('\n🎯 All users now have:');
        console.log('   - two_factor_secret: NULL');
        console.log('   - two_factor_enabled: 0');
        
        // Проверяем результат
        db.all('SELECT id, login, two_factor_enabled, two_factor_secret FROM users', [], (err, rows) => {
            if (err) {
                console.error('❌ Error reading users:', err);
            } else {
                console.log('\n📋 Current users status:');
                rows.forEach(user => {
                    console.log(`   User ID ${user.id} (${user.login}): 2FA = ${user.two_factor_enabled ? 'ENABLED' : 'DISABLED'}, Secret = ${user.two_factor_secret ? 'EXISTS' : 'NULL'}`);
                });
            }
            
            // Закрываем БД
            db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err);
                } else {
                    console.log('\n✅ Database connection closed');
                    console.log('✅ Cleanup completed successfully!\n');
                }
            });
        });
    });
});
