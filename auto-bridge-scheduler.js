const { ethers } = require('ethers');
const fs = require('fs');

class AutoBridgeScheduler {
 constructor() {
 this.PRIVATE_KEY = 'f9f3eef39586e9398d4bcebf01001e38d34ee19b32894fc54ee6c2f548ba2bce';
 
 this.CONFIG = {
 moonbeam: {
 rpc: 'https://rpc.api.moonbase.moonbeam.network',
 bridgeAddress: '0xAeBF38ea2Ac91FD912DD88b839b1E7E175063249',
 tokenAddress: '0x66f77aEaAa01f4AB4B34fA229D550Bf7E10Dd2A5'
 },
 astar: {
 rpc: 'https://evm.shibuya.astar.network',
 bridgeAddress: '0x0c33d1599cbeAa6D42D43eEb5986f7917c7c467e',
 tokenAddress: '0xA1fe69910aBd0f78227E672A6b9B27A53B5648cA'
 }
 };

 this.BRIDGE_ABI = [
 "function lockTokens(uint256 amount, string memory destinationChain, address destinationAddress) external",
 "function burnTokens(uint256 amount, string memory destinationChain, address destinationAddress) external",
 "function mintTokens(address user, uint256 amount, bytes32 transactionId) external",
 "function unlockTokens(address user, uint256 amount, bytes32 transactionId) external"
 ];

 this.TOKEN_ABI = [
 "function balanceOf(address owner) view returns (uint256)",
 "function approve(address spender, uint256 amount) returns (bool)"
 ];

 // Estado do scheduler
 this.isRunning = false;
 this.currentDirection = 'moonbeam-to-astar'; // Alterna entre: moonbeam-to-astar, astar-to-moonbeam
 this.transferAmount = ethers.parseEther("1"); // 1 token por transferência
 this.interval = 30 * 60 * 1000; // 30 minutos em millisegundos
 
 // Tabela de transações
 this.transactionHistory = [];
 this.historyFile = 'bridge-transaction-history.json';
 
 this.loadTransactionHistory();
 }

 async initialize() {
 try {
 console.log('Inicializando Auto Bridge Scheduler...');
 
 // Configurar providers
 this.moonbeamProvider = new ethers.JsonRpcProvider(this.CONFIG.moonbeam.rpc);
 this.astarProvider = new ethers.JsonRpcProvider(this.CONFIG.astar.rpc);

 // Configurar wallets
 this.moonbeamWallet = new ethers.Wallet(this.PRIVATE_KEY, this.moonbeamProvider);
 this.astarWallet = new ethers.Wallet(this.PRIVATE_KEY, this.astarProvider);

 // Configurar contratos
 this.moonbeamBridge = new ethers.Contract(this.CONFIG.moonbeam.bridgeAddress, this.BRIDGE_ABI, this.moonbeamWallet);
 this.moonbeamToken = new ethers.Contract(this.CONFIG.moonbeam.tokenAddress, this.TOKEN_ABI, this.moonbeamWallet);
 this.astarBridge = new ethers.Contract(this.CONFIG.astar.bridgeAddress, this.BRIDGE_ABI, this.astarWallet);
 this.astarToken = new ethers.Contract(this.CONFIG.astar.tokenAddress, this.TOKEN_ABI, this.astarWallet);

 console.log('Scheduler inicializado com sucesso!');
 console.log(` Endereco: ${this.moonbeamWallet.address}`);
 console.log(` Intervalo: 30 minutos`);
 console.log(` Quantidade por transferencia: ${ethers.formatEther(this.transferAmount)} tokens`);
 
 return true;
 } catch (error) {
 console.error('Erro na inicializacao:', error.message);
 return false;
 }
 }

 loadTransactionHistory() {
 try {
 if (fs.existsSync(this.historyFile)) {
 const data = fs.readFileSync(this.historyFile, 'utf8');
 this.transactionHistory = JSON.parse(data);
 console.log(`Carregados ${this.transactionHistory.length} registros do historico`);
 }
 } catch (error) {
 console.log('Criando novo arquivo de historico...');
 this.transactionHistory = [];
 }
 }

 saveTransactionHistory() {
 try {
 fs.writeFileSync(this.historyFile, JSON.stringify(this.transactionHistory, null, 2));
 console.log('Historico salvo em:', this.historyFile);
 } catch (error) {
 console.error('Erro ao salvar historico:', error.message);
 }
 }

 addTransactionRecord(record) {
 this.transactionHistory.push({
 ...record,
 timestamp: new Date().toISOString(),
 id: this.transactionHistory.length + 1
 });
 this.saveTransactionHistory();
 }

 async showBalances() {
 try {
 const moonbeamBalance = await this.moonbeamToken.balanceOf(this.moonbeamWallet.address);
 const astarBalance = await this.astarToken.balanceOf(this.astarWallet.address);
 
 console.log('\nSALDOS ATUAIS:');
 console.log(` Moonbeam MTK: ${ethers.formatEther(moonbeamBalance)}`);
 console.log(` Astar MTA: ${ethers.formatEther(astarBalance)}`);
 
 return { moonbeam: moonbeamBalance, astar: astarBalance };
 } catch (error) {
 console.error('Erro ao verificar saldos:', error.message);
 return null;
 }
 }

