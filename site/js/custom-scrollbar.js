/**
 * Кастомный скроллбар на JavaScript
 * - Прозрачный фон
 * - Красный ползунок
 * - Overlay режим (не занимает место)
 * - Поддержка колесика мыши, drag, тачпада
 */

class CustomScrollbar {
    constructor() {
        this.scrollbar = null;
        this.thumb = null;
        this.isDragging = false;
        this.startY = 0;
        this.startScrollTop = 0;
        this.hideTimeout = null;
        
        this.init();
    }

    init() {
        // Создаём HTML элементы скроллбара
        this.createScrollbar();
        
        // Обработчики событий
        this.attachEvents();
        
        // Обновляем позицию скролла
        this.updateThumb();
        
        // Автоскрытие скролла
        this.autoHide();
    }

    createScrollbar() {
        // Контейнер скроллбара
        this.scrollbar = document.createElement('div');
        this.scrollbar.className = 'custom-scrollbar';
        
        // Ползунок
        this.thumb = document.createElement('div');
        this.thumb.className = 'custom-scrollbar-thumb';
        
        this.scrollbar.appendChild(this.thumb);
        document.body.appendChild(this.scrollbar);
    }

    attachEvents() {
        // Обновление при скролле - ПРЯМОЕ без задержки
        window.addEventListener('scroll', () => {
            this.updateThumb();
            this.showScrollbar();
        }, { passive: true });

        // Обновление при ресайзе окна
        window.addEventListener('resize', () => {
            this.updateThumb();
        });

        // Drag ползунка
        this.thumb.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.isDragging = true;
            this.startY = e.clientY;
            this.startScrollTop = window.pageYOffset || document.documentElement.scrollTop;
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            e.preventDefault();
            
            const deltaY = e.clientY - this.startY;
            const scrollRatio = document.documentElement.scrollHeight / window.innerHeight;
            const newScrollTop = this.startScrollTop + (deltaY * scrollRatio);
            
            // Прямой скролл без обёрток
            window.scrollTo(0, newScrollTop);
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                document.body.style.userSelect = '';
            }
        });

        // Клик по треку (не по ползунку) - мгновенный скролл
        this.scrollbar.addEventListener('click', (e) => {
            if (e.target === this.thumb) return;
            
            const clickY = e.clientY;
            const scrollbarRect = this.scrollbar.getBoundingClientRect();
            const clickRatio = (clickY - scrollbarRect.top) / scrollbarRect.height;
            const targetScroll = clickRatio * (document.documentElement.scrollHeight - window.innerHeight);
            
            window.scrollTo(0, targetScroll);
        });

        // Hover эффекты
        this.scrollbar.addEventListener('mouseenter', () => {
            this.scrollbar.classList.add('hover');
        });

        this.scrollbar.addEventListener('mouseleave', () => {
            this.scrollbar.classList.remove('hover');
        });
    }

    updateThumb() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;
        
        // Если контент меньше высоты окна - скрываем скролл
        if (scrollHeight <= clientHeight) {
            this.scrollbar.style.display = 'none';
            return;
        }
        
        this.scrollbar.style.display = 'block';
        
        // Высота ползунка короче (уменьшили коэффициент)
        const thumbHeight = Math.max((clientHeight / scrollHeight) * clientHeight * 0.6, 30);
        this.thumb.style.height = thumbHeight + 'px';
        
        // Позиция ползунка с GPU ускорением (translate3d)
        const scrollRatio = scrollTop / (scrollHeight - clientHeight);
        const maxThumbTop = clientHeight - thumbHeight;
        const thumbTop = scrollRatio * maxThumbTop;
        
        // translate3d вместо translateY - GPU acceleration
        this.thumb.style.transform = `translate3d(-50%, ${thumbTop}px, 0)`;
    }

    showScrollbar() {
        this.scrollbar.classList.add('visible');
        this.autoHide();
    }

    autoHide() {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = setTimeout(() => {
            if (!this.isDragging && !this.scrollbar.matches(':hover')) {
                this.scrollbar.classList.remove('visible');
            }
        }, 800); // Скрыть через 0.8 секунды
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new CustomScrollbar();
});
