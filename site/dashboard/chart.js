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
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointBackgroundColor: colors.income,
                        pointBorderColor: '#211A1A',
                        pointBorderWidth: 2,
                        pointHoverBorderWidth: 3,
                        pointHitRadius: 10,
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
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointBackgroundColor: colors.deposits,
                        pointBorderColor: '#211A1A',
                        pointBorderWidth: 2,
                        pointHoverBorderWidth: 3,
                        pointHitRadius: 10,
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
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointBackgroundColor: colors.firstDeposits,
                        pointBorderColor: '#211A1A',
                        pointBorderWidth: 2,
                        pointHoverBorderWidth: 3,
                        pointHitRadius: 10,
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
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointBackgroundColor: colors.visits,
                        pointBorderColor: '#211A1A',
                        pointBorderWidth: 2,
                        pointHoverBorderWidth: 3,
                        pointHitRadius: 10,
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
                                return Math.round(value);
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
                
                myChart.update();
            });
        });
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
                
                const datePickerSpan = datePicker.querySelector('span');
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

        let labels = [];
        let income = [];
        let deposits = [];
        let firstDeposits = [];
        let visits = [];

        // Создаём метки в зависимости от периода
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
                labels = ['1-5', '6-10', '11-15', '16-20', '21-25', '26-30'];
                break;
            case 'all_time':
                labels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'];
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
        
        // Равномерно распределяем значения по точкам
        const earningsPerPoint = totalEarnings / length;
        const depositsPerPoint = totalDeposits / length;
        const firstDepositsPerPoint = totalFirstDeposits / length;
        const clicksPerPoint = totalClicks / length;

        income = new Array(length).fill(0).map((_, i) => earningsPerPoint * (i + 1));
        deposits = new Array(length).fill(0).map((_, i) => depositsPerPoint * (i + 1));
        firstDeposits = new Array(length).fill(0).map((_, i) => firstDepositsPerPoint * (i + 1));
        visits = new Array(length).fill(0).map((_, i) => clicksPerPoint * (i + 1));

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
