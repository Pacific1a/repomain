/**
 * API для обработки заявок админами (вызывается ботом)
 * Одобрение/отклонение заявок с обнулением баланса
 */

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database.db');
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
router.post('/approve', verifyBotSecret, (req, res) => {
    try {
        const { requestId, adminName } = req.body;

        if (!requestId) {
            return res.status(400).json({ 
                success: false, 
                message: 'requestId required' 
            });
        }

        const db = new Database(dbPath);

        try {
            // Начинаем транзакцию
            db.prepare('BEGIN').run();

            // Получаем заявку
            const request = db.prepare(`
                SELECT 
                    wr.id,
                    wr.user_id,
                    wr.amount,
                    wr.status,
                    u.balance
                FROM withdrawal_requests wr
                JOIN users u ON wr.user_id = u.id
                WHERE wr.id = ?
            `).get(requestId);

            if (!request) {
                db.prepare('ROLLBACK').run();
                return res.status(404).json({ 
                    success: false, 
                    message: 'Заявка не найдена' 
                });
            }

            // Проверяем что заявка ещё не обработана
            if (request.status !== 'pending') {
                db.prepare('ROLLBACK').run();
                return res.status(400).json({ 
                    success: false, 
                    message: 'Заявка уже обработана' 
                });
            }

            // Обновляем статус заявки
            db.prepare(`
                UPDATE withdrawal_requests
                SET 
                    status = 'approved',
                    processed_at = CURRENT_TIMESTAMP,
                    processed_by = ?
                WHERE id = ?
            `).run(adminName, requestId);

            // ОБНУЛЯЕМ баланс пользователя
            db.prepare(`
                UPDATE users
                SET balance = 0
                WHERE id = ?
            `).run(request.user_id);

            // Логируем в консоль
            console.log(`✅ Заявка #${requestId} одобрена админом ${adminName}`);
            console.log(`   Пользователь ID: ${request.user_id}`);
            console.log(`   Сумма: ${request.amount}₽`);
            console.log(`   Баланс обнулён: ${request.balance}₽ → 0₽`);

            // Коммитим транзакцию
            db.prepare('COMMIT').run();

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
            // Откатываем при ошибке
            try {
                db.prepare('ROLLBACK').run();
            } catch {}
            throw error;
        } finally {
            db.close();
        }

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
router.post('/reject', verifyBotSecret, (req, res) => {
    try {
        const { requestId, adminName, comment } = req.body;

        if (!requestId) {
            return res.status(400).json({ 
                success: false, 
                message: 'requestId required' 
            });
        }

        const db = new Database(dbPath);

        try {
            // Получаем заявку
            const request = db.prepare(`
                SELECT id, user_id, amount, status
                FROM withdrawal_requests
                WHERE id = ?
            `).get(requestId);

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
            db.prepare(`
                UPDATE withdrawal_requests
                SET 
                    status = 'rejected',
                    processed_at = CURRENT_TIMESTAMP,
                    processed_by = ?,
                    admin_comment = ?
                WHERE id = ?
            `).run(adminName, comment || 'Отклонено', requestId);

            // Логируем
            console.log(`❌ Заявка #${requestId} отклонена админом ${adminName}`);
            console.log(`   Пользователь ID: ${request.user_id}`);
            console.log(`   Сумма: ${request.amount}₽`);
            console.log(`   Баланс НЕ изменён`);

            res.json({
                success: true,
                message: 'Заявка отклонена',
                requestId
            });

        } finally {
            db.close();
        }

    } catch (error) {
        console.error('Ошибка отклонения заявки:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

module.exports = router;
