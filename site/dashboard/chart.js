// ============================================
// СТАТИСТИКА С CHART.JS
// ============================================

(function() {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChart);
    } else {
        initChart();
    }

    let myChart = null;

    function initChart() {
        const canvas = document.getElementById('statisticsChart');
        if (!canvas) {
            console.error('Canvas элемент не найден!');
            return;
        }

        const ctx = canvas.getContext('2d');
        
        // Тестовые данные для графика
        const chartData = {
            labels: ['10 Дек', '11 Дек', '12 Дек', '13 Дек', '14 Дек', '15 Дек', '16 Дек'],
            datasets: {
                income: [0, 0, 0, 0, 0, 0, 0],
                deposits: [0, 0, 0, 0, 0, 0, 0],
                visits: [0, 0, 0, 0, 0, 0, 0],
                firstDeposits: [0, 0, 0, 0, 0, 0, 0]
            }
        };

        const colors = {
            income: '#E84C3D',
            deposits: '#5DCCBA',
            visits: '#DDDDDD',
            firstDeposits: '#E8B84D'
        };

        // Конфигурация Chart.js
        const config = {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        label: 'Доход',
                        data: chartData.datasets.income,
                        borderColor: colors.income,
                        backgroundColor: colors.income + '20',
                        borderWidth: 2.5,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: colors.income,
                        pointBorderColor: '#211A1A',
                        pointBorderWidth: 2,
                        tension: 0.4, // Плавные линии
                        fill: true
                    },
                    {
                        label: 'Депозиты',
                        data: chartData.datasets.deposits,
                        borderColor: colors.deposits,
                        backgroundColor: colors.deposits + '20',
                        borderWidth: 2.5,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: colors.deposits,
                        pointBorderColor: '#211A1A',
                        pointBorderWidth: 2,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Первые депозиты',
                        data: chartData.datasets.firstDeposits,
                        borderColor: colors.firstDeposits,
                        backgroundColor: colors.firstDeposits + '20',
                        borderWidth: 2.5,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: colors.firstDeposits,
                        pointBorderColor: '#211A1A',
                        pointBorderWidth: 2,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Переходы',
                        data: chartData.datasets.visits,
                        borderColor: colors.visits,
                        backgroundColor: colors.visits + '20',
                        borderWidth: 2.5,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: colors.visits,
                        pointBorderColor: '#211A1A',
                        pointBorderWidth: 2,
                        tension: 0.4,
                        fill: true
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
                        display: false // Используем свою легенду
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
                                    // Форматируем в зависимости от типа данных
                                    if (context.datasetIndex < 3) {
                                        label += context.parsed.y + '₽';
                                    } else {
                                        label += context.parsed.y;
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
                            }
                        }
                    }
                }
            }
        };

        // Создаём график
        myChart = new Chart(ctx, config);

        // Обработка кликов на легенду
        setupLegendHandlers();
        
        // Загрузка реальных данных
        loadChartData();
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

    async function loadChartData() {
        try {
            const partnerId = localStorage.getItem('userId');
            if (!partnerId) return;

            const response = await fetch(`/api/referral/partner/stats?partnerId=${partnerId}`);
            if (!response.ok) return;

            const stats = await response.json();
            
            if (stats && stats.dailyStats) {
                updateChartData(stats.dailyStats);
            }
        } catch (error) {
            console.error('Ошибка загрузки данных графика:', error);
        }
    }

    function updateChartData(dailyStats) {
        if (!myChart || !dailyStats || dailyStats.length === 0) return;

        const labels = [];
        const income = [];
        const deposits = [];
        const firstDeposits = [];
        const visits = [];

        dailyStats.forEach(day => {
            const date = new Date(day.date);
            const formattedDate = date.getDate() + ' ' + getMonthName(date.getMonth());
            
            labels.push(formattedDate);
            income.push(day.earnings || 0);
            deposits.push(day.deposits || 0);
            firstDeposits.push(day.first_deposits || 0);
            visits.push(day.clicks || 0);
        });

        myChart.data.labels = labels;
        myChart.data.datasets[0].data = income;
        myChart.data.datasets[1].data = deposits;
        myChart.data.datasets[2].data = firstDeposits;
        myChart.data.datasets[3].data = visits;

        myChart.update();
    }

    function getMonthName(month) {
        const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        return months[month];
    }

    // Expose functions globally if needed
    window.chartUtils = {
        updateChartData: updateChartData,
        loadChartData: loadChartData
    };

})();
