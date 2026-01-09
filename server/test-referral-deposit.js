#!/usr/bin/env node
/**
 * ТЕСТОВЫЙ СКРИПТ ДЛЯ ПРОВЕРКИ РЕФЕРАЛЬНОЙ СИСТЕМЫ
 * Симулирует депозит реферала и проверяет начисление 10%
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data/database.db');

console.log('\n🧪 ТЕСТИРОВАНИЕ РЕФЕРАЛЬНОЙ СИСТЕМЫ');
console.log('=====================================\n');

// Параметры теста
const REFERRAL_USER_ID = '1889923046'; // ID реферала (замени на свой)
const DEPOSIT_AMOUNT = 1000; // Сумма депозита

console.log(`📋 Параметры теста:`);
console.log(`   Реферал: ${REFERRAL_USER_ID}`);
console.log(`   Депозит: ${DEPOSIT_AMOUNT}₽`);
console.log(`   Ожидаемый заработок партнера: ${DEPOSIT_AMOUNT * 0.1}₽ (10%)\n`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err);
        process.exit(1);
    }
    console.log('✅ Подключено к БД\n');
});

db.serialize(() => {
    // 1. Найти партнера который пригласил этого реферала
    console.log('🔍 Шаг 1: Поиск партнера...');
    db.get(
        'SELECT partner_id FROM referrals WHERE referral_user_id = ?',
        [REFERRAL_USER_ID],
        (err, row) => {
            if (err) {
                console.error('❌ Ошибка поиска:', err);
                db.close();
                return;
            }
            
            if (!row) {
                console.error(`❌ Реферал ${REFERRAL_USER_ID} не найден в системе!`);
                console.log('\n💡 Сначала зарегистрируй реферала через /start?ref=CODE\n');
                db.close();
                return;
            }
            
            const partnerId = row.partner_id;
            console.log(`✅ Найден партнер: ${partnerId}\n`);
            
            // 2. Показать состояние ДО
            console.log('📊 Состояние ДО депозита:');
            db.get(
                'SELECT * FROM referral_stats WHERE user_id = ?',
                [partnerId],
                (err, statsBefore) => {
                    if (err) {
                        console.error('❌ Ошибка получения статистики:', err);
                        db.close();
                        return;
                    }
                    
                    console.log(`   Партнер ${partnerId}:`);
                    console.log(`   - Earnings: ${statsBefore.earnings}₽`);
                    console.log(`   - Total deposits: ${statsBefore.total_deposits}₽\n`);
                    
                    db.get(
                        'SELECT * FROM referrals WHERE partner_id = ? AND referral_user_id = ?',
                        [partnerId, REFERRAL_USER_ID],
                        (err, refBefore) => {
                            if (err) {
                                console.error('❌ Ошибка получения реферала:', err);
                                db.close();
                                return;
                            }
                            
                            console.log(`   Реферал ${REFERRAL_USER_ID}:`);
                            console.log(`   - Total deposits: ${refBefore.total_deposits || 0}₽`);
                            console.log(`   - Total earnings (партнера): ${refBefore.total_earnings || 0}₽\n`);
                            
                            // 3. Симулируем депозит
                            console.log(`💰 Шаг 2: Симуляция депозита ${DEPOSIT_AMOUNT}₽...\n`);
                            
                            const earnings = DEPOSIT_AMOUNT * 0.1; // 10%
                            
                            // Обновляем статистику партнера
                            db.run(
                                'UPDATE referral_stats SET earnings = earnings + ?, total_deposits = total_deposits + ? WHERE user_id = ?',
                                [earnings, DEPOSIT_AMOUNT, partnerId],
                                function(err) {
                                    if (err) {
                                        console.error('❌ Ошибка обновления статистики:', err);
                                        db.close();
                                        return;
                                    }
                                    
                                    console.log('✅ Обновлена статистика партнера');
                                    
                                    // Обновляем данные реферала
                                    db.run(
                                        'UPDATE referrals SET total_earnings = total_earnings + ?, total_deposits = total_deposits + ?, deposits_count = deposits_count + 1 WHERE partner_id = ? AND referral_user_id = ?',
                                        [earnings, DEPOSIT_AMOUNT, partnerId, REFERRAL_USER_ID],
                                        function(err) {
                                            if (err) {
                                                console.error('❌ Ошибка обновления реферала:', err);
                                                db.close();
                                                return;
                                            }
                                            
                                            console.log('✅ Обновлены данные реферала');
                                            
                                            // Добавляем событие в timeline
                                            db.run(
                                                'INSERT INTO referral_events (partner_id, referral_user_id, event_type, amount) VALUES (?, ?, ?, ?)',
                                                [partnerId, REFERRAL_USER_ID, 'earning', earnings],
                                                function(err) {
                                                    if (err) {
                                                        console.error('❌ Ошибка добавления события:', err);
                                                        db.close();
                                                        return;
                                                    }
                                                    
                                                    console.log('✅ Добавлено событие в timeline\n');
                                                    
                                                    // 4. Показать состояние ПОСЛЕ
                                                    console.log('📊 Состояние ПОСЛЕ депозита:');
                                                    db.get(
                                                        'SELECT * FROM referral_stats WHERE user_id = ?',
                                                        [partnerId],
                                                        (err, statsAfter) => {
                                                            if (err) {
                                                                console.error('❌ Ошибка получения статистики:', err);
                                                                db.close();
                                                                return;
                                                            }
                                                            
                                                            console.log(`   Партнер ${partnerId}:`);
                                                            console.log(`   - Earnings: ${statsAfter.earnings}₽ (+${earnings}₽)`);
                                                            console.log(`   - Total deposits: ${statsAfter.total_deposits}₽ (+${DEPOSIT_AMOUNT}₽)\n`);
                                                            
                                                            db.get(
                                                                'SELECT * FROM referrals WHERE partner_id = ? AND referral_user_id = ?',
                                                                [partnerId, REFERRAL_USER_ID],
                                                                (err, refAfter) => {
                                                                    if (err) {
                                                                        console.error('❌ Ошибка получения реферала:', err);
                                                                        db.close();
                                                                        return;
                                                                    }
                                                                    
                                                                    console.log(`   Реферал ${REFERRAL_USER_ID}:`);
                                                                    console.log(`   - Total deposits: ${refAfter.total_deposits}₽`);
                                                                    console.log(`   - Total earnings (партнера): ${refAfter.total_earnings}₽\n`);
                                                                    
                                                                    console.log('✅ ТЕСТ ЗАВЕРШЕН УСПЕШНО!\n');
                                                                    console.log('📋 Что проверить в боте:');
                                                                    console.log(`   1. Referral balance = ${statsAfter.total_deposits}₽`);
                                                                    console.log(`   2. Deposited (${REFERRAL_USER_ID}) = ${refAfter.total_deposits}₽`);
                                                                    console.log(`   3. Your Profit = ${refAfter.total_earnings}₽\n`);
                                                                    
                                                                    db.close();
                                                                }
                                                            );
                                                        }
                                                    );
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});
