const fs = require('fs');

class BridgeHistoryViewer {
 constructor() {
 this.historyFile = 'bridge-transaction-history.json';
 this.transactionHistory = [];
 this.loadTransactionHistory();
 }

 loadTransactionHistory() {
 try {
 if (fs.existsSync(this.historyFile)) {
 const data = fs.readFileSync(this.historyFile, 'utf8');
 this.transactionHistory = JSON.parse(data);
 } else {
 console.log(' Arquivo de histórico não encontrado:', this.historyFile);
 console.log('Execute primeiro: node auto-bridge-scheduler.js');
 }
 } catch (error) {
 console.error(' Erro ao carregar histórico:', error.message);
 }
 }

 showFullHistory() {
 console.log('\n HISTÓRICO COMPLETO DE TRANSAÇÕES DA BRIDGE:');
 console.log('='.repeat(150));
 
 if (this.transactionHistory.length === 0) {
 console.log('Nenhuma transação registrada ainda.');
 console.log('Execute: node auto-bridge-scheduler.js');
 return;
 }

 // Cabeçalho da tabela expandido
 console.log('| ID | Timestamp | Direção | Valor | Hash Lock/Burn | Hash Mint/Unlock | Gas Lock/Burn | Gas Mint/Unlock | Status |');
 console.log('|----|------------------------|----------------------|-------|------------------------|------------------------|---------------|-----------------|---------|');
 
 for (const tx of this.transactionHistory) {
 const timestamp = new Date(tx.timestamp).toLocaleString();
 const lockBurnHash = (tx.lockHash || tx.burnHash || 'N/A').substring(0, 12) + '...';
 const mintUnlockHash = (tx.mintHash || tx.unlockHash || 'N/A').substring(0, 12) + '...';
 const gasLockBurn = (tx.gasUsedLock || tx.gasUsedBurn || 'N/A').toString().substring(0, 8);
 const gasMintUnlock = (tx.gasUsedMint || tx.gasUsedUnlock || 'N/A').toString().substring(0, 8);
 
 console.log(`| ${tx.id.toString().padStart(2)} | ${timestamp.padEnd(22)} | ${tx.direction.padEnd(20)} | ${tx.amount.padEnd(5)} | ${lockBurnHash.padEnd(22)} | ${mintUnlockHash.padEnd(22)} | ${gasLockBurn.padEnd(13)} | ${gasMintUnlock.padEnd(15)} | ${tx.status.padEnd(7)} |`);
 }
 
 console.log('='.repeat(150));
 }

