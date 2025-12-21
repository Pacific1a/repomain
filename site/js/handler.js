// Интерактивность для раскрывающихся меню
document.addEventListener('DOMContentLoaded', function() {
    // Находим все раскрывающиеся пункты меню
    const expandableItems = document.querySelectorAll('.menu-item-expandable');
    
    expandableItems.forEach(item => {
        const button = item.querySelector('.menu-item');
        const submenu = item.querySelector('.submenu');
        
        if (button && submenu) {
            // Изначально скрываем подменю, если оно не активно
            if (!button.classList.contains('active')) {
                submenu.style.display = 'none';
            }
            
            button.addEventListener('click', function() {
                // Переключаем активное состояние
                button.classList.toggle('active');
                
                // Показываем/скрываем подменю с плавной анимацией
                if (submenu.style.display === 'none') {
                    submenu.style.display = 'flex';
                } else {
                    submenu.style.display = 'none';
                }
                
                // Поворачиваем стрелку
                const arrow = button.querySelector('.arrow');
                if (arrow) {
                    const isOpen = submenu.style.display !== 'none';
                    const arrowWidth = arrow.getAttribute('width');
                    if (arrowWidth === '7') {
                        // Горизонтальная стрелка → на 90° становится ↓
                        arrow.style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
                    } else {
                        // Стрелка вниз: закрыто (→) -90°, открыто (↓) 0°
                        arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
                    }
                }
            });
        }
    });
  
    // Интерактивность графика
    const chartArea = document.querySelector('.chart-area');
    const dateDetails = document.querySelector('.date-details');
    const chartContainer = document.querySelector('.chart-container');
    
    if (chartArea && dateDetails && chartContainer) {
        // Перемещаем date-details в chart-area
        chartArea.appendChild(dateDetails);
        chartArea.style.position = 'relative';
  
        // Создаем вертикальную линию индикатора
        const cursorLine = document.createElement('div');
        cursorLine.style.position = 'absolute';
        cursorLine.style.width = '2px';
        cursorLine.style.height = '100%';
        cursorLine.style.background = 'rgba(255, 224, 224, 0.3)';
        cursorLine.style.pointerEvents = 'none';
        cursorLine.style.display = 'none';
        cursorLine.style.top = '0';
        chartArea.appendChild(cursorLine);
        // Данные для каждой даты (пример - замените на реальные данные)
        const chartData = [
            { date: '21.08', income: 150, clicks: 45, deposits: 3500, firstDeposits: 12 },
            { date: '23.08', income: 220, clicks: 67, deposits: 5200, firstDeposits: 18 },
            { date: '18.08', income: 180, clicks: 52, deposits: 4100, firstDeposits: 15 },
            { date: '19.08', income: 310, clicks: 89, deposits: 7200, firstDeposits: 25 },
            { date: '20.08', income: 275, clicks: 74, deposits: 6300, firstDeposits: 21 },
            { date: '22.08', income: 195, clicks: 58, deposits: 4800, firstDeposits: 16 },
            { date: '24.08', income: 340, clicks: 95, deposits: 8100, firstDeposits: 28 }
        ];
  
        let isHovering = false;
  
        // Показываем tooltip при входе на график
        chartArea.addEventListener('mouseenter', function() {
            isHovering = true;
            dateDetails.style.display = 'block';
            cursorLine.style.display = 'block';
        });
  
        // Скрываем tooltip при уходе с графика
        chartArea.addEventListener('mouseleave', function() {
            isHovering = false;
            dateDetails.style.display = 'none';
            cursorLine.style.display = 'none';
        });
  
        // Отслеживаем движение курсора
        chartArea.addEventListener('mousemove', function(e) {
            if (!isHovering) return;
  
            const rect = chartArea.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
  
            // Вычисляем индекс ближайшей точки данных (7 точек)
            const pointIndex = Math.round((x / width) * (chartData.length - 1));
            const clampedIndex = Math.max(0, Math.min(pointIndex, chartData.length - 1));
            
            // Получаем данные для текущей точки
            const data = chartData[clampedIndex];
  
            // Обновляем содержимое tooltip
            updateTooltip(data);
  
            // Позиционируем tooltip
            positionTooltip(e, rect);
  
            // Позиционируем линию курсора
            cursorLine.style.left = x + 'px';
        });
  
        function updateTooltip(data) {
            const header = dateDetails.querySelector('.date-details-header');
            const detailRows = dateDetails.querySelectorAll('.detail-value');
  
            if (header) {
                header.textContent = data.date + '.2025';
            }
  
            if (detailRows.length >= 4) {
                detailRows[0].textContent = data.income + '₽';
                detailRows[1].textContent = data.clicks;
                detailRows[2].textContent = data.deposits + '₽';
                detailRows[3].textContent = data.firstDeposits;
            }
        }
  
        function positionTooltip(e, chartRect) {
            const tooltipWidth = dateDetails.offsetWidth;
            const tooltipHeight = dateDetails.offsetHeight;
  
            // Позиция курсора относительно chart-area
            const x = e.clientX - chartRect.left;
            const y = e.clientY - chartRect.top;
  
            // По умолчанию справа на 80px
            let left = x + 80;
            let top = y - tooltipHeight / 2;
  
            // Если справа не помещается, ставим слева на 80px
            if (left + tooltipWidth > chartRect.width) {
                left = x - tooltipWidth - 80;
            }
  
            // Проверяем, чтобы не вышел за левую границу
            if (left < 0) {
                left = 10;
            }
  
            // Проверяем границы сверху и снизу
            if (top < 0) {
                top = 10;
            }
            if (top + tooltipHeight > chartRect.height) {
                top = chartRect.height - tooltipHeight - 10;
            }
  
            // Применяем позицию относительно chart-area
            dateDetails.style.position = 'absolute';
            dateDetails.style.left = left + 'px';
            dateDetails.style.top = top + 'px';
            dateDetails.style.pointerEvents = 'none';
        }
    }
  });
  
  const input = document.querySelector('.input_code input');
  const copyBtn = document.querySelector('.svg_copy');
  
  if (copyBtn && input) {
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(input.value);
      copyBtn.classList.add('copied');
  
      setTimeout(() => {
        copyBtn.classList.remove('copied');
      }, 1000); // через 1 секунду возвращается иконка
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  });
  }
  
  const inputs = document.querySelectorAll('.code_5');
  
  if (inputs.length > 0) {
  inputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '');
      if (input.value && index < inputs.length - 1) {
        inputs[index + 1].focus(); // переход на следующий
      }
    });
  
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        inputs[index - 1].focus(); // переход назад при удалении
      }
    });
  });
  }
  
  // ============================================
  // МОДАЛЬНЫЕ ОКНА - УНИВЕРСАЛЬНАЯ ЛОГИКА
  // ============================================
  
  // ============================================
  // ВСЕ ФУНКЦИИ openModal/closeModal УДАЛЕНЫ
  // ИСПОЛЬЗУЙТЕ ModalHandler.open() и ModalHandler.close()
  // ============================================
  
  // ============================================
  // ВСЕ ОБРАБОТЧИКИ МОДАЛЬНЫХ ОКОН УДАЛЕНЫ
  // Используются обработчики из modal-handler.js
  // ============================================
  
  // ============================================
  // 7. DATE-PICKER
  // ============================================
  // УДАЛЕНО: Обработчик date-picker теперь находится в chart.js
  // для правильной интеграции с графиком и обновлением данных
  
  // ============================================
  // 8. МАТЕРИАЛЫ - КРЕАТИВЫ И МАНУАЛЫ
  // ============================================
  
  // Функция для настройки content_alert модального окна
  function setupContentAlert(type) {
  const manualContent = document.querySelector('.content_alert .manual_content');
  const creativeContent = document.querySelector('.content_alert .creative_content');
  const manualFields = document.querySelectorAll('.content_alert .log_type.manuals');
  const creativeFields = document.querySelectorAll('.content_alert .log_type.creative');
  
  if (type === 'manual') {
    // Активируем Мануал
    if (manualContent) {
      manualContent.classList.add('active');
      manualContent.classList.remove('non_active');
    }
    if (creativeContent) {
      creativeContent.classList.remove('active');
      creativeContent.classList.add('non_active');
    }
    
    // Показываем поля мануалов, скрываем креативы
    manualFields.forEach(field => field.style.display = 'flex');
    creativeFields.forEach(field => field.style.display = 'none');
  } else if (type === 'creative') {
    // Активируем Креатив
    if (manualContent) {
      manualContent.classList.remove('active');
      manualContent.classList.add('non_active');
    }
    if (creativeContent) {
      creativeContent.classList.add('active');
      creativeContent.classList.remove('non_active');
    }
    
    // Показываем поля креативов, скрываем мануалы
    manualFields.forEach(field => field.style.display = 'none');
    creativeFields.forEach(field => field.style.display = 'flex');
  }
  }
  
  
  // ВСЕ ОБРАБОТЧИКИ УДАЛЕНЫ - используйте modal-handler.js
  
  // Инициализация - по умолчанию показываем мануалы
  setupContentAlert('manual');
  
  // ============================================
  // ИНИЦИАЛИЗАЦИЯ
  // ============================================
  // setupModalClose() УДАЛЕНО - используется modal-handler.js