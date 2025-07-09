const fs = require('fs');
const csv = require('csv-parser');

// Taxas de conversão aproximadas (você pode ajustar conforme necessário)
const DEV_TO_USD = 0.0001; // 1 DEV ≈ $0.0001
const SBY_TO_USD = 0.0001; // 1 SBY ≈ $0.0001

function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

function generateDailyCostDistribution(data) {
    // Agrupar por hora do dia (0-23)
    const hourlyCosts = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);
    
    data.forEach(row => {
        const hour = parseInt(row.Hora.split(' ')[1].split(':')[0]);
        const totalDevUSD = parseFloat(row.Total_DEV) * DEV_TO_USD;
        const totalSbyUSD = parseFloat(row.Total_SBY) * SBY_TO_USD;
        const totalUSD = totalDevUSD + totalSbyUSD;
        
        hourlyCosts[hour] += totalUSD;
        hourlyCounts[hour] += parseInt(row.Transações);
    });
    
    return { hourlyCosts, hourlyCounts };
}

function createHTMLReport(hourlyCosts, hourlyCounts) {
    const hours = Array.from({length: 24}, (_, i) => i);
    const labels = hours.map(h => `${h.toString().padStart(2, '0')}:00`);
    
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Distribuição de Custos por Hora do Dia</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1000px;
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
        <h1>Distribuição de Custos por Hora do Dia</h1>
        
        <div class="summary">
            <h2>Resumo</h2>
            <div class="summary-grid">
                <div class="summary-item">
                    <strong>Total de Custos:</strong><br>
                    $${hourlyCosts.reduce((a, b) => a + b, 0).toFixed(6)} USD
                </div>
                <div class="summary-item">
                    <strong>Hora de Pico:</strong><br>
                    ${hourlyCosts.indexOf(Math.max(...hourlyCosts))}:00
                </div>
                <div class="summary-item">
                    <strong>Custo Médio por Hora:</strong><br>
                    $${(hourlyCosts.reduce((a, b) => a + b, 0) / 24).toFixed(6)} USD
                </div>
                <div class="summary-item">
                    <strong>Horas com Atividade:</strong><br>
                    ${hourlyCosts.filter(cost => cost > 0).length}
                </div>
            </div>
        </div>

        <div class="chart-container">
            <h3>Distribuição de Custos por Hora do Dia (USD)</h3>
            <canvas id="costChart"></canvas>
        </div>

        <div class="footer">
            <p>Relatório gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <p>Taxas de conversão: DEV ≈ $0.0001, SBY ≈ $0.0001</p>
        </div>
    </div>

    <script>
        const chartData = ${JSON.stringify(hourlyCosts)};
        const labels = ${JSON.stringify(labels)};
        
        const costCtx = document.getElementById('costChart').getContext('2d');
        new Chart(costCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Custo Total (USD)',
                        data: chartData,
                        backgroundColor: 'rgba(75, 192, 192, 0.8)',
                        borderColor: 'rgb(75, 192, 192)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Custo: $' + context.parsed.y.toFixed(6) + ' USD';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Custo (USD)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(6);
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Hora do Dia'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;

    return html;
}

async function main() {
    try {
        const data = await parseCSV('hourly-cost-analysis-2025-07-01.csv');
        const { hourlyCosts, hourlyCounts } = generateDailyCostDistribution(data);
        
        const html = createHTMLReport(hourlyCosts, hourlyCounts);
        fs.writeFileSync('cost-distribution-daily.html', html);
        
        console.log('✅ Relatório de distribuição diária gerado: cost-distribution-daily.html');
        
        // Log dos dados para verificação
        console.log('\n📊 Dados por hora:');
        hourlyCosts.forEach((cost, hour) => {
            if (cost > 0) {
                console.log(`${hour.toString().padStart(2, '0')}:00 - $${cost.toFixed(6)} USD`);
            }
        });
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

main(); 