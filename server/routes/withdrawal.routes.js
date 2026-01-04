/**
 * API для заявок на вывод средств
 * Ручная система выплат через Telegram бота
 */

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const axios = require('axios');

const dbPath = path.join(__dirname, '../database.db');

/**
 * POST /api/withdrawal/request
 * Создание заявки на вывод средств
 * После успешной 2FA верификации
 */
router.post('/request', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Требуется авторизация' 
            });
        }

        const { amount, usdtAddress } = req.body;

        // Валидация
        if (!amount || amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Укажите корректную сумму для вывода' 
            });
        }

        if (!usdtAddress || !usdtAddress.startsWith('T') || usdtAddress.length !== 34) {
            return res.status(400).json({ 
                success: false, 
                message: 'Некорректный USDT TRC20 адрес' 
            });
        }

        const db = new Database(dbPath);

        try {
            // Получаем информацию о пользователе
            const user = db.prepare(`
                SELECT 
                    u.id,
                    u.email,
                    u.telegram,
                    u.balance,
                    COALESCE(rs.earnings, 0) as earnings,
                    COALESCE(rs.referrals, 0) as referrals_count
                FROM users u
                LEFT JOIN referral_stats rs ON u.id = rs.user_id
                WHERE u.id = ?
            `).get(userId);

            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Пользователь не найден' 
                });
            }

            // Проверяем баланс
            if (user.balance < amount) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Недостаточно средств. Доступно: ${user.balance}₽` 
                });
            }

            // Проверяем минимальную сумму вывода (например 100₽)
            const MIN_WITHDRAWAL = 100;
            if (amount < MIN_WITHDRAWAL) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Минимальная сумма вывода: ${MIN_WITHDRAWAL}₽` 
                });
            }

            // Создаём заявку
            const insertRequest = db.prepare(`
                INSERT INTO withdrawal_requests (
                    user_id,
                    email,
                    telegram_username,
                    amount,
                    usdt_address,
                    referrals_count,
                    total_earnings,
                    status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
            `);

            const result = insertRequest.run(
                user.id,
                user.email,
                user.telegram,
                amount,
                usdtAddress,
                user.referrals_count,
                user.earnings
            );

            const requestId = result.lastInsertRowid;

            // Отправляем заявку в Telegram бота
            try {
                await sendToTelegramBot({
                    requestId,
                    userId: user.id,
                    email: user.email,
                    telegram: user.telegram,
                    amount,
                    usdtAddress,
                    referralsCount: user.referrals_count,
                    totalEarnings: user.earnings
                });
            } catch (botError) {
                console.error('Ошибка отправки в Telegram бота:', botError);
                // Не прерываем процесс - заявка создана, просто бот не получил
            }

            res.json({
                success: true,
                message: 'Заявка на вывод средств успешно создана. Ожидайте обработки администратором.',
                requestId,
                amount,
                status: 'pending'
            });

        } finally {
            db.close();
        }

    } catch (error) {
        console.error('Ошибка создания заявки на вывод:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера при создании заявки' 
        });
    }
});

/**
 * GET /api/withdrawal/history
 * История заявок пользователя
 */
router.get('/history', (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Требуется авторизация' 
            });
        }

        const db = new Database(dbPath);

        try {
            const requests = db.prepare(`
                SELECT 
                    id,
                    amount,
                    usdt_address,
                    status,
                    created_at,
                    processed_at,
                    admin_comment
                FROM withdrawal_requests
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 50
            `).all(userId);

            res.json({
                success: true,
                requests
            });

        } finally {
            db.close();
        }

    } catch (error) {
        console.error('Ошибка получения истории заявок:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

/**
 * Отправка заявки в Telegram бота
 */
async function sendToTelegramBot(data) {
    const BOT_API_URL = process.env.WITHDRAWAL_BOT_URL || 'http://localhost:3002/api/withdrawal';
    const BOT_SECRET = process.env.WITHDRAWAL_BOT_SECRET || 'your-secret-key-here';

    await axios.post(BOT_API_URL, data, {
        headers: {
            'X-Bot-Secret': BOT_SECRET,
            'Content-Type': 'application/json'
        },
        timeout: 5000
    });
}

module.exports = router;
