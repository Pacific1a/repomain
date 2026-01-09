/**
 * Avatar Helper - генерация аватарок с инициалами
 * Для случаев когда photoUrl === null (пользователь скрыл фото)
 */

const AvatarHelper = {
    /**
     * Палитра цветов для аватарок
     */
    colors: [
        '#FF6B6B', // Красный
        '#4ECDC4', // Бирюзовый
        '#45B7D1', // Голубой
        '#FFA07A', // Коралловый
        '#98D8C8', // Мятный
        '#F7DC6F', // Желтый
        '#BB8FCE', // Фиолетовый
        '#85C1E2', // Небесный
        '#F39C12', // Оранжевый
        '#1ABC9C', // Изумрудный
        '#E74C3C', // Алый
        '#9B59B6', // Аметистовый
    ],

    /**
     * Получить инициал из nickname
     */
    getInitial(nickname) {
        if (!nickname || nickname.length === 0) return 'U';
        
        // Убираем @ если есть
        const cleanName = nickname.replace(/^@/, '');
        
        // Берём первую букву
        const firstChar = cleanName.charAt(0).toUpperCase();
        
        // Проверяем что это буква (латиница или кириллица)
        if (/[A-ZА-ЯЁ]/i.test(firstChar)) {
            return firstChar;
        }
        
        // Если не буква - ищем первую букву в строке
        const match = cleanName.match(/[A-ZА-ЯЁ]/i);
        if (match) {
            return match[0].toUpperCase();
        }
        
        // Fallback
        return 'U';
    },

    /**
     * Получить цвет на основе nickname (детерминированный)
     */
    getColor(nickname) {
        if (!nickname || nickname.length === 0) {
            return this.colors[0];
        }
        
        // Хеш строки
        let hash = 0;
        for (let i = 0; i < nickname.length; i++) {
            hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // Выбираем цвет по хешу
        const index = Math.abs(hash) % this.colors.length;
        return this.colors[index];
    },

    /**
     * Создать HTML для аватарки
     * @param {Object} user - { nickname, photoUrl }
     * @param {string} size - '40px', '50px', etc
     * @returns {string} HTML
     */
    renderAvatar(user, size = '40px') {
        const nickname = user.nickname || user.userId || 'User';
        
        if (user.photoUrl) {
            // Есть фото - показываем реальную аватарку
            return `
                <img 
                    src="${user.photoUrl}" 
                    alt="${nickname}"
                    class="user-avatar"
                    style="width: ${size}; height: ${size}; border-radius: 50%; object-fit: cover;"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                >
                <div class="avatar-initial" style="
                    display: none;
                    width: ${size}; 
                    height: ${size}; 
                    border-radius: 50%;
                    background-color: ${this.getColor(nickname)};
                    color: white;
                    font-weight: 600;
                    font-size: calc(${size} * 0.45);
                    align-items: center;
                    justify-content: center;
                    font-family: 'Montserrat', sans-serif;
                    text-transform: uppercase;
                    flex-shrink: 0;
                ">
                    ${this.getInitial(nickname)}
                </div>
            `;
        } else {
            // Нет фото - показываем инициал
            const initial = this.getInitial(nickname);
            const color = this.getColor(nickname);
            
            return `
                <div class="avatar-initial" style="
                    display: flex;
                    width: ${size}; 
                    height: ${size}; 
                    border-radius: 50%;
                    background-color: ${color};
                    color: white;
                    font-weight: 600;
                    font-size: calc(${size} * 0.45);
                    align-items: center;
                    justify-content: center;
                    font-family: 'Montserrat', sans-serif;
                    text-transform: uppercase;
                    flex-shrink: 0;
                ">
                    ${initial}
                </div>
            `;
        }
    },

    /**
     * Создать DOM элемент аватарки
     * @param {Object} user - { nickname, photoUrl }
     * @param {string} size - '40px', '50px', etc
     * @returns {HTMLElement}
     */
    createAvatarElement(user, size = '40px') {
        const wrapper = document.createElement('div');
        wrapper.className = 'avatar-wrapper';
        wrapper.style.display = 'inline-flex';
        wrapper.innerHTML = this.renderAvatar(user, size);
        return wrapper;
    }
};

// Export для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AvatarHelper;
}
