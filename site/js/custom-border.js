// Функция для создания кастомного dashed border
function createCustomDashedBorder(element, options = {}) {
    const {
        strokeWidth = 3,        // Толщина линии
        dashLength = 25,        // Длина штриха
        gapLength = 12,         // Расстояние между штрихами
        color = '#ff1212',      // Цвет
        borderRadius = 50      // Радиус скругления
    } = options;

    // Удаляем старый SVG если существует
    const oldSvg = element.querySelector('svg');
    if (oldSvg) {
        oldSvg.remove();
    }

    const width = element.offsetWidth;
    const height = element.offsetHeight;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = 'none';

    const rect_element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect_element.setAttribute('x', strokeWidth / 2);
    rect_element.setAttribute('y', strokeWidth / 2);
    rect_element.setAttribute('width', width - strokeWidth);
    rect_element.setAttribute('height', height - strokeWidth);
    rect_element.setAttribute('rx', borderRadius);
    rect_element.setAttribute('ry', borderRadius);
    rect_element.setAttribute('fill', 'none');
    rect_element.setAttribute('stroke', color);
    rect_element.setAttribute('stroke-width', strokeWidth);
    rect_element.setAttribute('stroke-dasharray', `${dashLength} ${gapLength}`);

    svg.appendChild(rect_element);
    element.appendChild(svg);
}

// Debounce функция для оптимизации
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Применяем к элементу с классом .title-block
document.addEventListener('DOMContentLoaded', () => {
    const titleBlock = document.querySelector('.title-block');
    if (!titleBlock) return;

    const borderOptions = {
        strokeWidth: 3,
        dashLength: 25,      // Длиннее линии
        gapLength: 15,       // Меньше промежуток
        color: '#ff1212',
        borderRadius: 60
    };

    // Создаём рамку при загрузке
    createCustomDashedBorder(titleBlock, borderOptions);

    // Пересоздаём рамку при изменении размера окна
    const handleResize = debounce(() => {
        createCustomDashedBorder(titleBlock, borderOptions);
    }, 150);

    window.addEventListener('resize', handleResize);

    // Используем ResizeObserver для более точного отслеживания
    if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(debounce(() => {
            createCustomDashedBorder(titleBlock, borderOptions);
        }, 100));
        
        resizeObserver.observe(titleBlock);
    }
});
