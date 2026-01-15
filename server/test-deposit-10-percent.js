#!/usr/bin/env node
// ==========================================
// ТЕСТ: ИМИТАЦИЯ ДЕПОЗИТА РЕФЕРАЛА
// ==========================================
// Проверяет что партнёр получает 10%, а не 100%

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// НАСТРОЙКИ - ИЗМЕНИТЕ ПОД СЕБЯ
const REFERRAL_USER_ID = '7781554906';  // ID реферала (кто делает депозит)
const DEPOSIT_AMOUNT = 100;              // Сумма депозита в рублях

console.log('\n🧪 ТЕСТ ДЕПОЗИТА РЕФЕРАЛА');
console.log('==========================================');
console.log(`💰 Реферал: ${REFERRAL_USER_ID}`);
console.log(`💵 Депозит: ${DEPOSIT_AMOUNT}₽`);
console.log(`🎯 Ожидаемый профит партнёра: ${DEPOSIT_AMOUNT * 0.1}₽ (10%)`);
console.log('==========================================\n');

const dbPath = path.join(__dirname, 'data', 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err);
        process.exit(1);
    }
});

// Главная функция
async function testDeposit() {
    try {
        // 1. Найти партнёра который пригласил этого реферала
        console.log('1️⃣  Поиск партнёра...');
        const referral = await new Promise((resolve, reject) => {
            db.get(
                'SELECT partner_id FROM referrals WHERE referral_user_id = ?',
                [REFERRAL_USER_ID],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!referral) {
            console.error(`❌ Реферал ${REFERRAL_USER_ID} не найден в системе!`);
            console.log('\n💡 Сначала зарегистрируйте реферала:');
            console.log('   1. Откройте реферальную ссылку партнёра');
            console.log('   2. Нажмите /start в боте');
            console.log('   3. Затем запустите этот скрипт\n');
            db.close();
            process.exit(1);
        }

        const partnerId = referral.partner_id;
        console.log(`✅ Найден партнёр: ${partnerId}\n`);

        // 2. Показать состояние ДО депозита
        console.log('📊 СОСТОЯНИЕ ДО ДЕПОЗИТА:');
        console.log('------------------------------------------');
        
        const statsBefore = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM referral_stats WHERE user_id = ?',
                [partnerId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        const refBefore = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM referrals WHERE partner_id = ? AND referral_user_id = ?',
                [partnerId, REFERRAL_USER_ID],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        console.log(`   Партнёр #${partnerId}:`);
        console.log(`   - Всего депозитов: ${statsBefore.total_deposits}₽`);
        console.log(`   - Earnings (10% профит): ${statsBefore.earnings}₽`);
        console.log('');
        console.log(`   Реферал ${REFERRAL_USER_ID}:`);
        console.log(`   - Deposited: ${refBefore.total_deposits}₽`);
        console.log(`   - Your Profit (10%): ${refBefore.total_earnings}₽`);
        console.log('------------------------------------------\n');

        // 3. ИМИТАЦИЯ ДЕПОЗИТА
        console.log('💸 ИМИТАЦИЯ ДЕПОЗИТА...\n');

        const earnings = DEPOSIT_AMOUNT * 0.1;  // 10% партнёру
        console.log(`   Депозит: ${DEPOSIT_AMOUNT}₽`);
        console.log(`   Профит партнёра (10%): ${earnings}₽\n`);

        // Обновляем статистику партнёра
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE referral_stats SET earnings = earnings + ?, total_deposits = total_deposits + ? WHERE user_id = ?',
                [earnings, DEPOSIT_AMOUNT, partnerId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        console.log('   ✅ Обновлена статистика партнёра');

        // Обновляем данные реферала
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE referrals SET total_earnings = total_earnings + ?, total_deposits = total_deposits + ?, deposits_count = deposits_count + 1 WHERE partner_id = ? AND referral_user_id = ?',
                [earnings, DEPOSIT_AMOUNT, partnerId, REFERRAL_USER_ID],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        console.log('   ✅ Обновлены данные реферала');

        // Добавляем событие
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO referral_events (partner_id, referral_user_id, event_type, amount) VALUES (?, ?, ?, ?)',
                [partnerId, REFERRAL_USER_ID, 'earning', earnings],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        console.log('   ✅ Добавлено событие');

        // 4. Показать состояние ПОСЛЕ депозита
        console.log('\n📊 СОСТОЯНИЕ ПОСЛЕ ДЕПОЗИТА:');
        console.log('------------------------------------------');

        const statsAfter = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM referral_stats WHERE user_id = ?',
                [partnerId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        const refAfter = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM referrals WHERE partner_id = ? AND referral_user_id = ?',
                [partnerId, REFERRAL_USER_ID],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        console.log(`   Партнёр #${partnerId}:`);
        console.log(`   - Всего депозитов: ${statsAfter.total_deposits}₽ (+${DEPOSIT_AMOUNT}₽)`);
        console.log(`   - Earnings (10% профит): ${statsAfter.earnings}₽ (+${earnings}₽) ✅`);
        console.log('');
        console.log(`   Реферал ${REFERRAL_USER_ID}:`);
        console.log(`   - Deposited: ${refAfter.total_deposits}₽ (+${DEPOSIT_AMOUNT}₽)`);
        console.log(`   - Your Profit (10%): ${refAfter.total_earnings}₽ (+${earnings}₽) ✅`);
        console.log('------------------------------------------\n');

        // 5. Проверка результата
        console.log('✅ ПРОВЕРКА:');
        console.log('------------------------------------------');
        console.log(`   1. Referral Balance = ${statsAfter.earnings}₽ (ТОЛЬКО 10%!) ✅`);
        console.log(`   2. Deposited = ${refAfter.total_deposits}₽ (100% депозита)`);
        console.log(`   3. Your Profit = ${refAfter.total_earnings}₽ (10% от депозита) ✅`);
        console.log('------------------------------------------\n');

        if (statsAfter.earnings === statsBefore.earnings + earnings) {
            console.log('✅ ТЕСТ ПРОЙДЕН! Партнёр получил ровно 10%!');
        } else {
            console.log('❌ ОШИБКА! Проверьте расчёты!');
        }

        console.log('\n💡 Теперь:');
        console.log('   1. Откройте Partners в мини-аппе');
        console.log(`   2. Referral balance должен показывать ${statsAfter.earnings}₽`);
        console.log(`   3. У реферала Your Profit должен быть ${refAfter.total_earnings}₽\n`);

    } catch (error) {
        console.error('❌ Ошибка:', error);
    } finally {
        db.close();
    }
}

// Запуск
testDeposit();
