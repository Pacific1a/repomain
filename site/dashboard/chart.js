// ГРАФИК КАК У КУРСОВ ВАЛЮТ - ОДНА ЛИНИЯ С GRADIENT FILL

(function() {
    'use strict';

    let myChart = null;
    let currentPeriod = 'week';
    let currentMetric = 'visits'; // По умолчанию - Переходы
    let timelineData = null; // Храним данные timeline

    // Цвета и конфигурация метрик
    const metrics = {
        visits: {
            label: 'Переходы',
            color: '#DDDDDD',
            gradient: ['rgba(221, 221, 221, 0.3)', 'rgba(221, 221, 221, 0)']
        },
        income: {
            label: 'Доход',
            color: '#E84C3D',
            gradient: ['rgba(232, 76, 61, 0.3)', 'rgba(232, 76, 61, 0)']
        },
        deposits: {
            label: 'Депозиты',
            color: '#5DCCBA',
            gradient: ['rgba(93, 204, 186, 0.3)', 'rgba(93, 204, 186, 0)']
        },
        firstDeposits: {
            label: 'Первые депозиты',
            color: '#E8B84D',
            gradient: ['rgba(232, 184, 77, 0.3)', 'rgba(232, 184, 77, 0)']
        }
    };

    function initChart() {
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js не загружен!');
            setTimeout(initChart, 100);
            return;
        }

        const canvas = document.getElementById('statisticsChart');
        if (!canvas) {
            console.error('❌ Canvas не найден!');
            return;
        }
        
        console.log('✅ Инициализация графика...');

        const ctx = canvas.getContext('2d');

        // Создаём gradient для fill
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, metrics[currentMetric].gradient[0]);
        gradient.addColorStop(1, metrics[currentMetric].gradient[1]);

        const config = {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: metrics[currentMetric].label,
                    data: [],
                    borderColor: metrics[currentMetric].color,
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5, // Точки ВСЕГДА видны
                    pointHoverRadius: 5, // При наведении НЕ увеличиваются
                    pointBackgroundColor: metrics[currentMetric].color,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: metrics[currentMetric].color,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    clip: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 5,
                        right: 5
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false // Легенда скрыта (используем кнопки)
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
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
                                return context[0].label;
                            },
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (context.parsed.y !== null) {
                                    label += ': ';
                                    if (currentMetric === 'visits' || currentMetric === 'firstDeposits') {
                                        label += Math.round(context.parsed.y).toLocaleString('ru-RU');
                                    } else {
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
                        display: true,
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: '#C1ACAC',
                            font: {
                                size: 11,
                                family: 'Inter, sans-serif'
                            },
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 7, // МЕНЬШЕ меток на X-axis (было 10)
                            autoSkipPadding: 30 // БОЛЬШЕ отступ между метками
                        }
                    },
                    y: {
                        display: true,
                        position: 'right',
                        beginAtZero: true, // Всегда начинать с нуля (НЕТ отрицательных значений!)
                        grace: '5%', // Добавить 5% сверху (только вверх!)
                        min: 0, // Минимум всегда 0
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#C1ACAC',
                            font: {
                                size: 11,
                                family: 'Inter, sans-serif'
                            },
                            padding: 10,
                            precision: 0, // Только целые числа (БЕЗ дублей!)
                            maxTicksLimit: 6, // Максимум 6 меток на Y-axis
                            callback: function(value) {
                                // Не показываем отрицательные значения
                                if (value < 0) return '';
                                
                                // Округляем большие числа
                                if (value >= 1000) {
                                    return (value / 1000).toFixed(1) + 'k';
                                }
                                return Math.round(value);
                            }
                        }
                    }
                }
            }
        };

        myChart = new Chart(ctx, config);

        // Настройка обработчиков
        setupMetricButtons();
        setupDatePicker();
        
        // Загрузка данных
        loadChartData(currentPeriod);
    }

    function setupMetricButtons() {
        const metricBtns = document.querySelectorAll('.metric-btn');
        
        metricBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // Убираем active со всех кнопок
                metricBtns.forEach(b => b.classList.remove('active'));
                
                // Добавляем active к текущей
                this.classList.add('active');
                
                // Меняем текущую метрику
                currentMetric = this.dataset.metric;
                
                console.log('📊 Metric changed:', currentMetric);
                
                // Обновляем график
                updateChartMetric();
            });
        });
    }

    function updateChartMetric() {
        if (!myChart || !timelineData) return;

        const metric = metrics[currentMetric];
        const ctx = myChart.canvas.getContext('2d');
        
        // Создаём новый gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, metric.gradient[0]);
        gradient.addColorStop(1, metric.gradient[1]);

        // Обновляем dataset
        myChart.data.datasets[0].label = metric.label;
        myChart.data.datasets[0].borderColor = metric.color;
        myChart.data.datasets[0].backgroundColor = gradient;
        myChart.data.datasets[0].pointBackgroundColor = metric.color; // Цвет точек!
        myChart.data.datasets[0].pointHoverBackgroundColor = metric.color;
        
        // Обновляем график через updateChartWithTimeline (чтобы была группировка в 7 точек)
        updateChartWithTimeline(timelineData);
    }

    function extractMetricData(timeline, metric) {
        const dates = timeline.dates;
        const data = [];
        let cumulative = 0; // КУМУЛЯТИВНОЕ НАКОПЛЕНИЕ (как у курсов валют!)

        dates.forEach(dateStr => {
            const dayData = timeline.timeline[dateStr];
            
            if (!dayData) {
                console.warn(`⚠️ No data for date: ${dateStr}`);
                data.push(cumulative);
                return;
            }
            
            let value = 0;

            switch(metric) {
                case 'visits':
                    value = dayData.clicks || 0;
                    break;
                case 'income':
                    value = dayData.earnings || 0;
                    break;
                case 'deposits':
                    value = dayData.depositsAmount || 0;
                    break;
                case 'firstDeposits':
                    value = dayData.firstDeposits || 0;
                    break;
            }

            cumulative += value; // Накапливаем!
            data.push(cumulative);
        });

        console.log('📊 extractMetricData:', {
            metric: metric,
            dates: dates,
            dataPoints: data.length,
            firstValue: data[0],
            lastValue: data[data.length - 1],
            cumulative: cumulative
        });

        return data;
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
                
                const datePickerSpan = datePicker.querySelector('#datepicker-label');
                if (datePickerSpan) {
                    datePickerSpan.textContent = this.textContent;
                }
                
                const periodClass = this.className.split(' ')[0];
                
                const periodMap = {
                    'today': 'week',
                    'yesterday': 'week',
                    'week': 'week',
                    'month': 'month',
                    'last_month': 'month',
                    'all_time': 'year'
                };
                
                const period = periodMap[periodClass] || 'week';
                currentPeriod = period;
                
                console.log('📅 Period changed:', { periodClass, apiPeriod: period });
                
                loadChartData(period);
                
                dateSelect.style.display = 'none';
            });
        });
    }

    async function loadChartData(period) {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.error('❌ Токен не найден');
                return;
            }

            console.log(`📥 Загрузка данных графика (period: ${period})...`);

            const [statsResponse, timelineResponse] = await Promise.all([
                fetch(`/api/referral/partner/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/referral/partner/stats/timeline?period=${period}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!statsResponse.ok || !timelineResponse.ok) {
                console.error('❌ Ошибка загрузки данных');
                return;
            }

            const statsData = await statsResponse.json();
            const timeline = await timelineResponse.json();
            
            console.log('🔍 API Response:', {
                statsData: statsData,
                timelineDates: timeline.dates,
                timelineLength: timeline.dates ? timeline.dates.length : 0,
                firstDate: timeline.dates ? timeline.dates[0] : null,
                lastDate: timeline.dates ? timeline.dates[timeline.dates.length - 1] : null,
                sampleData: timeline.dates && timeline.dates[0] ? timeline.timeline[timeline.dates[0]] : null
            });
            
            if (timeline && timeline.dates && timeline.dates.length > 0) {
                timelineData = timeline; // Сохраняем для переключения метрик
                updateChartWithTimeline(timeline);
                
                if (statsData) {
                    updateStatsCards(statsData);
                }
                
                console.log('✅ Данные загружены и график обновлён');
            } else {
                console.warn('⚠️ Нет данных для графика');
                // Показываем пустой график
                if (myChart) {
                    myChart.data.labels = [];
                    myChart.data.datasets[0].data = [];
                    myChart.update();
                }
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
        }
    }

    function updateChartWithTimeline(timeline) {
        if (!myChart) {
            console.error('❌ График не инициализирован');
            return;
        }

        if (!timeline || !timeline.dates || timeline.dates.length === 0) {
            console.warn('⚠️ Нет данных timeline');
            return;
        }

        // Извлекаем ВСЕ данные для текущей метрики
        const allData = extractMetricData(timeline, currentMetric);
        const allDates = timeline.dates;

        // ГРУППИРУЕМ данные в РОВНО 7 точек
        const MAX_POINTS = 7;
        let labels = [];
        let data = [];

        if (allDates.length <= MAX_POINTS) {
            // Если данных мало - показываем все
            labels = allDates.map(dateStr => formatDateLabel(dateStr));
            data = allData;
        } else {
            // Группируем данные - РОВНО 7 точек
            for (let i = 0; i < MAX_POINTS; i++) {
                // Вычисляем индекс точки равномерно распределяя по всем данным
                const index = Math.floor((i / (MAX_POINTS - 1)) * (allDates.length - 1));
                
                labels.push(formatDateLabel(allDates[index]));
                data.push(allData[index]); // Кумулятивное значение
            }
        }

        console.log('📊 updateChartWithTimeline:', {
            metric: currentMetric,
            originalPoints: allDates.length,
            groupedPoints: labels.length,
            labels: labels,
            data: data
        });

        myChart.data.labels = labels;
        myChart.data.datasets[0].data = data;
        
        // Точки ВСЕГДА видны, размер 5
        myChart.data.datasets[0].pointRadius = 5;
        myChart.data.datasets[0].pointHoverRadius = 5;
        
        console.log(`✅ График обновлён (${labels.length} точек)`);
        
        myChart.update('active');
    }

    function formatDateLabel(dateStr) {
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        
        // Для разных периодов - разный формат
        if (currentPeriod === 'week') {
            // Неделя: короткий день недели + дата
            const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
            const weekday = weekdays[date.getDay()];
            return `${weekday} ${day}.${month < 10 ? '0' + month : month}`;
        } else if (currentPeriod === 'month') {
            // Месяц: только дата
            return `${day}.${month < 10 ? '0' + month : month}`;
        } else if (currentPeriod === 'year') {
            // Год: месяц + день
            const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
            const monthName = months[date.getMonth()];
            return `${day} ${monthName}`;
        } else {
            // По умолчанию
            return `${day}.${month < 10 ? '0' + month : month}`;
        }
    }

    function updateStatsCards(stats) {
        console.log('📊 Обновление карточек статистики:', stats);
        
        const statValues = document.querySelectorAll('.stat-value');
        if (statValues.length >= 6) {
            statValues[0].textContent = stats.clicks || 0;
            statValues[1].textContent = stats.firstDeposits || 0;
            statValues[2].textContent = stats.deposits || 0;
            statValues[3].textContent = (parseFloat(stats.totalDeposits) || 0).toFixed(2) + '₽';
            statValues[4].textContent = (parseFloat(stats.costPerClick) || 0).toFixed(2) + '₽';
            statValues[5].textContent = (parseFloat(stats.avgIncomePerPlayer) || 0).toFixed(2) + '₽';
            
            console.log('✅ Карточки обновлены');
        } else {
            console.warn('⚠️ Не найдены элементы .stat-value');
        }
    }

    // Запуск при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChart);
    } else {
        initChart();
    }
})();