 showRecentHistory(count = 10) {
 console.log(`\n ÚLTIMAS ${count} TRANSAÇÕES:');
 console.log('='.repeat(120));
 
 if (this.transactionHistory.length === 0) {
 console.log('Nenhuma transação registrada ainda.');
 return;
 }

 // Cabeçalho da tabela
 console.log('| ID | Timestamp | Direção | Valor | Hash Lock/Burn | Hash Mint/Unlock | Status |');
 console.log('|----|---------------------|----------------------|-------|---------------------|---------------------|---------|');
 
 // Mostrar últimas transações
 const recentTransactions = this.transactionHistory.slice(-count);
 
 for (const tx of recentTransactions) {
 const timestamp = new Date(tx.timestamp).toLocaleString().substring(0, 19);
 const lockBurnHash = (tx.lockHash || tx.burnHash || 'N/A').substring(0, 10) + '...';
 const mintUnlockHash = (tx.mintHash || tx.unlockHash || 'N/A').substring(0, 10) + '...';
 
 console.log(`| ${tx.id.toString().padStart(2)} | ${timestamp} | ${tx.direction.padEnd(20)} | ${tx.amount.padEnd(5)} | ${lockBurnHash.padEnd(19)} | ${mintUnlockHash.padEnd(19)} | ${tx.status.padEnd(7)} |`);
 }
 
 console.log('='.repeat(120));
 }

 showStats() {
 const total = this.transactionHistory.length;
 const successful = this.transactionHistory.filter(tx => tx.status === 'SUCCESS').length;
 const failed = this.transactionHistory.filter(tx => tx.status === 'FAILED').length;
 const moonbeamToAstar = this.transactionHistory.filter(tx => tx.direction === 'Moonbeam → Astar').length;
 const astarToMoonbeam = this.transactionHistory.filter(tx => tx.direction === 'Astar → Moonbeam').length;
 
 console.log('\n ESTATÍSTICAS DETALHADAS:');
 console.log('='.repeat(50));
 console.log(` Total de transações: ${total}`);
 console.log(` Sucessos: ${successful} (${total > 0 ? ((successful / total) * 100).toFixed(1) : 0}%)`);
 console.log(` Falhas: ${failed} (${total > 0 ? ((failed / total) * 100).toFixed(1) : 0}%)`);
 console.log(` Moonbeam → Astar: ${moonbeamToAstar}`);
 console.log(` Astar → Moonbeam: ${astarToMoonbeam}`);
 
 if (total > 0) {
 const totalVolume = this.transactionHistory
 .filter(tx => tx.status === 'SUCCESS')
 .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
 console.log(` Volume total transferido: ${totalVolume.toFixed(2)} tokens`);
 }
 
 console.log('='.repeat(50));
 }

 showTransactionDetails(id) {
 const transaction = this.transactionHistory.find(tx => tx.id === parseInt(id));
 
 if (!transaction) {
 console.log(` Transação com ID ${id} não encontrada.`);
 return;
 }

 console.log(`\n DETALHES DA TRANSAÇÃO #${transaction.id}:`);
 console.log('='.repeat(60));
 console.log(` Timestamp: ${new Date(transaction.timestamp).toLocaleString()}`);
 console.log(` Direção: ${transaction.direction}`);
 console.log(` Valor: ${transaction.amount} tokens`);
 console.log(` Status: ${transaction.status}`);
 
 if (transaction.lockHash) {
 console.log(` Hash Lock: ${transaction.lockHash}`);
 console.log(` Gas Lock: ${transaction.gasUsedLock}`);
 }
 
 if (transaction.burnHash) {
 console.log(` Hash Burn: ${transaction.burnHash}`);
 console.log(` Gas Burn: ${transaction.gasUsedBurn}`);
 }
 
 if (transaction.mintHash) {
 console.log(` Hash Mint: ${transaction.mintHash}`);
 console.log(` Gas Mint: ${transaction.gasUsedMint}`);
 }
 
 if (transaction.unlockHash) {
 console.log(` Hash Unlock: ${transaction.unlockHash}`);
 console.log(` Gas Unlock: ${transaction.gasUsedUnlock}`);
 }
 
 if (transaction.transactionId) {
 console.log(` Transaction ID: ${transaction.transactionId}`);
 }
 
 if (transaction.error) {
 console.log(` Erro: ${transaction.error}`);
 }
 
 console.log('='.repeat(60));
 
 // Links para exploradores
 console.log('\n VERIFICAR NOS EXPLORADORES:');
 if (transaction.lockHash || transaction.unlockHash) {
 const hash = transaction.lockHash || transaction.unlockHash;
 console.log(` Moonbeam: https://moonbase.moonscan.io/tx/${hash}`);
 }
 if (transaction.mintHash || transaction.burnHash) {
 const hash = transaction.mintHash || transaction.burnHash;
 console.log(` Astar: https://shibuya.subscan.io/extrinsic/${hash}`);
 }
 }

 exportToCSV() {
 const csvHeader = 'ID,Timestamp,Direction,Amount,LockBurnHash,MintUnlockHash,GasLockBurn,GasMintUnlock,Status,Error\n';
 
 const csvData = this.transactionHistory.map(tx => {
 return [
 tx.id,
 tx.timestamp,
 tx.direction,
 tx.amount,
 tx.lockHash || tx.burnHash || '',
 tx.mintHash || tx.unlockHash || '',
 tx.gasUsedLock || tx.gasUsedBurn || '',
 tx.gasUsedMint || tx.gasUsedUnlock || '',
 tx.status,
 tx.error || ''
 ].join(',');
 }).join('\n');

 const csvContent = csvHeader + csvData;
 const fileName = `bridge-history-${new Date().toISOString().split('T')[0]}.csv`;
 
 fs.writeFileSync(fileName, csvContent);
 console.log(` Histórico exportado para: ${fileName}`);
 }
}

// Função principal
function main() {
 const viewer = new BridgeHistoryViewer();
 const args = process.argv.slice(2);
 
 if (args.length === 0) {
 // Mostrar histórico padrão
 viewer.showRecentHistory();
 viewer.showStats();
 return;
 }

 const command = args[0];
 
 switch (command) {
 case 'full':
 case '--full':
 viewer.showFullHistory();
 viewer.showStats();
 break;
 
 case 'stats':
 case '--stats':
 viewer.showStats();
 break;
 
 case 'recent':
 case '--recent':
 const count = parseInt(args[1]) || 10;
 viewer.showRecentHistory(count);
 viewer.showStats();
 break;
 
 case 'details':
 case '--details':
 if (!args[1]) {
 console.log(' Especifique o ID da transação: node view-bridge-history.js details 1');
 return;
 }
 viewer.showTransactionDetails(args[1]);
 break;
 
 case 'export':
 case '--export':
 viewer.exportToCSV();
 break;
 
 case 'help':
 case '--help':
 console.log('\n COMANDOS DISPONÍVEIS:');
 console.log(' node view-bridge-history.js - Mostrar últimas 10 transações');
 console.log(' node view-bridge-history.js full - Mostrar histórico completo');
 console.log(' node view-bridge-history.js recent 5 - Mostrar últimas 5 transações');
 console.log(' node view-bridge-history.js stats - Mostrar apenas estatísticas');
 console.log(' node view-bridge-history.js details 1 - Mostrar detalhes da transação #1');
 console.log(' node view-bridge-history.js export - Exportar para CSV');
 console.log(' node view-bridge-history.js help - Mostrar esta ajuda');
 break;
 
 default:
 console.log(` Comando desconhecido: ${command}`);
 console.log('Use: node view-bridge-history.js help');
 }
}

// Executar
main(); 