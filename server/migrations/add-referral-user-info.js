/**
 * MIGRATION: Add nickname and photo_url columns to referrals table
 * 
 * Добавляет колонки для хранения информации о приглашенных пользователях:
 * - nickname: никнейм пользователя из Telegram
 * - photo_url: URL аватарки пользователя
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../data/database.db');

function promisifyDb(db) {
    return {
        run: (sql, params = []) => {
            return new Promise((resolve, reject) => {
                db.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });
        },
        all: (sql, params = []) => {
            return new Promise((resolve, reject) => {
                db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        }
    };
}

async function migrate() {
    const db = new sqlite3.Database(DB_PATH);
    const dbAsync = promisifyDb(db);
    
    try {
        console.log('');
        console.log('='.repeat(60));
        console.log('🔧 MIGRATION: Add referral user info columns');
        console.log('='.repeat(60));
        console.log('');
        
        // Проверить существующую структуру
        console.log('📊 Checking current table structure...');
        const columns = await dbAsync.all('PRAGMA table_info(referrals)');
        const columnNames = columns.map(col => col.name);
        console.log(`   Existing columns: ${columnNames.join(', ')}`);
        
        // Добавить nickname если нет
        if (!columnNames.includes('nickname')) {
            console.log('➕ Adding column: nickname');
            await dbAsync.run('ALTER TABLE referrals ADD COLUMN nickname TEXT DEFAULT NULL');
            console.log('   ✅ Column "nickname" added');
        } else {
            console.log('   ℹ️  Column "nickname" already exists');
        }
        
        // Добавить photo_url если нет
        if (!columnNames.includes('photo_url')) {
            console.log('➕ Adding column: photo_url');
            await dbAsync.run('ALTER TABLE referrals ADD COLUMN photo_url TEXT DEFAULT NULL');
            console.log('   ✅ Column "photo_url" added');
        } else {
            console.log('   ℹ️  Column "photo_url" already exists');
        }
        
        // Проверить результат
        console.log('');
        console.log('📊 Verifying changes...');
        const columnsAfter = await dbAsync.all('PRAGMA table_info(referrals)');
        const columnNamesAfter = columnsAfter.map(col => col.name);
        console.log(`   Updated columns: ${columnNamesAfter.join(', ')}`);
        
        console.log('');
        console.log('='.repeat(60));
        console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(60));
        console.log('');
        
    } catch (error) {
        console.error('');
        console.error('='.repeat(60));
        console.error('❌ MIGRATION FAILED:', error.message);
        console.error('='.repeat(60));
        console.error('');
        throw error;
    } finally {
        db.close();
    }
}

// Запуск если файл выполняется напрямую
if (require.main === module) {
    migrate()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { migrate };
