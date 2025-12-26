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
                        pointHoverRadius: 7,
                        pointBackgroundColor: colors.income,
                        pointBorderColor: '#211A1A',
                        pointBorderWidth: 2,
                        tension: 0.4,
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
                        pointHoverRadius: 7,
                        pointBackgroundColor: colors.deposits,
                        pointBorderColor: '#211A1A',
                        pointBorderWidth: 2,
                        tension: 0.4,
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
                        pointHoverRadius: 7,
                        pointBackgroundColor: colors.firstDeposits,
                        pointBorderColor: '#211A1A',
                        pointBorderWidth: 2,
                        tension: 0.4,
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
                        pointHoverRadius: 7,
                        pointBackgroundColor: colors.visits,
                        pointBorderColor: '#211A1A',
                        pointBorderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(33, 26, 26, 0.95)',
                        titleColor: '#C1ACAC',
                        bodyColor: '#C1ACAC',
                        borderColor: '#625252',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    // Форматируем
                                    if (context.datasetIndex === 3) {
                                        label += Math.round(context.parsed.y);
                                    } else {
                                        label += Math.round(context.parsed.y) + '₽';
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
                
                // Toggle active class
                item.classList.toggle('active');
                
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
            const partnerId = localStorage.getItem('userId');
            if (!partnerId) {
                console.log('Partner ID не найден');
                return;
            }

            const response = await fetch(`/api/referral/partner/stats?partnerId=${partnerId}&period=${period}`);
            if (!response.ok) {
                console.error('Ошибка загрузки статистики:', response.status);
                return;
            }

            const stats = await response.json();
            
            if (stats) {
                updateChartWithStats(stats, period);
                updateStatsCards(stats);
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

        if (stats.dailyStats && stats.dailyStats.length > 0) {
            // Данные по дням
            stats.dailyStats.forEach(day => {
                const date = new Date(day.date);
                const formattedDate = date.getDate() + ' ' + getMonthName(date.getMonth());
                
                labels.push(formattedDate);
                income.push(day.earnings || 0);
                deposits.push(day.total_deposits || 0);
                firstDeposits.push(day.first_deposits || 0);
                visits.push(day.clicks || 0);
            });
        } else {
            // Используем дефолтные метки в зависимости от периода
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
            
            // Заполняем нулями
            const length = labels.length;
            income = new Array(length).fill(0);
            deposits = new Array(length).fill(0);
            firstDeposits = new Array(length).fill(0);
            visits = new Array(length).fill(0);
        }

        myChart.data.labels = labels;
        myChart.data.datasets[0].data = income;
        myChart.data.datasets[1].data = deposits;
        myChart.data.datasets[2].data = firstDeposits;
        myChart.data.datasets[3].data = visits;

        myChart.update();
    }

    function updateStatsCards(stats) {
        // Обновление карточек статистики
        const incomeEl = document.querySelector('.stat-value-income');
        const depositsEl = document.querySelector('.stat-value-deposits');
        const clicksEl = document.querySelector('.stat-value-clicks');
        const firstDepositsEl = document.querySelector('.stat-value-first-deposits');

        if (incomeEl && stats.totalEarnings !== undefined) {
            incomeEl.textContent = Math.round(stats.totalEarnings) + '₽';
        }
        if (depositsEl && stats.totalDeposits !== undefined) {
            depositsEl.textContent = Math.round(stats.totalDeposits) + '₽';
        }
        if (clicksEl && stats.totalClicks !== undefined) {
            clicksEl.textContent = stats.totalClicks;
        }
        if (firstDepositsEl && stats.totalFirstDeposits !== undefined) {
            firstDepositsEl.textContent = stats.totalFirstDeposits;
        }
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
