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
            console.error('Chart.js не загружен!');
            setTimeout(initChart, 100);
            return;
        }

        const canvas = document.getElementById('statisticsChart');
        if (!canvas) {
            console.error('Canvas не найден!');
            return;
        }

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
                    fill: true, // ВАЖНО: заполнение под линией!
                    tension: 0.4, // Плавные изгибы
                    pointRadius: 0, // Точки скрыты
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: metrics[currentMetric].color,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
                                if (value % 1 !== 0) return '';
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
        myChart.data.datasets[0].pointHoverBackgroundColor = metric.color;
        
        // Обновляем данные
        const data = extractMetricData(timelineData, currentMetric);
        myChart.data.datasets[0].data = data;
        
        myChart.update();
    }

    function extractMetricData(timeline, metric) {
        const dates = timeline.dates;
        const data = [];
        let cumulative = 0; // КУМУЛЯТИВНОЕ НАКОПЛЕНИЕ (как у курсов валют!)

        dates.forEach(dateStr => {
            const dayData = timeline.timeline[dateStr];
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
                console.error('Токен не найден');
                return;
            }

            const [statsResponse, timelineResponse] = await Promise.all([
                fetch(`/api/referral/partner/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/referral/partner/stats/timeline?period=${period}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!statsResponse.ok || !timelineResponse.ok) {
                console.error('Ошибка загрузки данных');
                return;
            }

            const statsData = await statsResponse.json();
            const timeline = await timelineResponse.json();
            
            if (statsData && statsData.stats && timeline && timeline.timeline) {
                timelineData = timeline; // Сохраняем для переключения метрик
                updateChartWithTimeline(timeline);
                updateStatsCards(statsData.stats);
            }
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }

    function updateChartWithTimeline(timeline) {
        if (!myChart) return;

        // Форматируем даты
        const labels = timeline.dates.map(dateStr => {
            const date = new Date(dateStr);
            const day = date.getDate();
            const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
            const month = monthNames[date.getMonth()];
            return `${day} ${month}`;
        });

        // Извлекаем данные для текущей метрики
        const data = extractMetricData(timeline, currentMetric);

        console.log('📊 Chart updated:', {
            metric: currentMetric,
            labels: labels,
            data: data
        });

        myChart.data.labels = labels;
        myChart.data.datasets[0].data = data;
        myChart.update();
    }

    function updateStatsCards(stats) {
        const statValues = document.querySelectorAll('.stat-value');
        if (statValues.length >= 6) {
            statValues[0].textContent = stats.clicks || 0;
            statValues[1].textContent = stats.firstDeposits || 0;
            statValues[2].textContent = stats.deposits || 0;
            statValues[3].textContent = (parseFloat(stats.totalDeposits) || 0).toFixed(2) + '₽';
            statValues[4].textContent = (parseFloat(stats.costPerClick) || 0).toFixed(2) + '₽';
            statValues[5].textContent = (parseFloat(stats.earnings) || 0).toFixed(2) + '₽';
        }
    }

    // Запуск при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChart);
    } else {
        initChart();
    }
})();
