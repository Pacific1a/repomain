/**
 * CLEAR ALL USERS SCRIPT
 * Очистка всех пользователей и связанных данных
 * 
 * ВНИМАНИЕ: Удаляет ВСЕ данные!
 * - Все пользователи
 * - Все реферальные данные
 * - Все субпартнёрские связи
 * - Всю статистику
 * 
 * База станет пустой (как после первого запуска)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const readline = require('readline');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'database.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err);
        process.exit(1);
    }
    console.log('✅ Подключено к БД:', DB_PATH);
});

// Promisify
function runAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function getAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Подтверждение от пользователя
function askConfirmation(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
    });
}

async function clearAllUsers() {
    try {
        console.log('\n⚠️  ВНИМАНИЕ! ⚠️');
        console.log('============================================');
        console.log('Эта операция ПОЛНОСТЬЮ ОЧИСТИТ базу данных:');
        console.log('');
        console.log('❌ ВСЕ пользователи будут удалены');
        console.log('❌ ВСЯ реферальная статистика');
        console.log('❌ ВСЕ субпартнёрские связи');
        console.log('❌ ВСЯ история событий');
        console.log('');
        console.log('База данных станет ПУСТОЙ!');
        console.log('============================================\n');
        
        // Показываем сколько данных будет удалено
        const usersCount = await getAsync('SELECT COUNT(*) as count FROM users');
        const referralsCount = await getAsync('SELECT COUNT(*) as count FROM referrals');
        const subPartnersCount = await getAsync('SELECT COUNT(*) as count FROM sub_partners');
        
        console.log('📊 Текущие данные в БД:');
        console.log(`   - Пользователей: ${usersCount.count}`);
        console.log(`   - Рефералов: ${referralsCount.count}`);
        console.log(`   - Субпартнёрских связей: ${subPartnersCount.count}`);
        console.log('');
        
        // Запрашиваем подтверждение
        const confirmed = await askConfirmation('⚠️  Вы уверены? Введите "yes" для подтверждения: ');
        
        if (!confirmed) {
            console.log('\n❌ Операция отменена');
            process.exit(0);
        }
        
        console.log('\n🔥 Начинаем очистку...\n');
        
        // Удаляем всё по порядку (из-за внешних ключей)
        
        console.log('1️⃣ Удаление событий субпартнёров...');
        await runAsync('DELETE FROM sub_partner_events');
        console.log('   ✅ Удалено');
        
        console.log('2️⃣ Удаление субпартнёрских связей...');
        await runAsync('DELETE FROM sub_partners');
        console.log('   ✅ Удалено');
        
        console.log('3️⃣ Удаление событий рефералов...');
        await runAsync('DELETE FROM referral_events');
        console.log('   ✅ Удалено');
        
        console.log('4️⃣ Удаление рефералов...');
        await runAsync('DELETE FROM referrals');
        console.log('   ✅ Удалено');
        
        console.log('5️⃣ Удаление реферальной статистики...');
        await runAsync('DELETE FROM referral_stats');
        console.log('   ✅ Удалено');
        
        console.log('6️⃣ Удаление пользователей...');
        await runAsync('DELETE FROM users');
        console.log('   ✅ Удалено');
        
        // Сбрасываем автоинкременты
        console.log('7️⃣ Сброс счётчиков...');
        await runAsync('DELETE FROM sqlite_sequence WHERE name="users"');
        await runAsync('DELETE FROM sqlite_sequence WHERE name="referral_stats"');
        await runAsync('DELETE FROM sqlite_sequence WHERE name="referrals"');
        await runAsync('DELETE FROM sqlite_sequence WHERE name="referral_events"');
        await runAsync('DELETE FROM sqlite_sequence WHERE name="sub_partners"');
        await runAsync('DELETE FROM sqlite_sequence WHERE name="sub_partner_events"');
        console.log('   ✅ Счётчики сброшены');
        
        // Проверяем результат
        const finalCount = await getAsync('SELECT COUNT(*) as count FROM users');
        
        console.log('\n✅ ОЧИСТКА ЗАВЕРШЕНА!\n');
        console.log('📊 Результат:');
        console.log(`   - Пользователей в БД: ${finalCount.count}`);
        console.log('');
        console.log('💡 База данных теперь пустая.');
        console.log('💡 Следующий пользователь получит ID = 1');
        console.log('');
        
    } catch (error) {
        console.error('\n❌ Ошибка при очистке:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

clearAllUsers();
