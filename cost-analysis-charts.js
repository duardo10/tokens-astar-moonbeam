const fs = require('fs');

class CostAnalysisCharts {
    constructor() {
        this.costHistoryFile = 'transaction-costs-analysis.json';
        this.costHistory = [];
        this.loadCostHistory();
    }

    loadCostHistory() {
        try {
            if (fs.existsSync(this.costHistoryFile)) {
                const data = fs.readFileSync(this.costHistoryFile, 'utf8');
                this.costHistory = JSON.parse(data);
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error.message);
            this.costHistory = [];
        }
    }

    filterSuccessfulTransactions() {
        return this.costHistory.filter(record => record.success === true);
    }

    groupByHour(transactions) {
        const hourlyData = {};
        
        transactions.forEach(record => {
            const date = new Date(record.timestamp);
            const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
            
            if (!hourlyData[hourKey]) {
                hourlyData[hourKey] = {
                    count: 0,
                    totalDev: 0,
                    totalSby: 0,
                    moonbeamToAstar: 0,
                    astarToMoonbeam: 0
                };
            }
            
            hourlyData[hourKey].count++;
            
            if (record.totalCosts) {
                hourlyData[hourKey].totalDev += parseFloat(record.totalCosts.devSpentReal || record.totalCosts.devSpent || 0);
                hourlyData[hourKey].totalSby += parseFloat(record.totalCosts.sbySpentReal || record.totalCosts.sbySpent || 0);
            }
            
            if (record.direction.includes('Moonbeam -> Astar')) {
                hourlyData[hourKey].moonbeamToAstar++;
            } else if (record.direction.includes('Astar -> Moonbeam')) {
                hourlyData[hourKey].astarToMoonbeam++;
            }
        });
        
        return hourlyData;
    }

    calculateHourlyAverages(hourlyData) {
        const averages = [];
        
        Object.keys(hourlyData).forEach(hour => {
            const data = hourlyData[hour];
            averages.push({
                hour: hour,
                count: data.count,
                avgDev: data.count > 0 ? data.totalDev / data.count : 0,
                avgSby: data.count > 0 ? data.totalSby / data.count : 0,
                moonbeamToAstar: data.moonbeamToAstar,
                astarToMoonbeam: data.astarToMoonbeam,
                totalDev: data.totalDev,
                totalSby: data.totalSby
            });
        });
        
        return averages.sort((a, b) => new Date(a.hour) - new Date(b.hour));
    }

    async generateCharts() {
        const successfulTransactions = this.filterSuccessfulTransactions();
        console.log(`Total de transações bem-sucedidas: ${successfulTransactions.length}`);
        
        if (successfulTransactions.length === 0) {
            console.log('Nenhuma transação bem-sucedida encontrada para análise.');
            return;
        }

        const hourlyData = this.groupByHour(successfulTransactions);
        const averages = this.calculateHourlyAverages(hourlyData);
        
        console.log('\nDADOS POR HORA:');
        console.log('='.repeat(120));
        console.log('| Hora                | Transações | Média DEV | Média SBY | Moon→Astar | Astar→Moon | Total DEV | Total SBY |');
        console.log('|---------------------|------------|-----------|-----------|------------|------------|-----------|-----------|');
        
        averages.forEach(avg => {
            console.log(`| ${avg.hour.padEnd(19)} | ${avg.count.toString().padStart(10)} | ${avg.avgDev.toFixed(8).padStart(9)} | ${avg.avgSby.toFixed(8).padStart(9)} | ${avg.moonbeamToAstar.toString().padStart(10)} | ${avg.astarToMoonbeam.toString().padStart(10)} | ${avg.totalDev.toFixed(8).padStart(9)} | ${avg.totalSby.toFixed(8).padStart(9)} |`);
        });
        
        console.log('='.repeat(120));
        
        // Salvar dados em CSV
        this.exportHourlyDataToCSV(averages);
        
        // Gerar relatório HTML com gráficos
        this.generateHTMLReport(averages);
    }

    exportHourlyDataToCSV(averages) {
        const csvHeader = 'Hora,Transações,Média_DEV,Média_SBY,Moonbeam_to_Astar,Astar_to_Moonbeam,Total_DEV,Total_SBY\n';
        
        const csvData = averages.map(avg => {
            return [
                avg.hour,
                avg.count,
                avg.avgDev.toFixed(8),
                avg.avgSby.toFixed(8),
                avg.moonbeamToAstar,
                avg.astarToMoonbeam,
                avg.totalDev.toFixed(8),
                avg.totalSby.toFixed(8)
            ].join(',');
        }).join('\n');

        const csvContent = csvHeader + csvData;
        const fileName = `hourly-cost-analysis-${new Date().toISOString().split('T')[0]}.csv`;
        
        fs.writeFileSync(fileName, csvContent);
        console.log(`✅ Dados por hora exportados para: ${fileName}`);
    }

