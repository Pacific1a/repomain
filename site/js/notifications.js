/**
 * Система уведомлений о статусе заявок на вывод
 */

// Проверка непрочитанных уведомлений при загрузке
document.addEventListener('DOMContentLoaded', () => {
    checkUnreadNotifications();
});

/**
 * Проверить наличие непрочитанных уведомлений
 */
async function checkUnreadNotifications() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch(`${window.API_BASE_URL || 'https://duopartners.xyz/api'}/notifications/unread`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (result.success && result.count > 0) {
            // Показываем уведомления
            result.notifications.forEach(notification => {
                showNotification(notification);
            });
        }

    } catch (error) {
        console.error('Ошибка проверки уведомлений:', error);
    }
}

/**
 * Показать уведомление пользователю
 */
function showNotification(notification) {
    const isApproved = notification.status === 'approved';
    
    // Используем Toast для уведомлений
    if (typeof Toast !== 'undefined') {
        if (isApproved) {
            Toast.success(notification.message, 7000);
        } else {
            Toast.warning(notification.message, 10000);
        }
    } else {
        // Fallback если Toast не доступен
        alert(notification.message);
    }

    // Отмечаем уведомление как прочитанное
    markNotificationAsRead(notification.id);
}

/**
 * Отметить уведомление как прочитанное
 */
async function markNotificationAsRead(notificationId) {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        await fetch(`${window.API_BASE_URL || 'https://duopartners.xyz/api'}/notifications/mark-read/${notificationId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

    } catch (error) {
        console.error('Ошибка отметки уведомления:', error);
    }
}

/**
 * Отметить все уведомления как прочитанные
 */
async function markAllNotificationsAsRead() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        await fetch(`${window.API_BASE_URL || 'https://duopartners.xyz/api'}/notifications/mark-all-read`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

    } catch (error) {
        console.error('Ошибка отметки всех уведомлений:', error);
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkUnreadNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead
    };
}
