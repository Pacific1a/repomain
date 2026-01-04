/**
 * API для уведомлений о статусе заявок
 */

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

/**
 * GET /api/notifications/unread
 * Получить непрочитанные уведомления пользователя
 */
router.get('/unread', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Требуется авторизация' 
            });
        }

        const notifications = await db.allAsync(`
            SELECT 
                id,
                request_id,
                status,
                message,
                created_at
            FROM withdrawal_notifications
            WHERE user_id = ? AND is_read = 0
            ORDER BY created_at DESC
        `, [userId]);

        res.json({
            success: true,
            notifications,
            count: notifications.length
        });

    } catch (error) {
        console.error('Ошибка получения уведомлений:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

/**
 * POST /api/notifications/mark-read/:id
 * Отметить уведомление как прочитанное
 */
router.post('/mark-read/:id', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const notificationId = req.params.id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Требуется авторизация' 
            });
        }

        await db.runAsync(`
            UPDATE withdrawal_notifications
            SET is_read = 1
            WHERE id = ? AND user_id = ?
        `, [notificationId, userId]);

        res.json({
            success: true,
            message: 'Уведомление отмечено как прочитанное'
        });

    } catch (error) {
        console.error('Ошибка отметки уведомления:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

/**
 * POST /api/notifications/mark-all-read
 * Отметить все уведомления как прочитанные
 */
router.post('/mark-all-read', async (req, res) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Требуется авторизация' 
            });
        }

        await db.runAsync(`
            UPDATE withdrawal_notifications
            SET is_read = 1
            WHERE user_id = ? AND is_read = 0
        `, [userId]);

        res.json({
            success: true,
            message: 'Все уведомления отмечены как прочитанные'
        });

    } catch (error) {
        console.error('Ошибка отметки всех уведомлений:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

module.exports = router;