    generateHTMLReport(averages) {
        const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Análise de Custos por Hora - Bridge Moonbeam/Astar</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #007bff;
            padding-bottom: 10px;
        }
        .summary {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #007bff;
        }
        .summary h2 {
            color: #007bff;
            margin-top: 0;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .summary-item {
            background: white;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #dee2e6;
        }
        .summary-item strong {
            color: #495057;
        }
        .chart-container {
            margin: 30px 0;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .chart-container h3 {
            color: #333;
            margin-bottom: 20px;
            text-align: center;
        }
        canvas {
            max-height: 400px;
        }
        .data-table {
            margin-top: 30px;
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #007bff;
            color: white;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        tr:hover {
            background-color: #e9ecef;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Análise de Custos por Hora - Bridge Moonbeam/Astar</h1>
        
        <div class="summary">
            <h2>📈 Resumo Geral</h2>
            <div class="summary-grid">
                <div class="summary-item">
                    <strong>Total de Transações:</strong><br>
                    ${averages.reduce((sum, avg) => sum + avg.count, 0)}
                </div>
                <div class="summary-item">
                    <strong>Total DEV Gasto:</strong><br>
                    ${averages.reduce((sum, avg) => sum + avg.totalDev, 0).toFixed(8)} DEV
                </div>
                <div class="summary-item">
                    <strong>Total SBY Gasto:</strong><br>
                    ${averages.reduce((sum, avg) => sum + avg.totalSby, 0).toFixed(8)} SBY
                </div>
                <div class="summary-item">
                    <strong>Média DEV/Transação:</strong><br>
                    ${(averages.reduce((sum, avg) => sum + avg.totalDev, 0) / averages.reduce((sum, avg) => sum + avg.count, 0)).toFixed(8)} DEV
                </div>
                <div class="summary-item">
                    <strong>Média SBY/Transação:</strong><br>
                    ${(averages.reduce((sum, avg) => sum + avg.totalSby, 0) / averages.reduce((sum, avg) => sum + avg.count, 0)).toFixed(8)} SBY
                </div>
                <div class="summary-item">
                    <strong>Horas com Transações:</strong><br>
                    ${averages.filter(avg => avg.count > 0).length}
                </div>
            </div>
        </div>

        <div class="chart-container">
            <h3>💰 Custo Médio por Transação por Hora</h3>
            <canvas id="costChart"></canvas>
        </div>

        <div class="chart-container">
            <h3>📊 Número de Transações por Hora</h3>
            <canvas id="countChart"></canvas>
        </div>

        <div class="chart-container">
            <h3>🔄 Direção das Transações por Hora</h3>
            <canvas id="directionChart"></canvas>
        </div>

        <div class="data-table">
            <h3>📋 Dados Detalhados por Hora</h3>
            <table>
                <thead>
                    <tr>
                        <th>Hora</th>
                        <th>Transações</th>
                        <th>Média DEV</th>
                        <th>Média SBY</th>
                        <th>Moon→Astar</th>
                        <th>Astar→Moon</th>
                        <th>Total DEV</th>
                        <th>Total SBY</th>
                    </tr>
                </thead>
                <tbody>
                    ${averages.map(avg => `
                        <tr>
                            <td>${avg.hour}</td>
                            <td>${avg.count}</td>
                            <td>${avg.avgDev.toFixed(8)}</td>
                            <td>${avg.avgSby.toFixed(8)}</td>
                            <td>${avg.moonbeamToAstar}</td>
                            <td>${avg.astarToMoonbeam}</td>
                            <td>${avg.totalDev.toFixed(8)}</td>
                            <td>${avg.totalSby.toFixed(8)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>📅 Relatório gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <p>🔍 Filtrado apenas transações bem-sucedidas</p>
        </div>
    </div>

    <script>
        // Dados para os gráficos
        const chartData = ${JSON.stringify(averages)};
        const labels = chartData.map(avg => avg.hour);
        
        // Gráfico 1: Custo Médio por Transação
        const costCtx = document.getElementById('costChart').getContext('2d');
        new Chart(costCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Média DEV por Transação',
                        data: chartData.map(avg => avg.avgDev),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        yAxisID: 'y',
                        tension: 0.1
                    },
                    {
                        label: 'Média SBY por Transação',
                        data: chartData.map(avg => avg.avgSby),
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        yAxisID: 'y1',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Hora'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'DEV'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'SBY'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });

        // Gráfico 2: Número de Transações
        const countCtx = document.getElementById('countChart').getContext('2d');
        new Chart(countCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total de Transações',
                        data: chartData.map(avg => avg.count),
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        borderColor: 'rgb(54, 162, 235)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de Transações'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Hora'
                        }
                    }
                }
            }
        });

        // Gráfico 3: Direção das Transações
        const directionCtx = document.getElementById('directionChart').getContext('2d');
        new Chart(directionCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Moonbeam → Astar',
                        data: chartData.map(avg => avg.moonbeamToAstar),
                        backgroundColor: 'rgba(75, 192, 192, 0.8)',
                        borderColor: 'rgb(75, 192, 192)',
                        borderWidth: 1
                    },
                    {
                        label: 'Astar → Moonbeam',
                        data: chartData.map(avg => avg.astarToMoonbeam),
                        backgroundColor: 'rgba(255, 99, 132, 0.8)',
                        borderColor: 'rgb(255, 99, 132)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Hora'
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de Transações'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>
        `;

        const fileName = `cost-analysis-hourly-report-${new Date().toISOString().split('T')[0]}.html`;
        fs.writeFileSync(fileName, htmlContent);
        console.log(`✅ Relatório HTML gerado: ${fileName}`);
    }

    showSummary(averages) {
        console.log('\nRESUMO DA ANÁLISE POR HORA:');
        console.log('='.repeat(80));
        
        const totalTransactions = averages.reduce((sum, avg) => sum + avg.count, 0);
        const totalDev = averages.reduce((sum, avg) => sum + avg.totalDev, 0);
        const totalSby = averages.reduce((sum, avg) => sum + avg.totalSby, 0);
        const totalMoonbeamToAstar = averages.reduce((sum, avg) => sum + avg.moonbeamToAstar, 0);
        const totalAstarToMoonbeam = averages.reduce((sum, avg) => sum + avg.astarToMoonbeam, 0);
        
        console.log(`Total de transações: ${totalTransactions}`);
        console.log(`Total DEV gasto: ${totalDev.toFixed(8)} DEV`);
        console.log(`Total SBY gasto: ${totalSby.toFixed(8)} SBY`);
        console.log(`Moonbeam → Astar: ${totalMoonbeamToAstar} transações`);
        console.log(`Astar → Moonbeam: ${totalAstarToMoonbeam} transações`);
        console.log(`Média DEV por transação: ${(totalDev / totalTransactions).toFixed(8)} DEV`);
        console.log(`Média SBY por transação: ${(totalSby / totalTransactions).toFixed(8)} SBY`);
        
        const hoursWithTransactions = averages.filter(avg => avg.count > 0).length;
        console.log(`Horas com transações: ${hoursWithTransactions}`);
        console.log(`Média de transações por hora: ${(totalTransactions / hoursWithTransactions).toFixed(2)}`);
        
        // Hora com mais transações
        const maxHour = averages.reduce((max, avg) => avg.count > max.count ? avg : max, averages[0]);
        console.log(`Hora com mais transações: ${maxHour.hour} (${maxHour.count} transações)`);
        
        // Hora com menor custo médio
        const minCostHour = averages.reduce((min, avg) => 
            (avg.avgDev + avg.avgSby) < (min.avgDev + min.avgSby) ? avg : min, averages[0]);
        console.log(`Hora com menor custo médio: ${minCostHour.hour} (${(minCostHour.avgDev + minCostHour.avgSby).toFixed(8)} total)`);
    }
}

async function main() {
    const charts = new CostAnalysisCharts();
    
    try {
        await charts.generateCharts();
        const successfulTransactions = charts.filterSuccessfulTransactions();
        const hourlyData = charts.groupByHour(successfulTransactions);
        const averages = charts.calculateHourlyAverages(hourlyData);
        charts.showSummary(averages);
        
        console.log('\n📊 Análise concluída!');
        console.log('   - Relatório HTML com gráficos interativos');
        console.log('   - Dados CSV para análise externa');
        
    } catch (error) {
        console.error('Erro ao gerar análise:', error.message);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = CostAnalysisCharts; 