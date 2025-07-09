const fs = require('fs');
const csv = require('csv-parser');

const DEV_TO_USD = 0.0001;
const SBY_TO_USD = 0.0001;

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

function generateNetworkCosts(data) {
    const devCosts = new Array(24).fill(0);
    const sbyCosts = new Array(24).fill(0);
    data.forEach(row => {
        const hour = parseInt(row.Hora.split(' ')[1].split(':')[0]);
        devCosts[hour] += parseFloat(row.Total_DEV) * DEV_TO_USD;
        sbyCosts[hour] += parseFloat(row.Total_SBY) * SBY_TO_USD;
    });
    return { devCosts, sbyCosts };
}

function createHTMLReport(devCosts, sbyCosts) {
    const hours = Array.from({length: 24}, (_, i) => i);
    const labels = hours.map(h => `${h.toString().padStart(2, '0')}:00`);
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Análise de Custos por Rede e Hora</title>
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
        <h1>Análise de Custos por Rede e Hora</h1>
        <div class="chart-container">
            <h3>Custo em Dólares por Hora para Cada Rede</h3>
            <canvas id="networkCostChart"></canvas>
        </div>
        <div class="footer">
            <p>Relatório gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <p>Taxas de conversão: DEV ≈ $0.0001, SBY ≈ $0.0001</p>
        </div>
    </div>
    <script>
        const devData = ${JSON.stringify(devCosts)};
        const sbyData = ${JSON.stringify(sbyCosts)};
        const labels = ${JSON.stringify(labels)};
        const ctx = document.getElementById('networkCostChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Moonbeam (DEV)',
                        data: devData,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'Astar (SBY)',
                        data: sbyData,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        fill: false,
                        tension: 0.1
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
                                return context.dataset.label + ': $' + context.parsed.y.toFixed(6) + ' USD';
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
        const { devCosts, sbyCosts } = generateNetworkCosts(data);
        const html = createHTMLReport(devCosts, sbyCosts);
        fs.writeFileSync('cost-distribution-daily-networks.html', html);
        console.log('✅ Relatório de custos por rede gerado: cost-distribution-daily-networks.html');
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

main(); 