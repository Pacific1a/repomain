// ============================================
// CANVAS ГРАФИК СТАТИСТИКИ С DATE-PICKER
// ============================================

(function() {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChart);
    } else {
        initChart();
    }

    function initChart() {
        const canvas = document.getElementById('statisticsChart');
        if (!canvas) {
            console.error('Canvas элемент не найден!');
            return;
        }

        const ctx = canvas.getContext('2d');
        const dateDetailsPopup = document.querySelector('.date-details');
        
        // Тестовые данные для графика
        const chartData = {
            labels: ['10 Дек', '11 Дек', '12 Дек', '13 Дек', '14 Дек', '15 Дек', '16 Дек'],
            datasets: {
                income: [0, 0, 0, 0, 0, 0, 0],
                deposits: [0, 0, 0, 0, 0, 0, 0],
                visits: [0, 0, 0, 0, 0, 0, 0],
                firstDeposits: [0, 0, 0, 0, 0, 0, 0]
            },
            colors: {
                income: '#E84C3D',
                deposits: '#5DCCBA',
                visits: '#DDDDDD',
                firstDeposits: '#E8B84D'
            }
        };

        const padding = { top: 40, right: 40, bottom: 50, left: 60 };
        let width, height, chartWidth, chartHeight;

        const lineVisibility = {
            income: true,
            deposits: true,
            visits: true,
            firstDeposits: true
        };

        function resizeCanvas() {
            const container = canvas.parentElement;
            const dpr = window.devicePixelRatio || 1;
            
            width = container.clientWidth;
            height = container.clientHeight;
            
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            
            ctx.scale(dpr, dpr);
            
            chartWidth = width - padding.left - padding.right;
            chartHeight = height - padding.top - padding.bottom;
            
            drawChart();
        }

        function drawChart() {
            ctx.clearRect(0, 0, width, height);
            
            // Вычисляем максимум для stacked данных
            const stackedData = calculateStackedData();
            const maxValue = stackedData.maxValue > 0 ? stackedData.maxValue : 100;
            const minValue = 0;
            
            drawGrid(maxValue);
            
            // Рисуем области снизу вверх (stacked)
            const order = ['income', 'deposits', 'firstDeposits', 'visits'];
            order.forEach(key => {
                if (lineVisibility[key]) {
                    drawStackedArea(stackedData.layers[key], chartData.colors[key], maxValue, minValue);
                }
            });
            
            drawXLabels();
        }
        
        function calculateStackedData() {
            const order = ['income', 'deposits', 'firstDeposits', 'visits'];
            const layers = {};
            const accumulated = new Array(chartData.labels.length).fill(0);
            let maxValue = 0;
            
            order.forEach(key => {
                if (lineVisibility[key]) {
                    layers[key] = chartData.datasets[key].map((value, index) => {
                        const bottom = accumulated[index];
                        accumulated[index] += value;
                        maxValue = Math.max(maxValue, accumulated[index]);
                        return { bottom, top: accumulated[index], value };
                    });
                } else {
                    layers[key] = chartData.datasets[key].map(() => ({ bottom: 0, top: 0, value: 0 }));
                }
            });
            
            return { layers, maxValue };
        }

        function drawGrid(maxValue) {
            ctx.strokeStyle = 'rgba(193, 172, 172, 0.1)';
            ctx.lineWidth = 1;
            
            const gridLines = 5;
            for (let i = 0; i <= gridLines; i++) {
                const y = padding.top + (chartHeight / gridLines) * i;
                
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(padding.left + chartWidth, y);
                ctx.stroke();
                
                const value = Math.round(maxValue * (1 - i / gridLines));
                ctx.fillStyle = '#9B8585';
                ctx.font = '12px Inter, sans-serif';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText(value.toString(), padding.left - 10, y);
            }
        }

        function drawStackedArea(layerData, color, maxValue, minValue) {
            const valueRange = maxValue - minValue;
            const topPoints = [];
            const bottomPoints = [];
            
            layerData.forEach((data, index) => {
                const x = padding.left + (chartWidth / (layerData.length - 1)) * index;
                
                const normalizedTop = (data.top - minValue) / valueRange;
                const yTop = padding.top + chartHeight - (normalizedTop * chartHeight);
                
                const normalizedBottom = (data.bottom - minValue) / valueRange;
                const yBottom = padding.top + chartHeight - (normalizedBottom * chartHeight);
                
                topPoints.push({ x, y: yTop, value: data.value });
                bottomPoints.push({ x, y: yBottom });
            });
            
            // Рисуем заполненную область с прозрачностью
            ctx.fillStyle = color + '40'; // Добавляем прозрачность (40 = 25%)
            ctx.beginPath();
            
            // Верхняя линия
            topPoints.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            
            // Нижняя линия (в обратном порядке)
            for (let i = bottomPoints.length - 1; i >= 0; i--) {
                ctx.lineTo(bottomPoints[i].x, bottomPoints[i].y);
            }
            
            ctx.closePath();
            ctx.fill();
            
            // Рисуем верхнюю линию с тенью
            ctx.shadowColor = color;
            ctx.shadowBlur = 6;
            ctx.shadowOffsetY = 1;
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            topPoints.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.stroke();
            
            // Убираем тень
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            
            // Рисуем точки на верхней линии
            topPoints.forEach(point => {
                // Тень точки
                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.beginPath();
                ctx.arc(point.x + 0.5, point.y + 1.5, 5, 0, Math.PI * 2);
                ctx.fill();
                
                // Внешняя точка
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
                ctx.fill();
                
                // Внутренняя точка
                ctx.fillStyle = '#211A1A';
                ctx.beginPath();
                ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        function drawXLabels() {
            ctx.fillStyle = '#9B8585';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            
            chartData.labels.forEach((label, index) => {
                const x = padding.left + (chartWidth / (chartData.labels.length - 1)) * index;
                const y = padding.top + chartHeight + 10;
                ctx.fillText(label, x, y);
            });
        }

        // Легенда
        document.querySelectorAll('.legend-item-new').forEach(item => {
            item.addEventListener('click', function() {
                const lineType = this.getAttribute('data-line');
                lineVisibility[lineType] = !lineVisibility[lineType];
                
                if (lineVisibility[lineType]) {
                    this.classList.remove('inactive');
                } else {
                    this.classList.add('inactive');
                }
                
                drawChart();
            });
        });

        // Клик на точки графика
        canvas.addEventListener('click', function(e) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            let clickedIndex = -1;
            let clickedPointX = 0;
            let clickedPointY = 0;
            let minDistance = Infinity;
            
            // Проверяем близость к каждой точке на графике
            chartData.labels.forEach((label, index) => {
                const pointX = padding.left + (chartWidth / (chartData.labels.length - 1)) * index;
                
                Object.keys(chartData.datasets).forEach(key => {
                    if (lineVisibility[key]) {
                        const value = chartData.datasets[key][index];
                        const allValues = [];
                        Object.keys(chartData.datasets).forEach(k => {
                            if (lineVisibility[k]) allValues.push(...chartData.datasets[k]);
                        });
                        const maxValue = Math.max(...allValues);
                        const normalizedValue = value / maxValue;
                        const pointY = padding.top + chartHeight - (normalizedValue * chartHeight);
                        
                        const distance = Math.sqrt(Math.pow(mouseX - pointX, 2) + Math.pow(mouseY - pointY, 2));
                        
                        // Радиус клика 35 пикселей - удобно, но не слишком много
                        if (distance <= 35 && distance < minDistance) {
                            minDistance = distance;
                            clickedIndex = index;
                            clickedPointX = pointX;
                            clickedPointY = pointY;
                        }
                    }
                });
            });
            
            if (clickedIndex >= 0) {
                showDateDetails(clickedIndex, clickedPointX, clickedPointY);
            } else {
                if (dateDetailsPopup) {
                    dateDetailsPopup.style.display = 'none';
                }
            }
        });

        // Курсор pointer при наведении на точки
        canvas.addEventListener('mousemove', function(e) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            let onPoint = false;
            
            // Проверяем близость к точкам
            chartData.labels.forEach((label, index) => {
                const pointX = padding.left + (chartWidth / (chartData.labels.length - 1)) * index;
                
                Object.keys(chartData.datasets).forEach(key => {
                    if (lineVisibility[key]) {
                        const value = chartData.datasets[key][index];
                        const allValues = [];
                        Object.keys(chartData.datasets).forEach(k => {
                            if (lineVisibility[k]) allValues.push(...chartData.datasets[k]);
                        });
                        const maxValue = Math.max(...allValues);
                        const normalizedValue = value / maxValue;
                        const pointY = padding.top + chartHeight - (normalizedValue * chartHeight);
                        
                        const distance = Math.sqrt(Math.pow(mouseX - pointX, 2) + Math.pow(mouseY - pointY, 2));
                        
                        // Радиус 35 пикселей для наведения
                        if (distance <= 35) {
                            onPoint = true;
                        }
                    }
                });
            });
            
            canvas.style.cursor = onPoint ? 'pointer' : 'default';
        });

        function showDateDetails(index, pointX, pointY) {
            if (!dateDetailsPopup) return;
            
            const dateSpan = dateDetailsPopup.querySelector('.date-details-date');
            const incomeValue = dateDetailsPopup.querySelector('.income-value');
            const depositsValue = dateDetailsPopup.querySelector('.deposits-value');
            const visitsValue = dateDetailsPopup.querySelector('.visits-value');
            const clientsValue = dateDetailsPopup.querySelector('.clients-value');
            
            if (dateSpan) dateSpan.textContent = chartData.labels[index];
            if (incomeValue) incomeValue.textContent = chartData.datasets.income[index] + '₽';
            if (depositsValue) depositsValue.textContent = chartData.datasets.deposits[index] + '₽';
            if (visitsValue) visitsValue.textContent = chartData.datasets.visits[index];
            if (clientsValue) clientsValue.textContent = chartData.datasets.firstDeposits[index];
            
            dateDetailsPopup.style.display = 'block';
            
            // Получаем размеры popup после его показа
            const popupWidth = dateDetailsPopup.offsetWidth || 220;
            const popupHeight = dateDetailsPopup.offsetHeight || 200;
            
            // Получаем размеры canvas wrapper
            const wrapper = canvas.parentElement;
            const wrapperWidth = wrapper.clientWidth;
            const wrapperHeight = wrapper.clientHeight;
            
            // Смещение от точки
            const offset = 20;
            
            // Позиция по умолчанию - справа от точки
            let left = pointX + offset;
            let top = pointY - popupHeight / 2;
            
            // Если не помещается справа, показываем слева
            if (left + popupWidth > wrapperWidth - 20) {
                left = pointX - popupWidth - offset;
            }
            
            // Если не помещается слева, центрируем по горизонтали
            if (left < 20) {
                left = (wrapperWidth - popupWidth) / 2;
            }
            
            // Проверяем вертикальные границы
            if (top < 20) {
                top = 20;
            } else if (top + popupHeight > wrapperHeight - 20) {
                top = wrapperHeight - popupHeight - 20;
            }
            
            // Применяем позицию
            dateDetailsPopup.style.left = left + 'px';
            dateDetailsPopup.style.top = top + 'px';
        }

        const closeBtn = document.querySelector('.date-details-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                dateDetailsPopup.style.display = 'none';
            });
        }

        // DATE PICKER ИНТЕГРАЦИЯ
        const datePicker = document.querySelector('.date-picker');
        const dateSelect = document.querySelector('.date_select');
        const dateOptions = document.querySelectorAll('.date_select > div');
        
        if (datePicker && dateSelect) {
            datePicker.addEventListener('click', function(e) {
                e.stopPropagation();
                const isVisible = dateSelect.style.display === 'flex';
                dateSelect.style.display = isVisible ? 'none' : 'flex';
            });
            
            document.addEventListener('click', function() {
                dateSelect.style.display = 'none';
            });
            
            dateSelect.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
        
        dateOptions.forEach(option => {
            option.addEventListener('click', function() {
                dateOptions.forEach(opt => {
                    opt.classList.remove('active');
                    opt.classList.add('non_active');
                });
                
                this.classList.add('active');
                this.classList.remove('non_active');
                
                const datePickerSpan = datePicker.querySelector('span');
                if (datePickerSpan) {
                    datePickerSpan.textContent = this.textContent;
                }
                
                const period = this.className.split(' ')[0];
                updateChartData(period);
                
                dateSelect.style.display = 'none';
            });
        });
        
        function updateChartData(period) {
            switch(period) {
                case 'today':
                    chartData.labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'];
                    chartData.datasets.income = [0, 0, 0, 0, 0, 0, 0];
                    chartData.datasets.deposits = [0, 0, 0, 0, 0, 0, 0];
                    chartData.datasets.visits = [0, 0, 0, 0, 0, 0, 0];
                    chartData.datasets.firstDeposits = [0, 0, 0, 0, 0, 0, 0];
                    break;
                    
                case 'yesterday':
                    chartData.labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'];
                    chartData.datasets.income = [0, 0, 0, 0, 0, 0, 0];
                    chartData.datasets.deposits = [0, 0, 0, 0, 0, 0, 0];
                    chartData.datasets.visits = [0, 0, 0, 0, 0, 0, 0];
                    chartData.datasets.firstDeposits = [0, 0, 0, 0, 0, 0, 0];
                    break;
                    
                case 'week':
                    chartData.labels = ['10 Дек', '11 Дек', '12 Дек', '13 Дек', '14 Дек', '15 Дек', '16 Дек'];
                    chartData.datasets.income = [0, 0, 0, 0, 0, 0, 0];
                    chartData.datasets.deposits = [0, 0, 0, 0, 0, 0, 0];
                    chartData.datasets.visits = [0, 0, 0, 0, 0, 0, 0];
                    chartData.datasets.firstDeposits = [0, 0, 0, 0, 0, 0, 0];
                    break;
                    
                case 'month':
                    chartData.labels = ['1-5', '6-10', '11-15', '16-20', '21-25', '26-30'];
                    chartData.datasets.income = [0, 0, 0, 0, 0, 0];
                    chartData.datasets.deposits = [0, 0, 0, 0, 0, 0];
                    chartData.datasets.visits = [0, 0, 0, 0, 0, 0];
                    chartData.datasets.firstDeposits = [0, 0, 0, 0, 0, 0];
                    break;
                    
                case 'last_month':
                    chartData.labels = ['1-5', '6-10', '11-15', '16-20', '21-25', '26-30'];
                    chartData.datasets.income = [0, 0, 0, 0, 0, 0];
                    chartData.datasets.deposits = [0, 0, 0, 0, 0, 0];
                    chartData.datasets.visits = [0, 0, 0, 0, 0, 0];
                    chartData.datasets.firstDeposits = [0, 0, 0, 0, 0, 0];
                    break;
                    
                case 'all_time':
                    chartData.labels = ['Фев', 'Апр', 'Июн', 'Авг', 'Окт', 'Дек'];
                    chartData.datasets.income = [0, 0, 0, 0, 0, 0];
                    chartData.datasets.deposits = [0, 0, 0, 0, 0, 0];
                    chartData.datasets.visits = [0, 0, 0, 0, 0, 0];
                    chartData.datasets.firstDeposits = [0, 0, 0, 0, 0, 0];
                    break;
            }
            
            updateStatsCards();
            resizeCanvas();
        }
        
        // Глобальная функция для обновления графика с реальными данными
        window.updateChartWithRealData = function(stats) {
            console.log('📊 Обновление графика с реальными данными:', stats);
            
            // Обновляем последнюю точку на графике (сегодня)
            const lastIndex = chartData.datasets.visits.length - 1;
            
            chartData.datasets.visits[lastIndex] = stats.clicks || 0;
            chartData.datasets.firstDeposits[lastIndex] = stats.firstDeposits || 0;
            chartData.datasets.deposits[lastIndex] = parseFloat(stats.totalDeposits) || 0;
            chartData.datasets.income[lastIndex] = parseFloat(stats.earnings) || 0;
            
            // Перерисовываем график
            drawChart();
            
            console.log('✅ График обновлен');
        };
        
        // Функция обновления карточек статистики
        function updateStatsCards() {
            // Вычисляем суммарные значения
            const totalVisits = chartData.datasets.visits.reduce((a, b) => a + b, 0);
            const totalFirstDeposits = chartData.datasets.firstDeposits.reduce((a, b) => a + b, 0);
            const totalDeposits = chartData.datasets.deposits.reduce((a, b) => a + b, 0);
            const totalIncome = chartData.datasets.income.reduce((a, b) => a + b, 0);
            
            // Количество пополнений = количество точек с депозитами > 0
            const depositsCount = chartData.datasets.deposits.filter(d => d > 0).length;
            
            // Стоимость перехода = сумма депозитов / переходы
            const costPerVisit = totalVisits > 0 ? Math.round(totalDeposits / totalVisits) : 0;
            
            // Средний доход с игрока = доход / первые депозиты
            const avgIncomePerPlayer = totalFirstDeposits > 0 ? Math.round(totalIncome / totalFirstDeposits) : 0;
            
            // Обновляем значения в карточках
            const statValues = document.querySelectorAll('.stats-cards .stat-value');
            if (statValues.length >= 6) {
                statValues[0].textContent = totalVisits; // Переходы
                statValues[1].textContent = totalFirstDeposits; // Первые депозиты
                statValues[2].textContent = depositsCount; // Кол-во пополнений
                statValues[3].textContent = totalDeposits + '₽'; // Сумма депозитов
                statValues[4].textContent = costPerVisit + '₽'; // Стоимость перехода
                statValues[5].textContent = avgIncomePerPlayer + '₽'; // Средний доход с игрока
            }
        }

        window.addEventListener('resize', resizeCanvas);
        
        const initialActive = document.querySelector('.date_select .active');
        const datePickerSpan = datePicker ? datePicker.querySelector('span') : null;
        if (initialActive && datePickerSpan) {
            datePickerSpan.textContent = initialActive.textContent;
        }
        
        // Инициализация: обновляем карточки статистики для начального периода
        updateStatsCards();
        resizeCanvas();
    }
})();