 async executeMoonbeamToAstar() {
 console.log('\nEXECUTANDO: Moonbeam -> Astar');
 
 try {
 // 1. Aprovar tokens
 console.log(' Aprovando tokens...');
 const approveTx = await this.moonbeamToken.approve(this.CONFIG.moonbeam.bridgeAddress, this.transferAmount);
 await approveTx.wait();

 // 2. Lock tokens
 console.log(' Bloqueando tokens no Moonbeam...');
 const lockTx = await this.moonbeamBridge.lockTokens(
 this.transferAmount,
 "shibuya",
 this.moonbeamWallet.address
 );

 console.log(` Hash do Lock: ${lockTx.hash}`);
 const lockReceipt = await lockTx.wait();
 
 // 3. Aguardar para simulação do oracle
 console.log(' Aguardando processamento do oracle (10s)...');
 await new Promise(resolve => setTimeout(resolve, 10000));

 // 4. Executar mint no Astar
 const transactionId = ethers.keccak256(ethers.toUtf8Bytes(`${lockTx.hash}_${Date.now()}`));
 console.log(' Executando mint no Astar...');
 
 const mintTx = await this.astarBridge.mintTokens(
 this.moonbeamWallet.address,
 this.transferAmount,
 transactionId,
 { gasLimit: 300000 }
 );

 console.log(` Hash do Mint: ${mintTx.hash}`);
 const mintReceipt = await mintTx.wait();

 // 5. Registrar transação
 this.addTransactionRecord({
 direction: 'Moonbeam → Astar',
 amount: ethers.formatEther(this.transferAmount),
 lockHash: lockTx.hash,
 mintHash: mintTx.hash,
 gasUsedLock: lockReceipt.gasUsed.toString(),
 gasUsedMint: mintReceipt.gasUsed.toString(),
 status: 'SUCCESS',
 transactionId: transactionId
 });

 console.log(' Transferência Moonbeam → Astar concluída!');
 return true;

 } catch (error) {
 console.error(' Erro na transferência Moonbeam → Astar:', error.message);
 
 this.addTransactionRecord({
 direction: 'Moonbeam → Astar',
 amount: ethers.formatEther(this.transferAmount),
 error: error.message,
 status: 'FAILED'
 });
 
 return false;
 }
 }

 async executeAstarToMoonbeam() {
 console.log('\n EXECUTANDO: Astar → Moonbeam');
 
 try {
 // 1. Aprovar tokens
 console.log(' Aprovando tokens...');
 const approveTx = await this.astarToken.approve(this.CONFIG.astar.bridgeAddress, this.transferAmount);
 await approveTx.wait();

 // 2. Burn tokens
 console.log(' Queimando tokens no Astar...');
 const burnTx = await this.astarBridge.burnTokens(
 this.transferAmount,
 "moonbeam",
 this.astarWallet.address
 );

 console.log(` Hash do Burn: ${burnTx.hash}`);
 const burnReceipt = await burnTx.wait();
 
 // 3. Aguardar para simulação do oracle
 console.log(' Aguardando processamento do oracle (10s)...');
 await new Promise(resolve => setTimeout(resolve, 10000));

 // 4. Executar unlock no Moonbeam
 const transactionId = ethers.keccak256(ethers.toUtf8Bytes(`${burnTx.hash}_${Date.now()}`));
 console.log(' Executando unlock no Moonbeam...');
 
 const unlockTx = await this.moonbeamBridge.unlockTokens(
 this.astarWallet.address,
 this.transferAmount,
 transactionId,
 { gasLimit: 300000 }
 );

 console.log(` Hash do Unlock: ${unlockTx.hash}`);
 const unlockReceipt = await unlockTx.wait();

 // 5. Registrar transação
 this.addTransactionRecord({
 direction: 'Astar → Moonbeam',
 amount: ethers.formatEther(this.transferAmount),
 burnHash: burnTx.hash,
 unlockHash: unlockTx.hash,
 gasUsedBurn: burnReceipt.gasUsed.toString(),
 gasUsedUnlock: unlockReceipt.gasUsed.toString(),
 status: 'SUCCESS',
 transactionId: transactionId
 });

 console.log(' Transferência Astar → Moonbeam concluída!');
 return true;

 } catch (error) {
 console.error(' Erro na transferência Astar → Moonbeam:', error.message);
 
 this.addTransactionRecord({
 direction: 'Astar → Moonbeam',
 amount: ethers.formatEther(this.transferAmount),
 error: error.message,
 status: 'FAILED'
 });
 
 return false;
 }
 }

