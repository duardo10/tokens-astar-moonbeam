const { ethers } = require('ethers');
const fs = require('fs');

async function checkTransactionStatus(txId) {
    console.log('VERIFICANDO STATUS DA TRANSAÇÃO');
    console.log('='.repeat(60));

    const CONFIG = {
        moonbeam: {
            rpc: 'https://rpc.api.moonbase.moonbeam.network',
            explorer: 'https://moonbase.moonscan.io'
        },
        astar: {
            rpc: 'https://evm.shibuya.astar.network',
            explorer: 'https://shibuya.subscan.io'
        }
    };

    try {
        // Carregar histórico
        const historyFile = 'bridge-transaction-history.json';
        if (!fs.existsSync(historyFile)) {
            console.log('Arquivo de histórico não encontrado');
            return;
        }

        const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        const tx = history.find(t => t.id === parseInt(txId));

        if (!tx) {
            console.log(`Transação #${txId} não encontrada`);
            return;
        }

        // Providers
        const moonbeamProvider = new ethers.JsonRpcProvider(CONFIG.moonbeam.rpc);
        const astarProvider = new ethers.JsonRpcProvider(CONFIG.astar.rpc);

        console.log(`\nDETALHES DA TRANSAÇÃO #${tx.id}:`);
        console.log(`Direção: ${tx.direction}`);
        console.log(`Valor: ${tx.amount} tokens`);
        console.log(`Status: ${tx.status}`);
        console.log(`Timestamp inicial: ${new Date(tx.timestamp).toLocaleString()}`);

        // Verificar transações na blockchain
        if (tx.lockHash) {
            const lockTx = await moonbeamProvider.getTransaction(tx.lockHash);
            const lockReceipt = await moonbeamProvider.getTransactionReceipt(tx.lockHash);
            if (lockTx && lockReceipt) {
                const lockBlock = await moonbeamProvider.getBlock(lockReceipt.blockNumber);
                console.log(`\nLOCK (Moonbeam):`);
                console.log(`Hash: ${tx.lockHash}`);
                console.log(`Block: ${lockReceipt.blockNumber}`);
                console.log(`Timestamp: ${new Date(Number(lockBlock.timestamp) * 1000).toLocaleString()}`);
                console.log(`Gas usado: ${lockReceipt.gasUsed}`);
                console.log(`Status: ${lockReceipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
                console.log(`Explorer: ${CONFIG.moonbeam.explorer}/tx/${tx.lockHash}`);
            }
        }

        if (tx.burnHash) {
            const burnTx = await astarProvider.getTransaction(tx.burnHash);
            const burnReceipt = await astarProvider.getTransactionReceipt(tx.burnHash);
            if (burnTx && burnReceipt) {
                const burnBlock = await astarProvider.getBlock(burnReceipt.blockNumber);
                console.log(`\nBURN (Astar):`);
                console.log(`Hash: ${tx.burnHash}`);
                console.log(`Block: ${burnReceipt.blockNumber}`);
                console.log(`Timestamp: ${new Date(Number(burnBlock.timestamp) * 1000).toLocaleString()}`);
                console.log(`Gas usado: ${burnReceipt.gasUsed}`);
                console.log(`Status: ${burnReceipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
                console.log(`Explorer: ${CONFIG.astar.explorer}/extrinsic/${tx.burnHash}`);
            }
        }

        if (tx.mintHash) {
            const mintTx = await astarProvider.getTransaction(tx.mintHash);
            const mintReceipt = await astarProvider.getTransactionReceipt(tx.mintHash);
            if (mintTx && mintReceipt) {
                const mintBlock = await astarProvider.getBlock(mintReceipt.blockNumber);
                console.log(`\nMINT (Astar):`);
                console.log(`Hash: ${tx.mintHash}`);
                console.log(`Block: ${mintReceipt.blockNumber}`);
                console.log(`Timestamp: ${new Date(Number(mintBlock.timestamp) * 1000).toLocaleString()}`);
                console.log(`Gas usado: ${mintReceipt.gasUsed}`);
                console.log(`Status: ${mintReceipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
                console.log(`Explorer: ${CONFIG.astar.explorer}/extrinsic/${tx.mintHash}`);
            }
        }

        if (tx.unlockHash) {
            const unlockTx = await moonbeamProvider.getTransaction(tx.unlockHash);
            const unlockReceipt = await moonbeamProvider.getTransactionReceipt(tx.unlockHash);
            if (unlockTx && unlockReceipt) {
                const unlockBlock = await moonbeamProvider.getBlock(unlockReceipt.blockNumber);
                console.log(`\nUNLOCK (Moonbeam):`);
                console.log(`Hash: ${tx.unlockHash}`);
                console.log(`Block: ${unlockReceipt.blockNumber}`);
                console.log(`Timestamp: ${new Date(Number(unlockBlock.timestamp) * 1000).toLocaleString()}`);
                console.log(`Gas usado: ${unlockReceipt.gasUsed}`);
                console.log(`Status: ${unlockReceipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
                console.log(`Explorer: ${CONFIG.moonbeam.explorer}/tx/${tx.unlockHash}`);
            }
        }

        // Calcular tempo total
        if (tx.lockHash && tx.mintHash) {
            const lockReceipt = await moonbeamProvider.getTransactionReceipt(tx.lockHash);
            const mintReceipt = await astarProvider.getTransactionReceipt(tx.mintHash);
            if (lockReceipt && mintReceipt) {
                const lockBlock = await moonbeamProvider.getBlock(lockReceipt.blockNumber);
                const mintBlock = await astarProvider.getBlock(mintReceipt.blockNumber);
                const startTime = Number(lockBlock.timestamp) * 1000;
                const endTime = Number(mintBlock.timestamp) * 1000;
                const duration = (endTime - startTime) / 1000;
                console.log(`\nTEMPO TOTAL DE PROCESSAMENTO:`);
                console.log(`Início: ${new Date(startTime).toLocaleString()}`);
                console.log(`Fim: ${new Date(endTime).toLocaleString()}`);
                console.log(`Duração: ${duration.toFixed(2)} segundos`);
            }
        } else if (tx.burnHash && tx.unlockHash) {
            const burnReceipt = await astarProvider.getTransactionReceipt(tx.burnHash);
            const unlockReceipt = await moonbeamProvider.getTransactionReceipt(tx.unlockHash);
            if (burnReceipt && unlockReceipt) {
                const burnBlock = await astarProvider.getBlock(burnReceipt.blockNumber);
                const unlockBlock = await moonbeamProvider.getBlock(unlockReceipt.blockNumber);
                const startTime = Number(burnBlock.timestamp) * 1000;
                const endTime = Number(unlockBlock.timestamp) * 1000;
                const duration = (endTime - startTime) / 1000;
                console.log(`\nTEMPO TOTAL DE PROCESSAMENTO:`);
                console.log(`Início: ${new Date(startTime).toLocaleString()}`);
                console.log(`Fim: ${new Date(endTime).toLocaleString()}`);
                console.log(`Duração: ${duration.toFixed(2)} segundos`);
            }
        }

    } catch (error) {
        console.error('Erro:', error.message);
    }
}

async function showAllTransactionsTime() {
    console.log('TEMPOS DE PROCESSAMENTO DE TODAS AS TRANSAÇÕES');
    console.log('='.repeat(120));

    const CONFIG = {
        moonbeam: {
            rpc: 'https://rpc.api.moonbase.moonbeam.network',
            explorer: 'https://moonbase.moonscan.io'
        },
        astar: {
            rpc: 'https://evm.shibuya.astar.network',
            explorer: 'https://shibuya.subscan.io'
        }
    };

    try {
        const historyFile = 'bridge-transaction-history.json';
        if (!fs.existsSync(historyFile)) {
            console.log('Arquivo de histórico não encontrado');
            return;
        }

        const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        const moonbeamProvider = new ethers.JsonRpcProvider(CONFIG.moonbeam.rpc);
        const astarProvider = new ethers.JsonRpcProvider(CONFIG.astar.rpc);

        console.log('| ID | Direção           | Início            | Fim               | Duração (s) | Status   |');
        console.log('|----|-------------------|-------------------|-------------------|-------------|----------|');

        for (const tx of history) {
            let startTime, endTime, duration;
            
            if (tx.lockHash && tx.mintHash) {
                const lockReceipt = await moonbeamProvider.getTransactionReceipt(tx.lockHash);
                const mintReceipt = await astarProvider.getTransactionReceipt(tx.mintHash);
                if (lockReceipt && mintReceipt) {
                    const lockBlock = await moonbeamProvider.getBlock(lockReceipt.blockNumber);
                    const mintBlock = await astarProvider.getBlock(mintReceipt.blockNumber);
                    startTime = new Date(Number(lockBlock.timestamp) * 1000);
                    endTime = new Date(Number(mintBlock.timestamp) * 1000);
                    duration = ((endTime - startTime) / 1000).toFixed(2);
                }
            } else if (tx.burnHash && tx.unlockHash) {
                const burnReceipt = await astarProvider.getTransactionReceipt(tx.burnHash);
                const unlockReceipt = await moonbeamProvider.getTransactionReceipt(tx.unlockHash);
                if (burnReceipt && unlockReceipt) {
                    const burnBlock = await astarProvider.getBlock(burnReceipt.blockNumber);
                    const unlockBlock = await moonbeamProvider.getBlock(unlockReceipt.blockNumber);
                    startTime = new Date(Number(burnBlock.timestamp) * 1000);
                    endTime = new Date(Number(unlockBlock.timestamp) * 1000);
                    duration = ((endTime - startTime) / 1000).toFixed(2);
                }
            }

            if (startTime && endTime) {
                console.log(`| ${tx.id.toString().padStart(2)} | ${tx.direction.padEnd(17)} | ${startTime.toLocaleString().padEnd(17)} | ${endTime.toLocaleString().padEnd(17)} | ${duration.padEnd(11)} | ${tx.status.padEnd(8)} |`);
            }
        }

        console.log('='.repeat(120));
        console.log('Para ver detalhes completos de uma transação específica:');
        console.log('node check-transaction-status.js [ID_DA_TRANSACAO]');

    } catch (error) {
        console.error('Erro:', error.message);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const txId = process.argv[2];
    if (!txId) {
        showAllTransactionsTime().catch(console.error);
    } else {
        checkTransactionStatus(txId).catch(console.error);
    }
}

module.exports = { checkTransactionStatus, showAllTransactionsTime }; 