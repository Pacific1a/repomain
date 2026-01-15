// ==========================================
// ПОЛНАЯ ОЧИСТКА РЕФЕРАЛЬНОЙ СИСТЕМЫ
// ==========================================
// Очищает ВСЕ данные реферальной системы для свежего теста

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.db');

console.log('🧹 ПОЛНАЯ ОЧИСТКА РЕФЕРАЛЬНОЙ СИСТЕМЫ');
console.log('==========================================');
console.log(`📂 Database: ${dbPath}\n`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err);
        process.exit(1);
    }
    console.log('✅ Connected to database\n');
});

// Показываем текущее состояние ПЕРЕД очисткой
db.serialize(() => {
    console.log('📊 СОСТОЯНИЕ ДО ОЧИСТКИ:');
    console.log('------------------------------------------');
    
    db.get('SELECT COUNT(*) as count FROM referral_events', (err, row) => {
        if (err) console.error('❌ Error:', err);
        else console.log(`   referral_events: ${row.count} записей`);
    });
    
    db.get('SELECT COUNT(*) as count FROM referrals', (err, row) => {
        if (err) console.error('❌ Error:', err);
        else console.log(`   referrals: ${row.count} рефералов`);
    });
    
    db.get('SELECT COUNT(*) as count FROM referral_stats', (err, row) => {
        if (err) console.error('❌ Error:', err);
        else console.log(`   referral_stats: ${row.count} партнёров`);
    });
    
    db.get('SELECT COUNT(*) as count FROM sub_partners', (err, row) => {
        if (err) {
            // Таблица может не существовать
            console.log(`   sub_partners: таблица не найдена`);
        } else {
            console.log(`   sub_partners: ${row.count} субпартнёров`);
        }
    });
    
    db.get('SELECT COUNT(*) as count FROM sub_partner_events', (err, row) => {
        if (err) {
            console.log(`   sub_partner_events: таблица не найдена`);
        } else {
            console.log(`   sub_partner_events: ${row.count} событий`);
        }
    });
    
    console.log('------------------------------------------\n');
    
    // Ждём немного перед очисткой
    setTimeout(() => {
        console.log('🗑️  НАЧИНАЕМ ОЧИСТКУ...\n');
        clearAllData();
    }, 1000);
});

function clearAllData() {
    db.serialize(() => {
        // 1. Очистить события субпартнёров
        console.log('1️⃣  Clearing sub_partner_events...');
        db.run('DELETE FROM sub_partner_events', (err) => {
            if (err && !err.message.includes('no such table')) {
                console.error('   ❌ Error:', err.message);
            } else {
                console.log('   ✅ sub_partner_events cleared');
            }
        });
        
        // 2. Очистить субпартнёров
        console.log('2️⃣  Clearing sub_partners...');
        db.run('DELETE FROM sub_partners', (err) => {
            if (err && !err.message.includes('no such table')) {
                console.error('   ❌ Error:', err.message);
            } else {
                console.log('   ✅ sub_partners cleared');
            }
        });
        
        // 3. Очистить события рефералов
        console.log('3️⃣  Clearing referral_events...');
        db.run('DELETE FROM referral_events', (err) => {
            if (err) {
                console.error('   ❌ Error:', err.message);
            } else {
                console.log('   ✅ referral_events cleared');
            }
        });
        
        // 4. Очистить рефералов
        console.log('4️⃣  Clearing referrals...');
        db.run('DELETE FROM referrals', (err) => {
            if (err) {
                console.error('   ❌ Error:', err.message);
            } else {
                console.log('   ✅ referrals cleared');
            }
        });
        
        // 5. Сбросить статистику партнёров
        console.log('5️⃣  Resetting referral_stats...');
        db.run(`UPDATE referral_stats SET 
            clicks = 0, 
            first_deposits = 0, 
            deposits = 0, 
            total_deposits = 0, 
            earnings = 0,
            sub_partner_earnings = 0,
            total_losses = 0`, (err) => {
            if (err) {
                console.error('   ❌ Error:', err.message);
            } else {
                console.log('   ✅ referral_stats reset to 0');
            }
            
            // Проверяем результат
            setTimeout(() => {
                verifyCleanup();
            }, 500);
        });
    });
}

function verifyCleanup() {
    console.log('\n📊 СОСТОЯНИЕ ПОСЛЕ ОЧИСТКИ:');
    console.log('------------------------------------------');
    
    db.get('SELECT COUNT(*) as count FROM referral_events', (err, row) => {
        if (err) console.error('❌ Error:', err);
        else console.log(`   referral_events: ${row.count} записей`);
    });
    
    db.get('SELECT COUNT(*) as count FROM referrals', (err, row) => {
        if (err) console.error('❌ Error:', err);
        else console.log(`   referrals: ${row.count} рефералов`);
    });
    
    db.get('SELECT COUNT(*) as count FROM sub_partners', (err, row) => {
        if (err && !err.message.includes('no such table')) {
            console.error('❌ Error:', err);
        } else if (err) {
            console.log(`   sub_partners: таблица не найдена`);
        } else {
            console.log(`   sub_partners: ${row.count} субпартнёров`);
        }
    });
    
    db.get('SELECT COUNT(*) as count FROM sub_partner_events', (err, row) => {
        if (err && !err.message.includes('no such table')) {
            console.error('❌ Error:', err);
        } else if (err) {
            console.log(`   sub_partner_events: таблица не найдена`);
        } else {
            console.log(`   sub_partner_events: ${row.count} событий`);
        }
    });
    
    db.all('SELECT user_id, clicks, earnings, sub_partner_earnings FROM referral_stats', (err, stats) => {
        if (err) {
            console.error('❌ Error checking stats:', err);
        } else {
            console.log(`   referral_stats: ${stats.length} партнёров:`);
            stats.forEach(s => {
                console.log(`      Partner #${s.user_id}: ${s.clicks} clicks, ${s.earnings}₽ earnings, ${s.sub_partner_earnings || 0}₽ sub-earnings`);
            });
        }
        console.log('------------------------------------------\n');
        
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err);
            } else {
                console.log('✅ ВСЕ РЕФЕРАЛЬНЫЕ ДАННЫЕ ОЧИЩЕНЫ!');
                console.log('🎯 Готово к свежему тестированию!');
                console.log('\n💡 Теперь можно:');
                console.log('   1. Создать новую реферальную ссылку');
                console.log('   2. Пригласить реферала');
                console.log('   3. Проверить начисление 10%');
                process.exit(0);
            }
        });
    });
}
