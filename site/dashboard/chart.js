// ============================================
// ГРАФИК СТАТИСТИКИ С CHART.JS + DATE-PICKER
// ============================================

(function() {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChart);
    } else {
        initChart();
    }

    let myChart = null;
    let currentPeriod = 'week';
    let currentStats = null; // Хранит текущие статистики для пересчёта при скрытии линий
    let currentOffsetMap = {}; // Хранит текущие offset для tooltip
    let currentBaseLift = 3; // Хранит текущий baseLift для tooltip

    // Цвета из скриншота
    const colors = {
        income: '#E84C3D',       // Красный
        deposits: '#5DCCBA',     // Зелёный/бирюзовый
        visits: '#DDDDDD',       // Серый/белый
        firstDeposits: '#E8B84D' // Жёлтый/оранжевый
    };

    function initChart() {
        // Проверяем что Chart.js загружен
        if (typeof Chart === 'undefined') {
            console.error('Chart.js не загружен!');
            setTimeout(initChart, 100); // Пробуем ещё раз через 100ms
            return;
        }

        const canvas = document.getElementById('statisticsChart');
        if (!canvas) {
            console.error('Canvas элемент не найден!');
            return;
        }

        const ctx = canvas.getContext('2d');

        // Конфигурация Chart.js
        const config = {
            type: 'line',
            data: {
                labels: ['10 Дек', '11 Дек', '12 Дек', '13 Дек', '14 Дек', '15 Дек', '16 Дек'],
                datasets: [
                    {
                        label: 'Доход',
                        data: [0, 0, 0, 0, 0, 0, 0],
                        borderColor: colors.income,
                        backgroundColor: colors.income + '25',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: colors.income,
                        pointBorderColor: colors.income,
                        pointBorderWidth: 1,
                        pointHoverBorderWidth: 2,
                        pointHitRadius: 15,
                        tension: 0.4,
                        cubicInterpolationMode: 'monotone',
                        fill: false,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Депозиты',
                        data: [0, 0, 0, 0, 0, 0, 0],
                        borderColor: colors.deposits,
                        backgroundColor: colors.deposits + '25',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: colors.deposits,
                        pointBorderColor: colors.deposits,
                        pointBorderWidth: 1,
                        pointHoverBorderWidth: 2,
                        pointHitRadius: 15,
                        tension: 0.4,
                        cubicInterpolationMode: 'monotone',
                        fill: false,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Первые депозиты',
                        data: [0, 0, 0, 0, 0, 0, 0],
                        borderColor: colors.firstDeposits,
                        backgroundColor: colors.firstDeposits + '25',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: colors.firstDeposits,
                        pointBorderColor: colors.firstDeposits,
                        pointBorderWidth: 1,
                        pointHoverBorderWidth: 2,
                        pointHitRadius: 15,
                        tension: 0.4,
                        cubicInterpolationMode: 'monotone',
                        fill: false,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Переходы',
                        data: [0, 0, 0, 0, 0, 0, 0],
                        borderColor: colors.visits,
                        backgroundColor: colors.visits + '25',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: colors.visits,
                        pointBorderColor: colors.visits,
                        pointBorderWidth: 1,
                        pointHoverBorderWidth: 2,
                        pointHitRadius: 15,
                        tension: 0.4,
                        cubicInterpolationMode: 'monotone',
                        fill: false,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1500,
                    easing: 'easeInOutQuart',
                    onComplete: function() {
                        // После завершения анимации запускаем плавное колебание
                        if (!this.animationComplete) {
                            this.animationComplete = true;
                        }
                    }
                },
                transitions: {
                    active: {
                        animation: {
                            duration: 400
                        }
                    }
                },
                interaction: {
                    mode: 'point',
                    intersect: true
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'point',
                        intersect: true,
                        backgroundColor: 'rgba(33, 26, 26, 0.95)',
                        titleColor: '#C1ACAC',
                        titleFont: {
                            size: 14,
                            weight: 'bold',
                            family: 'Inter, sans-serif'
                        },
                        bodyColor: '#C1ACAC',
                        bodyFont: {
                            size: 13,
                            family: 'Inter, sans-serif'
                        },
                        borderColor: '#625252',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                            title: function(context) {
                                // Показываем только дату
                                return context[0].label;
                            },
                            label: function(context) {
                                let label = context.dataset.label || '';
                                
                                if (context.parsed.y !== null) {
                                    // ВЫЧИТАЕМ OFFSET И BASELIFT ЧТОБЫ ПОКАЗАТЬ РЕАЛЬНОЕ ЗНАЧЕНИЕ!
                                    let realValue = context.parsed.y;
                                    
                                    // Определяем имя метрики по индексу dataset
                                    const metricNames = ['income', 'deposits', 'firstDeposits', 'visits'];
                                    const metricName = metricNames[context.datasetIndex];
                                    
                                    // Вычитаем baseLift и offset
                                    if (currentOffsetMap[metricName] !== undefined) {
                                        realValue = realValue - currentBaseLift - currentOffsetMap[metricName];
                                    }
                                    
                                    // Не показываем отрицательные значения
                                    realValue = Math.max(0, realValue);
                                    
                                    if (label) {
                                        label += ': ';
                                    }
                                    
                                    // Форматируем в зависимости от типа
                                    if (context.datasetIndex === 3) {
                                        // Переходы - без рублей
                                        label += Math.round(realValue).toLocaleString('ru-RU');
                                    } else {
                                        // Деньги - с рублями
                                        label += Math.round(realValue).toLocaleString('ru-RU') + '₽';
                                    }
                                }
                                
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(193, 172, 172, 0.1)',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#9B8585',
                            font: {
                                size: 12,
                                family: 'Inter, sans-serif'
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        min: 0,
                        suggestedMax: 100,
                        grace: '10%',
                        grid: {
                            color: 'rgba(193, 172, 172, 0.1)',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#9B8585',
                            font: {
                                size: 12,
                                family: 'Inter, sans-serif'
                            },
                            callback: function(value) {
                                // Не показываем дробные значения
                                if (value % 1 !== 0) return '';
                                return Math.round(value);
                            },
                            stepSize: function(context) {
                                // Минимальный шаг 100 если данные небольшие
                                const max = context.chart.scales.y.max;
                                if (max <= 10) return 5;
                                if (max <= 100) return 20;
                                if (max <= 500) return 100;
                                return null; // Авто
                            }
                        }
                    }
                }
            }
        };

        // Создаём график
        myChart = new Chart(ctx, config);

        // Настройка обработчиков
        setupLegendHandlers();
        setupDatePicker();
        
        // Загрузка данных
        loadChartData(currentPeriod);
    }

    function setupLegendHandlers() {
        const legendItems = document.querySelectorAll('.legend-item-new');
        
        legendItems.forEach((item, index) => {
            item.addEventListener('click', function() {
                const datasetIndex = index;
                const meta = myChart.getDatasetMeta(datasetIndex);
                
                // Toggle visibility
                meta.hidden = meta.hidden === null ? !myChart.data.datasets[datasetIndex].hidden : null;
                
                // Toggle inactive class (добавляем когда скрыто, убираем когда показано)
                if (meta.hidden) {
                    item.classList.add('inactive');
                    item.classList.remove('active');
                } else {
                    item.classList.remove('inactive');
                    item.classList.add('active');
                }
                
                // ПЕРЕСЧИТЫВАЕМ OFFSET ДЛЯ ВИДИМЫХ ЛИНИЙ
                // Когда скрываем линии, остальные опускаются вниз
                if (currentStats) {
                    recalculateChartData();
                }
                
                myChart.update();
            });
        });
    }

    function recalculateChartData() {
        if (!myChart || !currentStats) return;

        const stats = currentStats;
        const totalEarnings = parseFloat(stats.earnings) || 0;
        const totalDeposits = parseFloat(stats.totalDeposits) || 0;
        const totalFirstDeposits = parseInt(stats.firstDeposits) || 0;
        const totalClicks = parseInt(stats.clicks) || 0;

        // Определяем какие datasets видимы
        const visibleMetrics = [];
        
        if (!myChart.getDatasetMeta(0).hidden) {
            visibleMetrics.push({ name: 'income', value: totalEarnings, index: 0 });
        }
        if (!myChart.getDatasetMeta(1).hidden) {
            visibleMetrics.push({ name: 'deposits', value: totalDeposits, index: 1 });
        }
        if (!myChart.getDatasetMeta(2).hidden) {
            visibleMetrics.push({ name: 'firstDeposits', value: totalFirstDeposits, index: 2 });
        }
        if (!myChart.getDatasetMeta(3).hidden) {
            visibleMetrics.push({ name: 'visits', value: totalClicks, index: 3 });
        }

        // Сортируем ТОЛЬКО ВИДИМЫЕ метрики по значению
        visibleMetrics.sort((a, b) => a.value - b.value);

        // НОВАЯ ЛОГИКА: ОБЩЕЕ расстояние между ВСЕМИ линиями = 10px
        const baseLift = 3;
        const totalSpacing = 10;
        const lineCount = visibleMetrics.length;

        // Создаём карту offset для видимых линий
        const offsetMap = { income: 0, deposits: 0, firstDeposits: 0, visits: 0 };
        
        visibleMetrics.forEach((metric, index) => {
            if (lineCount === 1) {
                offsetMap[metric.name] = totalSpacing / 2;
            } else {
                offsetMap[metric.name] = (index / (lineCount - 1)) * totalSpacing;
            }
        });
        
        // Сохраняем offsetMap для использования в tooltip
        currentOffsetMap = { ...offsetMap };

        console.log('🔄 Recalculate Chart (after legend click):', {
            visibleMetrics: visibleMetrics.map(m => m.name),
            lineCount,
            offsetMap,
            totalSpacing,
            baseLift
        });

        // Генерируем данные с новыми offset
        const length = myChart.data.labels.length;
        
        function generateWavyData(total, pointsCount, offsetValue) {
            // Если метрика = 0, показываем 0 (не фейковые данные!)
            if (total === 0) {
                return new Array(pointsCount).fill(0);
            }
            
            // ПОКАЗЫВАЕМ РЕАЛЬНОЕ ЗНАЧЕНИЕ на всех точках + offset для разделения
            const actualValue = total + baseLift + offsetValue;
            return new Array(pointsCount).fill(actualValue);
        }

        // Обновляем данные для всех datasets с новыми offset
        myChart.data.datasets[0].data = generateWavyData(totalEarnings, length, offsetMap.income);
        myChart.data.datasets[1].data = generateWavyData(totalDeposits, length, offsetMap.deposits);
        myChart.data.datasets[2].data = generateWavyData(totalFirstDeposits, length, offsetMap.firstDeposits);
        myChart.data.datasets[3].data = generateWavyData(totalClicks, length, offsetMap.visits);
    }

    function setupDatePicker() {
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
                
                // Обновляем текст date-picker
                const datePickerSpan = datePicker.querySelector('#datepicker-label');
                if (datePickerSpan) {
                    datePickerSpan.textContent = this.textContent;
                }
                
                const period = this.className.split(' ')[0];
                currentPeriod = period;
                loadChartData(period);
                
                dateSelect.style.display = 'none';
            });
        });
    }

    async function loadChartData(period) {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.error('Токен не найден в localStorage');
                return;
            }

            const response = await fetch(`/api/referral/partner/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.error('Ошибка загрузки статистики:', response.status);
                return;
            }

            const data = await response.json();
            
            if (data && data.stats) {
                updateChartWithStats(data.stats, period);
                updateStatsCards(data.stats);
            }
        } catch (error) {
            console.error('Ошибка загрузки данных графика:', error);
        }
    }

    function updateChartWithStats(stats, period) {
        if (!myChart) return;

        // Сохраняем текущие stats для пересчёта при клике на легенду
        currentStats = stats;

        let labels = [];
        let income = [];
        let deposits = [];
        let firstDeposits = [];
        let visits = [];

        // Создаём метки в зависимости от периода (ВСЕГДА 7 ТОЧЕК)
        switch(period) {
            case 'today':
            case 'yesterday':
                labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'];
                break;
            case 'week':
                labels = ['10 Дек', '11 Дек', '12 Дек', '13 Дек', '14 Дек', '15 Дек', '16 Дек'];
                break;
            case 'month':
            case 'last_month':
                labels = ['1-4', '5-8', '9-12', '13-16', '17-20', '21-24', '25-30'];
                break;
            case 'all_time':
                labels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл'];
                break;
            default:
                labels = ['10 Дек', '11 Дек', '12 Дек', '13 Дек', '14 Дек', '15 Дек', '16 Дек'];
        }

        // Показываем общую статистику на всех точках
        const totalEarnings = parseFloat(stats.earnings) || 0;
        const totalDeposits = parseFloat(stats.totalDeposits) || 0;
        const totalFirstDeposits = parseInt(stats.firstDeposits) || 0;
        const totalClicks = parseInt(stats.clicks) || 0;

        const length = labels.length;
        
        // Находим максимальное значение среди всех метрик для расчёта offset
        const maxValue = Math.max(totalEarnings, totalDeposits, totalFirstDeposits, totalClicks);
        
        // НОВАЯ ЛОГИКА: ОБЩЕЕ расстояние между ВСЕМИ линиями = 10px (не по 10px на каждую!)
        // Базовый лифт: поднимаем все линии на 3px вверх, чтобы нижняя не была совсем внизу
        const baseLift = 3;
        
        // Общее расстояние между всеми линиями
        const totalSpacing = 10;
        
        const hasAnyData = totalEarnings > 0 || totalDeposits > 0 || totalFirstDeposits > 0 || totalClicks > 0;
        
        // ДИНАМИЧЕСКАЯ СОРТИРОВКА: У кого значение больше — тот выше!
        const metrics = [
            { name: 'income', label: 'Доход', value: totalEarnings, datasetIndex: 0 },
            { name: 'deposits', label: 'Депозиты', value: totalDeposits, datasetIndex: 1 },
            { name: 'firstDeposits', label: 'Первые депозиты', value: totalFirstDeposits, datasetIndex: 2 },
            { name: 'visits', label: 'Переходы', value: totalClicks, datasetIndex: 3 }
        ];
        
        // Сортируем по значению: меньшие внизу, большие вверху
        metrics.sort((a, b) => a.value - b.value);
        
        // Присваиваем offset: ОБЩЕЕ расстояние 10px делим на все линии
        // Если 4 линии: 0, 3.33, 6.66, 10
        // Если 3 линии: 0, 5, 10
        // Если 2 линии: 0, 10
        const offsetMap = {};
        const lineCount = metrics.length;
        
        metrics.forEach((metric, index) => {
            if (lineCount === 1) {
                // Одна линия - в центре
                offsetMap[metric.name] = totalSpacing / 2;
            } else {
                // Распределяем равномерно: index / (lineCount - 1) * totalSpacing
                offsetMap[metric.name] = (index / (lineCount - 1)) * totalSpacing;
            }
        });
        
        // Сохраняем offsetMap для использования в tooltip
        currentOffsetMap = { ...offsetMap };
        
        console.log('📊 Chart Debug:', {
            maxValue,
            totalSpacing,
            baseLift,
            lineCount,
            totalEarnings,
            totalDeposits,
            totalFirstDeposits,
            totalClicks,
            sortedMetrics: metrics.map(m => `${m.label}: ${m.value} (offset: ${offsetMap[m.name].toFixed(2)}px + ${baseLift}px lift)`),
            offsetMap
        });
        
        // АКТУАЛЬНЫЕ ДАННЫЕ БЕЗ ВОЛН - показываем реальные значения!
        function generateWavyData(total, pointsCount, offsetValue) {
            // ВАЖНО: Если метрика = 0, показываем 0 (не фейковые данные!)
            if (total === 0) {
                return new Array(pointsCount).fill(0);
            }
            
            // ПОКАЗЫВАЕМ РЕАЛЬНОЕ ЗНАЧЕНИЕ на всех точках + offset для разделения
            // Если переходов = 2, то все точки показывают 2 (не 15!)
            const actualValue = total + baseLift + offsetValue;
            return new Array(pointsCount).fill(actualValue);
        }

        // Создаём данные с ДИНАМИЧЕСКИМ offset (по отсортированным значениям)
        income = generateWavyData(totalEarnings, length, offsetMap.income);
        deposits = generateWavyData(totalDeposits, length, offsetMap.deposits);
        firstDeposits = generateWavyData(totalFirstDeposits, length, offsetMap.firstDeposits);
        visits = generateWavyData(totalClicks, length, offsetMap.visits);

        myChart.data.labels = labels;
        myChart.data.datasets[0].data = income;
        myChart.data.datasets[1].data = deposits;
        myChart.data.datasets[2].data = firstDeposits;
        myChart.data.datasets[3].data = visits;

        myChart.update();
    }

    function updateStatsCards(stats) {
        // Карточки статистики уже обновляются через script.js
        // Просто логируем для отладки
        console.log('Статистика загружена:', stats);
    }

    function getMonthName(month) {
        const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        return months[month];
    }

    // Expose functions globally
    window.chartUtils = {
        loadChartData: loadChartData,
        updateStatsCards: updateStatsCards
    };

})();
