#!/usr/bin/env node
// ==========================================
// ОЧИСТКА РЕФЕРАЛОВ ДЛЯ ТЕСТА
// ==========================================
// Удаляет всех рефералов конкретного партнёра
// Сбрасывает earnings на 0

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// УКАЖИТЕ ID ПАРТНЁРА
const PARTNER_ID = '7781554906';

const dbPath = path.join(__dirname, 'data', 'database.db');

console.log('\n🧹 ОЧИСТКА РЕФЕРАЛОВ ДЛЯ ТЕСТА');
console.log('==========================================');
console.log(`👤 Partner ID: ${PARTNER_ID}`);
console.log(`📂 Database: ${dbPath}\n`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err);
        process.exit(1);
    }
});

db.serialize(() => {
    console.log('📊 СОСТОЯНИЕ ДО ОЧИСТКИ:');
    console.log('------------------------------------------');
    
    // Показываем текущее состояние
    db.get('SELECT * FROM referral_stats WHERE user_id = ?', [PARTNER_ID], (err, stats) => {
        if (err) {
            console.error('❌ Error:', err);
        } else if (stats) {
            console.log(`   Партнёр ${PARTNER_ID}:`);
            console.log(`   - Earnings: ${stats.earnings}₽`);
            console.log(`   - Total deposits: ${stats.total_deposits}₽`);
            console.log(`   - Clicks: ${stats.clicks}`);
        } else {
            console.log(`   Партнёр ${PARTNER_ID} не найден в БД`);
        }
    });
    
    db.all('SELECT * FROM referrals WHERE partner_id = ?', [PARTNER_ID], (err, referrals) => {
        if (err) {
            console.error('❌ Error:', err);
        } else {
            console.log(`   Рефералов: ${referrals.length}`);
            referrals.forEach(ref => {
                console.log(`      - ${ref.referral_user_id}: deposited=${ref.total_deposits}₽, earnings=${ref.total_earnings}₽`);
            });
        }
        
        console.log('------------------------------------------\n');
        
        setTimeout(() => {
            cleanData();
        }, 1000);
    });
});

function cleanData() {
    console.log('🗑️  НАЧИНАЕМ ОЧИСТКУ...\n');
    
    db.serialize(() => {
        // 1. Удаляем всех рефералов
        console.log('1️⃣  Удаляем рефералов...');
        db.run('DELETE FROM referrals WHERE partner_id = ?', [PARTNER_ID], (err) => {
            if (err) {
                console.error('   ❌ Error:', err.message);
            } else {
                console.log('   ✅ Рефералы удалены');
            }
        });
        
        // 2. Удаляем события
        console.log('2️⃣  Удаляем события...');
        db.run('DELETE FROM referral_events WHERE partner_id = ?', [PARTNER_ID], (err) => {
            if (err) {
                console.error('   ❌ Error:', err.message);
            } else {
                console.log('   ✅ События удалены');
            }
        });
        
        // 3. Сбрасываем статистику
        console.log('3️⃣  Сбрасываем статистику...');
        db.run(
            `UPDATE referral_stats SET 
                clicks = 0,
                first_deposits = 0, 
                deposits = 0,
                total_deposits = 0,
                earnings = 0
            WHERE user_id = ?`,
            [PARTNER_ID],
            (err) => {
                if (err) {
                    console.error('   ❌ Error:', err.message);
                } else {
                    console.log('   ✅ Статистика сброшена');
                }
                
                setTimeout(() => {
                    verifyClean();
                }, 500);
            }
        );
    });
}

function verifyClean() {
    console.log('\n📊 СОСТОЯНИЕ ПОСЛЕ ОЧИСТКИ:');
    console.log('------------------------------------------');
    
    db.get('SELECT * FROM referral_stats WHERE user_id = ?', [PARTNER_ID], (err, stats) => {
        if (err) {
            console.error('❌ Error:', err);
        } else if (stats) {
            console.log(`   Партнёр ${PARTNER_ID}:`);
            console.log(`   - Earnings: ${stats.earnings}₽`);
            console.log(`   - Total deposits: ${stats.total_deposits}₽`);
            console.log(`   - Clicks: ${stats.clicks}`);
        }
    });
    
    db.get('SELECT COUNT(*) as count FROM referrals WHERE partner_id = ?', [PARTNER_ID], (err, row) => {
        if (err) {
            console.error('❌ Error:', err);
        } else {
            console.log(`   Рефералов: ${row.count}`);
        }
        console.log('------------------------------------------\n');
        
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err);
            } else {
                console.log('✅ РЕФЕРАЛЫ ОЧИЩЕНЫ!');
                console.log('🎯 Готово к свежему тестированию!\n');
                console.log('💡 Теперь можно:');
                console.log('   1. Создать новую реферальную ссылку');
                console.log('   2. Пригласить реферала');
                console.log('   3. node test-deposit-10-percent.js');
                console.log('   4. Протестировать вывод средств\n');
                process.exit(0);
            }
        });
    });
}