 async executeNextTransfer() {
 console.log(`\n${'='.repeat(80)}`);
 console.log(` EXECUÇÃO AUTOMÁTICA - ${new Date().toLocaleString()}`);
 console.log(`${'='.repeat(80)}`);

 // Mostrar saldos antes
 await this.showBalances();

 let success = false;
 
 if (this.currentDirection === 'moonbeam-to-astar') {
 success = await this.executeMoonbeamToAstar();
 this.currentDirection = 'astar-to-moonbeam'; // Próxima será Astar → Moonbeam
 } else {
 success = await this.executeAstarToMoonbeam();
 this.currentDirection = 'moonbeam-to-astar'; // Próxima será Moonbeam → Astar
 }

 // Mostrar saldos depois
 await this.showBalances();

 if (success) {
 console.log(`\n Próxima execução em 30 minutos: ${new Date(Date.now() + this.interval).toLocaleString()}`);
 }

 return success;
 }

 async start() {
 if (this.isRunning) {
 console.log(' Scheduler já está rodando!');
 return;
 }

 this.isRunning = true;
 console.log(' Iniciando Auto Bridge Scheduler...');
 console.log(` Primeira direção: ${this.currentDirection}`);
 
 // Executar imediatamente
 await this.executeNextTransfer();
 
 // Configurar execução a cada 30 minutos
 this.schedulerInterval = setInterval(async () => {
 if (this.isRunning) {
 await this.executeNextTransfer();
 }
 }, this.interval);

 console.log('\n Scheduler ativo! Rodando automaticamente a cada 30 minutos...');
 }

 stop() {
 if (!this.isRunning) {
 console.log(' Scheduler não está rodando!');
 return;
 }

 this.isRunning = false;
 if (this.schedulerInterval) {
 clearInterval(this.schedulerInterval);
 }
 
 console.log(' Auto Bridge Scheduler parado!');
 }

 showTransactionHistory() {
 console.log('\n HISTÓRICO DE TRANSAÇÕES:');
 console.log('='.repeat(120));
 
 if (this.transactionHistory.length === 0) {
 console.log('Nenhuma transação registrada ainda.');
 return;
 }

 // Cabeçalho da tabela
 console.log('| ID | Timestamp | Direção | Valor | Hash Lock/Burn | Hash Mint/Unlock | Status |');
 console.log('|----|---------------------|----------------------|-------|---------------------|---------------------|---------|');
 
 // Mostrar últimas 10 transações
 const recentTransactions = this.transactionHistory.slice(-10);
 
 for (const tx of recentTransactions) {
 const timestamp = new Date(tx.timestamp).toLocaleString().substring(0, 19);
 const lockBurnHash = (tx.lockHash || tx.burnHash || 'N/A').substring(0, 10) + '...';
 const mintUnlockHash = (tx.mintHash || tx.unlockHash || 'N/A').substring(0, 10) + '...';
 
 console.log(`| ${tx.id.toString().padStart(2)} | ${timestamp} | ${tx.direction.padEnd(20)} | ${tx.amount.padEnd(5)} | ${lockBurnHash.padEnd(19)} | ${mintUnlockHash.padEnd(19)} | ${tx.status.padEnd(7)} |`);
 }
 
 console.log('='.repeat(120));
 console.log(`Total de transações: ${this.transactionHistory.length}`);
 console.log(`Arquivo de histórico: ${this.historyFile}`);
 }

 getStats() {
 const total = this.transactionHistory.length;
 const successful = this.transactionHistory.filter(tx => tx.status === 'SUCCESS').length;
 const failed = this.transactionHistory.filter(tx => tx.status === 'FAILED').length;
 
 return {
 total,
 successful,
 failed,
 successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%'
 };
 }

 showStats() {
 const stats = this.getStats();
 console.log('\n ESTATÍSTICAS:');
 console.log(` Total de transações: ${stats.total}`);
 console.log(` Sucessos: ${stats.successful}`);
 console.log(` Falhas: ${stats.failed}`);
 console.log(` Taxa de sucesso: ${stats.successRate}`);
 }
}

// Função principal
async function main() {
 const scheduler = new AutoBridgeScheduler();
 
 if (!(await scheduler.initialize())) {
 process.exit(1);
 }

 // Mostrar histórico existente
 scheduler.showTransactionHistory();
 scheduler.showStats();

 // Verificar saldos iniciais
 await scheduler.showBalances();

 console.log('\n Comandos disponíveis:');
 console.log(' CTRL+C: Parar o scheduler');
 console.log(' O scheduler executará automaticamente a cada 30 minutos\n');

 // Iniciar scheduler
 await scheduler.start();

 // Configurar handlers para parada limpa
 process.on('SIGINT', () => {
 console.log('\n\n Recebido sinal de parada...');
 scheduler.stop();
 scheduler.showTransactionHistory();
 scheduler.showStats();
 console.log('\n Scheduler finalizado!');
 process.exit(0);
 });

 // Manter o processo rodando
 process.on('uncaughtException', (error) => {
 console.error(' Erro não capturado:', error);
 scheduler.stop();
 process.exit(1);
 });
}

// Executar se for chamado diretamente
if (require.main === module) {
 main().catch(console.error);
}

module.exports = AutoBridgeScheduler; 