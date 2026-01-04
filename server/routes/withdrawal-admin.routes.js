/**
 * API для обработки заявок админами (вызывается ботом)
 * Одобрение/отклонение заявок с обнулением баланса
 */

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

const BOT_SECRET = process.env.WITHDRAWAL_BOT_SECRET || 'your-secret-key-here';

/**
 * Middleware: проверка секрета бота
 */
function verifyBotSecret(req, res, next) {
    const secret = req.headers['x-bot-secret'];
    
    if (secret !== BOT_SECRET) {
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid bot secret' 
        });
    }
    
    next();
}

/**
 * POST /api/withdrawal/approve
 * Одобрение заявки - обнуляет баланс пользователя
 */
router.post('/approve', verifyBotSecret, async (req, res) => {
    try {
        const { requestId, adminName } = req.body;

        if (!requestId) {
            return res.status(400).json({ 
                success: false, 
                message: 'requestId required' 
            });
        }

        // Получаем заявку
        const request = await db.getAsync(`
            SELECT 
                wr.id,
                wr.user_id,
                wr.amount,
                wr.status,
                u.balance
            FROM withdrawal_requests wr
            JOIN users u ON wr.user_id = u.id
            WHERE wr.id = ?
        `, [requestId]);

        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: 'Заявка не найдена' 
            });
        }

        // Проверяем что заявка ещё не обработана
        if (request.status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                message: 'Заявка уже обработана' 
            });
        }

        // Обновляем статус заявки
        await db.runAsync(`
            UPDATE withdrawal_requests
            SET 
                status = 'approved',
                processed_at = CURRENT_TIMESTAMP,
                processed_by = ?
            WHERE id = ?
        `, [adminName, requestId]);

        // ОБНУЛЯЕМ баланс пользователя
        await db.runAsync(`
            UPDATE users
            SET balance = 0
            WHERE id = ?
        `, [request.user_id]);

        // Создаём уведомление для пользователя
        await db.runAsync(`
            INSERT INTO withdrawal_notifications (user_id, request_id, status, message)
            VALUES (?, ?, 'approved', ?)
        `, [
            request.user_id,
            requestId,
            `Ваша заявка на вывод ${request.amount}₽ одобрена! Средства будут переведены в ближайшее время.`
        ]);

        // Логируем в консоль
        console.log(`✅ Заявка #${requestId} одобрена админом ${adminName}`);
        console.log(`   Пользователь ID: ${request.user_id}`);
        console.log(`   Сумма: ${request.amount}₽`);
        console.log(`   Баланс обнулён: ${request.balance}₽ → 0₽`);

        res.json({
            success: true,
            message: 'Заявка одобрена, баланс обнулён',
            requestId,
            userId: request.user_id,
            amount: request.amount,
            oldBalance: request.balance,
            newBalance: 0
        });

    } catch (error) {
        console.error('Ошибка одобрения заявки:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

/**
 * POST /api/withdrawal/reject
 * Отклонение заявки - баланс НЕ трогается
 */
router.post('/reject', verifyBotSecret, async (req, res) => {
    try {
        const { requestId, adminName, comment } = req.body;

        if (!requestId) {
            return res.status(400).json({ 
                success: false, 
                message: 'requestId required' 
            });
        }

        // Получаем заявку
        const request = await db.getAsync(`
            SELECT id, user_id, amount, status
            FROM withdrawal_requests
            WHERE id = ?
        `, [requestId]);

        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: 'Заявка не найдена' 
            });
        }

        // Проверяем что заявка ещё не обработана
        if (request.status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                message: 'Заявка уже обработана' 
            });
        }

        // Обновляем статус заявки
        await db.runAsync(`
            UPDATE withdrawal_requests
            SET 
                status = 'rejected',
                processed_at = CURRENT_TIMESTAMP,
                processed_by = ?,
                admin_comment = ?
            WHERE id = ?
        `, [adminName, comment || 'Отклонено', requestId]);

        // Создаём уведомление для пользователя
        const notificationMessage = comment 
            ? `Ваша заявка на вывод ${request.amount}₽ отклонена. Причина: ${comment}`
            : `Ваша заявка на вывод ${request.amount}₽ отклонена.`;
        
        await db.runAsync(`
            INSERT INTO withdrawal_notifications (user_id, request_id, status, message)
            VALUES (?, ?, 'rejected', ?)
        `, [
            request.user_id,
            requestId,
            notificationMessage
        ]);

        // Логируем
        console.log(`❌ Заявка #${requestId} отклонена админом ${adminName}`);
        console.log(`   Пользователь ID: ${request.user_id}`);
        console.log(`   Сумма: ${request.amount}₽`);
        console.log(`   Причина: ${comment || 'не указана'}`);
        console.log(`   Баланс НЕ изменён`);

        res.json({
            success: true,
            message: 'Заявка отклонена',
            requestId
        });

    } catch (error) {
        console.error('Ошибка отклонения заявки:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

module.exports = router;
