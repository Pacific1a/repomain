// Функция для создания кастомного dashed border
function createCustomDashedBorder(element, options = {}) {
    const {
        strokeWidth = 3,        // Толщина линии
        dashLength = 25,        // Длина штриха
        gapLength = 12,         // Расстояние между штрихами
        color = '#ff1212',      // Цвет
        borderRadius = 100      // Радиус скругления
    } = options;

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

// Применяем к элементу с классом .title-block
document.addEventListener('DOMContentLoaded', () => {
    const titleBlock = document.querySelector('.title-block');
    if (titleBlock) {
        createCustomDashedBorder(titleBlock, {
            strokeWidth: 3,
            dashLength: 25,      // Длиннее линии
            gapLength: 12,       // Меньше промежуток
            color: '#ff1212',
            borderRadius: 70
        });
    }
});
