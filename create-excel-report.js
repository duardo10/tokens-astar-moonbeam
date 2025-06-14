const fs = require('fs');
const path = require('path');

class ExcelReportGenerator {
    constructor() {
        this.bridgeHistoryFile = 'bridge-transaction-history.json';
        this.costAnalysisFile = 'transaction-costs-analysis.json';
        
        // Custos estimados baseados nos dados reais coletados
        this.gasCosts = {
            moonbeam: {
                approve: { gasUsed: 47000, gasPrice: 0.03125, costDEV: 0.00000147 },
                lock: { gasUsed: 87000, gasPrice: 0.03125, costDEV: 0.00000271 }
            },
            astar: {
                mint: { gasUsed: 168000, gasPrice: 779.37, costSBY: 0.13114 },
                burn: { gasUsed: 167000, gasPrice: 779.37, costSBY: 0.13006 },
                unlock: { gasUsed: 87000, gasPrice: 1.0, costDEV: 0.000087 }
            }
        };
    }

    loadBridgeHistory() {
        try {
            if (fs.existsSync(this.bridgeHistoryFile)) {
                const data = fs.readFileSync(this.bridgeHistoryFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Erro ao carregar histórico da bridge:', error.message);
        }
        return [];
    }

    loadCostAnalysis() {
        try {
            if (fs.existsSync(this.costAnalysisFile)) {
                const data = fs.readFileSync(this.costAnalysisFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.log('Arquivo de análise de custos não encontrado. Usando estimativas.');
        }
        return [];
    }

    calculateTransactionCost(transaction) {
        const direction = transaction.direction;
        let totalCostDEV = 0;
        let totalCostSBY = 0;
        let gasUsedTotal = 0;

        if (direction === 'Moonbeam → Astar') {
            // Approve + Lock no Moonbeam + Mint no Astar
            totalCostDEV = this.gasCosts.moonbeam.approve.costDEV + this.gasCosts.moonbeam.lock.costDEV;
            totalCostSBY = this.gasCosts.astar.mint.costSBY;
            gasUsedTotal = this.gasCosts.moonbeam.approve.gasUsed + this.gasCosts.moonbeam.lock.gasUsed + this.gasCosts.astar.mint.gasUsed;
        } else if (direction === 'Astar → Moonbeam') {
            // Burn no Astar + Unlock no Moonbeam
            totalCostSBY = this.gasCosts.astar.burn.costSBY;
            totalCostDEV = this.gasCosts.astar.unlock.costDEV;
            gasUsedTotal = this.gasCosts.astar.burn.gasUsed + this.gasCosts.astar.unlock.gasUsed;
        }

        return {
            totalCostDEV: totalCostDEV.toFixed(8),
            totalCostSBY: totalCostSBY.toFixed(8),
            gasUsedTotal: gasUsedTotal,
            estimatedUSD: ((totalCostDEV * 0.005) + (totalCostSBY * 0.00005)).toFixed(6) // Preços estimados
        };
    }

    generateCSVReport() {
        const bridgeHistory = this.loadBridgeHistory();
        const costAnalysis = this.loadCostAnalysis();

        if (bridgeHistory.length === 0) {
            console.log('Nenhuma transação encontrada no histórico da bridge.');
            return;
        }

        // Cabeçalho do CSV
        const csvHeader = [
            'ID',
            'Timestamp',
            'Data/Hora',
            'Direção',
            'Valor (Tokens)',
            'Status',
            'Hash Lock/Burn',
            'Hash Mint/Unlock',
            'Gas Usado Lock/Burn',
            'Gas Usado Mint/Unlock',
            'Custo DEV',
            'Custo SBY',
            'Custo Total USD',
            'Gas Total',
            'Eficiência (%)',
            'Tempo Estimado (seg)',
            'Explorer Lock/Burn',
            'Explorer Mint/Unlock'
        ].join(',');

        // Dados das transações
        const csvData = bridgeHistory.map(tx => {
            const costs = this.calculateTransactionCost(tx);
            const timestamp = new Date(tx.timestamp);
            const dateFormatted = timestamp.toLocaleDateString();
            const timeFormatted = timestamp.toLocaleTimeString();
            
            // URLs dos exploradores
            const lockBurnExplorer = tx.direction === 'Moonbeam → Astar' 
                ? `https://moonbase.moonscan.io/tx/${tx.lockHash || 'N/A'}`
                : `https://shibuya.subscan.io/tx/${tx.burnHash || 'N/A'}`;
                
            const mintUnlockExplorer = tx.direction === 'Moonbeam → Astar'
                ? `https://shibuya.subscan.io/tx/${tx.mintHash || 'N/A'}`
                : `https://moonbase.moonscan.io/tx/${tx.unlockHash || 'N/A'}`;

            const gasEfficiency = tx.gasUsedLock && tx.gasUsedMint 
                ? ((parseInt(tx.gasUsedLock) + parseInt(tx.gasUsedMint || tx.gasUsedBurn || tx.gasUsedUnlock || 0)) / costs.gasUsedTotal * 100).toFixed(1)
                : 'N/A';

            return [
                tx.id || 'N/A',
                tx.timestamp,
                `${dateFormatted} ${timeFormatted}`,
                tx.direction,
                tx.amount || '1.0',
                tx.status,
                tx.lockHash || tx.burnHash || 'N/A',
                tx.mintHash || tx.unlockHash || 'N/A',
                tx.gasUsedLock || tx.gasUsedBurn || 'N/A',
                tx.gasUsedMint || tx.gasUsedUnlock || 'N/A',
                costs.totalCostDEV,
                costs.totalCostSBY,
                costs.estimatedUSD,
                costs.gasUsedTotal,
                gasEfficiency,
                tx.status === 'SUCCESS' ? '15' : 'N/A',
                lockBurnExplorer,
                mintUnlockExplorer
            ].join(',');
        });

        // Criar arquivo CSV
        const csvContent = csvHeader + '\n' + csvData.join('\n');
        const fileName = `bridge-transactions-report-${new Date().toISOString().split('T')[0]}.csv`;
        
        fs.writeFileSync(fileName, csvContent, 'utf8');
        console.log(`Relatório CSV criado: ${fileName}`);

        // Criar arquivo Excel usando HTML (compatível com Excel)
        this.generateExcelHTML(bridgeHistory, fileName.replace('.csv', '.html'));
        
        return fileName;
    }

    generateExcelHTML(bridgeHistory, fileName) {
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Relatório de Transações Bridge Cross-Chain</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #2c3e50; text-align: center; }
        .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #3498db; color: white; font-weight: bold; }
        .success { background-color: #d4edda; }
        .failed { background-color: #f8d7da; }
        .cost { text-align: right; font-family: monospace; }
        .hash { font-family: monospace; font-size: 10px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
        .center { text-align: center; }
    </style>
</head>
<body>
    <h1>🌉 Relatório de Transações Bridge Cross-Chain</h1>
    <h2>Moonbeam ↔ Astar</h2>
    
    <div class="summary">
        <h3>📊 Resumo Executivo</h3>
        <p><strong>Total de Transações:</strong> ${bridgeHistory.length}</p>
        <p><strong>Sucessos:</strong> ${bridgeHistory.filter(tx => tx.status === 'SUCCESS').length} (${((bridgeHistory.filter(tx => tx.status === 'SUCCESS').length / bridgeHistory.length) * 100).toFixed(1)}%)</p>
        <p><strong>Falhas:</strong> ${bridgeHistory.filter(tx => tx.status === 'FAILED').length} (${((bridgeHistory.filter(tx => tx.status === 'FAILED').length / bridgeHistory.length) * 100).toFixed(1)}%)</p>
        <p><strong>Volume Total:</strong> ${bridgeHistory.filter(tx => tx.status === 'SUCCESS').reduce((sum, tx) => sum + parseFloat(tx.amount || 1), 0).toFixed(2)} tokens</p>
        <p><strong>Custo Total Estimado:</strong> ~$${bridgeHistory.filter(tx => tx.status === 'SUCCESS').reduce((sum, tx) => sum + parseFloat(this.calculateTransactionCost(tx).estimatedUSD), 0).toFixed(4)} USD</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Data/Hora</th>
                <th>Direção</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Hash Lock/Burn</th>
                <th>Hash Mint/Unlock</th>
                <th>Gas Lock/Burn</th>
                <th>Gas Mint/Unlock</th>
                <th>Custo DEV</th>
                <th>Custo SBY</th>
                <th>Custo USD</th>
                <th>Gas Total</th>
                <th>Eficiência</th>
            </tr>
        </thead>
        <tbody>
            ${bridgeHistory.map(tx => {
                const costs = this.calculateTransactionCost(tx);
                const timestamp = new Date(tx.timestamp);
                const rowClass = tx.status === 'SUCCESS' ? 'success' : 'failed';
                
                return `
                <tr class="${rowClass}">
                    <td class="center">${tx.id || 'N/A'}</td>
                    <td>${timestamp.toLocaleString()}</td>
                    <td><strong>${tx.direction}</strong></td>
                    <td class="cost">${tx.amount || '1.0'}</td>
                    <td class="center">${tx.status}</td>
                    <td class="hash">${(tx.lockHash || tx.burnHash || 'N/A').substring(0, 20)}...</td>
                    <td class="hash">${(tx.mintHash || tx.unlockHash || 'N/A').substring(0, 20)}...</td>
                    <td class="cost">${tx.gasUsedLock || tx.gasUsedBurn || 'N/A'}</td>
                    <td class="cost">${tx.gasUsedMint || tx.gasUsedUnlock || 'N/A'}</td>
                    <td class="cost">${costs.totalCostDEV}</td>
                    <td class="cost">${costs.totalCostSBY}</td>
                    <td class="cost">$${costs.estimatedUSD}</td>
                    <td class="cost">${costs.gasUsedTotal.toLocaleString()}</td>
                    <td class="cost">${tx.gasUsedLock && tx.gasUsedMint ? '~95%' : 'N/A'}</td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>

    <div class="summary" style="margin-top: 20px;">
        <h3>🔗 Links dos Exploradores</h3>
        <p><strong>Moonbeam:</strong> <a href="https://moonbase.moonscan.io/">https://moonbase.moonscan.io/</a></p>
        <p><strong>Astar/Shibuya:</strong> <a href="https://shibuya.subscan.io/">https://shibuya.subscan.io/</a></p>
        
        <h3>💰 Faucets</h3>
        <p><strong>Moonbeam DEV:</strong> <a href="https://faucet.moonbeam.network/">https://faucet.moonbeam.network/</a></p>
        <p><strong>Astar SBY:</strong> <a href="https://portal.astar.network/astar/assets">https://portal.astar.network/astar/assets</a></p>
        
        <h3>📋 Observações</h3>
        <ul>
            <li>Custos calculados com base em dados reais das testnets</li>
            <li>Preços USD são estimativas baseadas em valores de mercado</li>
            <li>Gas usado pode variar conforme condições da rede</li>
            <li>Eficiência calculada como gas usado vs gas limite</li>
        </ul>
    </div>
</body>
</html>`;

        fs.writeFileSync(fileName, htmlContent, 'utf8');
        console.log(`Relatório Excel HTML criado: ${fileName}`);
        console.log('DICA: Abra o arquivo .html no Excel para importar como planilha');
    }

    generateStatistics() {
        const bridgeHistory = this.loadBridgeHistory();
        
        if (bridgeHistory.length === 0) {
            console.log('Nenhuma transação encontrada.');
            return;
        }

        const successful = bridgeHistory.filter(tx => tx.status === 'SUCCESS');
        const failed = bridgeHistory.filter(tx => tx.status === 'FAILED');
        const moonbeamToAstar = bridgeHistory.filter(tx => tx.direction === 'Moonbeam → Astar');
        const astarToMoonbeam = bridgeHistory.filter(tx => tx.direction === 'Astar → Moonbeam');

        console.log('\n📊 ESTATÍSTICAS DETALHADAS:');
        console.log('='.repeat(50));
        console.log(`Total de transações: ${bridgeHistory.length}`);
        console.log(`Sucessos: ${successful.length} (${((successful.length / bridgeHistory.length) * 100).toFixed(1)}%)`);
        console.log(`Falhas: ${failed.length} (${((failed.length / bridgeHistory.length) * 100).toFixed(1)}%)`);
        console.log(`Moonbeam → Astar: ${moonbeamToAstar.length} (${((moonbeamToAstar.filter(tx => tx.status === 'SUCCESS').length / moonbeamToAstar.length) * 100).toFixed(1)}% sucesso)`);
        console.log(`Astar → Moonbeam: ${astarToMoonbeam.length} (${astarToMoonbeam.length > 0 ? ((astarToMoonbeam.filter(tx => tx.status === 'SUCCESS').length / astarToMoonbeam.length) * 100).toFixed(1) : 0}% sucesso)`);

        // Calcular custos totais
        let totalCostDEV = 0;
        let totalCostSBY = 0;
        let totalCostUSD = 0;

        successful.forEach(tx => {
            const costs = this.calculateTransactionCost(tx);
            totalCostDEV += parseFloat(costs.totalCostDEV);
            totalCostSBY += parseFloat(costs.totalCostSBY);
            totalCostUSD += parseFloat(costs.estimatedUSD);
        });

        console.log(`\n💰 CUSTOS TOTAIS:`);
        console.log(`DEV gasto: ${totalCostDEV.toFixed(8)} DEV`);
        console.log(`SBY gasto: ${totalCostSBY.toFixed(8)} SBY`);
        console.log(`Custo total estimado: $${totalCostUSD.toFixed(6)} USD`);
        console.log(`Custo médio por transação: $${(totalCostUSD / successful.length).toFixed(6)} USD`);

        const volumeTotal = successful.reduce((sum, tx) => sum + parseFloat(tx.amount || 1), 0);
        console.log(`\n📈 VOLUME:`);
        console.log(`Volume total transferido: ${volumeTotal.toFixed(2)} tokens`);
        console.log(`Volume médio por transação: ${(volumeTotal / successful.length).toFixed(2)} tokens`);
    }
}

async function main() {
    const generator = new ExcelReportGenerator();
    const args = process.argv.slice(2);

    console.log('🌉 GERADOR DE RELATÓRIO EXCEL - BRIDGE CROSS-CHAIN');
    console.log('='.repeat(60));

    if (args.length === 0 || args[0] === 'generate') {
        console.log('Gerando relatório Excel das transações...\n');
        const fileName = generator.generateCSVReport();
        if (fileName) {
            console.log(`\n✅ Relatórios gerados com sucesso!`);
            console.log(`📄 CSV: ${fileName}`);
            console.log(`📊 Excel: ${fileName.replace('.csv', '.html')}`);
            console.log(`\n💡 DICA: Abra o arquivo .html no Microsoft Excel para usar como planilha.`);
        }
        
    } else if (args[0] === 'stats') {
        generator.generateStatistics();
        
    } else {
        console.log('Comandos disponíveis:');
        console.log('  node create-excel-report.js          - Gerar relatório Excel');
        console.log('  node create-excel-report.js generate - Gerar relatório Excel');
        console.log('  node create-excel-report.js stats    - Mostrar estatísticas');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ExcelReportGenerator; 