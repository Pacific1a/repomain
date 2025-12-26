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
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointBackgroundColor: colors.income,
                        pointBorderColor: colors.income,
                        pointBorderWidth: 0,
                        pointHoverBorderWidth: 1,
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
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointBackgroundColor: colors.deposits,
                        pointBorderColor: colors.deposits,
                        pointBorderWidth: 0,
                        pointHoverBorderWidth: 1,
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
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointBackgroundColor: colors.firstDeposits,
                        pointBorderColor: colors.firstDeposits,
                        pointBorderWidth: 0,
                        pointHoverBorderWidth: 1,
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
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointBackgroundColor: colors.visits,
                        pointBorderColor: colors.visits,
                        pointBorderWidth: 0,
                        pointHoverBorderWidth: 1,
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
                                    if (label) {
                                        label += ': ';
                                    }
                                    
                                    // Форматируем в зависимости от типа
                                    if (context.datasetIndex === 3) {
                                        // Переходы - без рублей
                                        label += Math.round(context.parsed.y).toLocaleString('ru-RU');
                                    } else {
                                        // Деньги - с рублями
                                        label += Math.round(context.parsed.y).toLocaleString('ru-RU') + '₽';
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

        // Присваиваем offset только видимым линиям
        const maxValue = Math.max(totalEarnings, totalDeposits, totalFirstDeposits, totalClicks);
        const hasAnyData = totalEarnings > 0 || totalDeposits > 0 || totalFirstDeposits > 0 || totalClicks > 0;
        const baseOffset = hasAnyData ? Math.max(maxValue * 0.08, 10) : 0;

        // Создаём карту offset для видимых линий
        const offsetMap = { income: 0, deposits: 0, firstDeposits: 0, visits: 0 };
        visibleMetrics.forEach((metric, index) => {
            offsetMap[metric.name] = index;
        });

        console.log('🔄 Recalculate Chart (after legend click):', {
            visibleMetrics: visibleMetrics.map(m => m.name),
            offsetMap,
            baseOffset
        });

        // Генерируем данные с новыми offset
        const length = myChart.data.labels.length;
        
        function generateWavyData(total, pointsCount, offsetValue) {
            if (total === 0) {
                return new Array(pointsCount).fill(0);
            }
            
            const data = [];
            const baseValue = total / pointsCount;
            
            for (let i = 0; i < pointsCount; i++) {
                const progress = i / (pointsCount - 1);
                const growthTrend = total * (0.3 + progress * 0.7);
                const randomWave = (Math.random() - 0.5) * baseValue * 0.5;
                const sineWave = Math.sin(i * 0.8) * baseValue * 0.3;
                
                let value = growthTrend + randomWave + sineWave;
                
                if (i === pointsCount - 1) {
                    value = total;
                }
                
                data.push(Math.max(0, value + offsetValue));
            }
            
            return data;
        }

        // Обновляем данные для всех datasets с новыми offset
        myChart.data.datasets[0].data = generateWavyData(totalEarnings, length, baseOffset * offsetMap.income);
        myChart.data.datasets[1].data = generateWavyData(totalDeposits, length, baseOffset * offsetMap.deposits);
        myChart.data.datasets[2].data = generateWavyData(totalFirstDeposits, length, baseOffset * offsetMap.firstDeposits);
        myChart.data.datasets[3].data = generateWavyData(totalClicks, length, baseOffset * offsetMap.visits);
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
        
        // Умный offset: минимум 10 единиц между линиями (вернули обратно!)
        // Когда данные маленькие (0-125) → offset = 10
        // Когда данные большие (125+) → offset = 8% от макс значения
        // НО если ВСЕ метрики = 0, то offset = 0 (не показываем пустые линии)
        const hasAnyData = totalEarnings > 0 || totalDeposits > 0 || totalFirstDeposits > 0 || totalClicks > 0;
        const baseOffset = hasAnyData ? Math.max(maxValue * 0.08, 10) : 0;
        
        // ДИНАМИЧЕСКАЯ СОРТИРОВКА: У кого значение больше — тот выше!
        const metrics = [
            { name: 'income', label: 'Доход', value: totalEarnings, datasetIndex: 0 },
            { name: 'deposits', label: 'Депозиты', value: totalDeposits, datasetIndex: 1 },
            { name: 'firstDeposits', label: 'Первые депозиты', value: totalFirstDeposits, datasetIndex: 2 },
            { name: 'visits', label: 'Переходы', value: totalClicks, datasetIndex: 3 }
        ];
        
        // Сортируем по значению: меньшие внизу, большие вверху
        metrics.sort((a, b) => a.value - b.value);
        
        // Присваиваем offset: первый (самый маленький) = 0, второй = 1×offset, и т.д.
        const offsetMap = {};
        metrics.forEach((metric, index) => {
            offsetMap[metric.name] = index;
        });
        
        console.log('📊 Chart Debug:', {
            maxValue,
            baseOffset,
            totalEarnings,
            totalDeposits,
            totalFirstDeposits,
            totalClicks,
            sortedMetrics: metrics.map(m => `${m.label}: ${m.value} (offset: ${offsetMap[m.name]}×${baseOffset})`),
            offsetMap
        });
        
        // Создаём реалистичные данные с волнами + offset для разделения линий
        function generateWavyData(total, pointsCount, offsetMultiplier = 0) {
            const offset = baseOffset * offsetMultiplier; // Вертикальное смещение
            
            // ВАЖНО: Если метрика = 0, показываем ровно 0 (НЕ offset!)
            // Иначе на графике будут линии при нулевой статистике
            if (total === 0) {
                return new Array(pointsCount).fill(0);
            }
            
            const data = [];
            const baseValue = total / pointsCount; // Средняя высота
            
            for (let i = 0; i < pointsCount; i++) {
                const progress = i / (pointsCount - 1); // От 0 до 1
                
                // Создаём волну с тремя факторами:
                // 1. Общий рост (прогресс к итоговому значению)
                const growthTrend = total * (0.3 + progress * 0.7); // От 30% до 100%
                
                // 2. Случайное колебание ±25%
                const randomWave = (Math.random() - 0.5) * baseValue * 0.5;
                
                // 3. Синусоидальная волна для плавности
                const sineWave = Math.sin(i * 0.8) * baseValue * 0.3;
                
                let value = growthTrend + randomWave + sineWave;
                
                // Последняя точка точно равна total
                if (i === pointsCount - 1) {
                    value = total;
                }
                
                // Добавляем offset для разделения линий + не уходим в минус
                data.push(Math.max(0, value + offset));
            }
            
            return data;
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
