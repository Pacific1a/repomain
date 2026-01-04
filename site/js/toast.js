/**
 * Простая библиотека Toast уведомлений
 */

const Toast = {
    container: null,

    /**
     * Инициализация контейнера для уведомлений
     */
    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        }
    },

    /**
     * Показать уведомление
     */
    show(message, type = 'info', duration = 5000) {
        this.init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Стили для toast
        const colors = {
            success: { bg: '#10b981', icon: '✓' },
            error: { bg: '#ef4444', icon: '✕' },
            warning: { bg: '#f59e0b', icon: '⚠' },
            info: { bg: '#3b82f6', icon: 'ℹ' }
        };

        const color = colors[type] || colors.info;

        toast.style.cssText = `
            background: ${color.bg};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            min-width: 300px;
            max-width: 500px;
            font-size: 14px;
            line-height: 1.5;
            pointer-events: auto;
            cursor: pointer;
            animation: slideIn 0.3s ease-out;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            word-wrap: break-word;
        `;

        toast.innerHTML = `
            <span style="font-size: 18px; font-weight: bold; flex-shrink: 0;">${color.icon}</span>
            <span style="flex: 1;">${message}</span>
        `;

        // Добавляем CSS анимацию если её ещё нет
        if (!document.getElementById('toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        this.container.appendChild(toast);

        // Клик для закрытия
        toast.addEventListener('click', () => {
            this.hide(toast);
        });

        // Автоматическое скрытие
        if (duration > 0) {
            setTimeout(() => {
                this.hide(toast);
            }, duration);
        }

        return toast;
    },

    /**
     * Скрыть уведомление
     */
    hide(toast) {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    },

    /**
     * Успешное уведомление
     */
    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    },

    /**
     * Ошибка
     */
    error(message, duration = 7000) {
        return this.show(message, 'error', duration);
    },

    /**
     * Предупреждение
     */
    warning(message, duration = 7000) {
        return this.show(message, 'warning', duration);
    },

    /**
     * Информация
     */
    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }
};

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Toast.init());
} else {
    Toast.init();
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.Toast = Toast;
}
