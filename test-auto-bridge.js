const AutoBridgeScheduler = require('./auto-bridge-scheduler');

async function testAutoBridge() {
 console.log(' TESTE DO SISTEMA AUTO BRIDGE');
 console.log('='.repeat(50));
 
 const scheduler = new AutoBridgeScheduler();
 
 // Inicializar
 if (!(await scheduler.initialize())) {
 console.error(' Falha na inicialização');
 process.exit(1);
 }

 // Mostrar histórico atual
 scheduler.showTransactionHistory();
 scheduler.showStats();

 // Verificar saldos
 await scheduler.showBalances();

 console.log('\n EXECUTANDO TESTE DE TRANSFERÊNCIA...');
 console.log('(Apenas uma transferência para demonstração)');
 
 // Executar uma transferência
 const success = await scheduler.executeNextTransfer();
 
 if (success) {
 console.log('\n TESTE CONCLUÍDO COM SUCESSO!');
 
 // Mostrar histórico atualizado
 scheduler.showTransactionHistory();
 scheduler.showStats();
 
 console.log('\n Para ver o histórico a qualquer momento:');
 console.log(' node view-bridge-history.js');
 
 console.log('\n Para executar automaticamente a cada 30 min:');
 console.log(' node auto-bridge-scheduler.js');
 
 } else {
 console.log('\n TESTE FALHOU');
 console.log('Verifique os logs acima para mais detalhes.');
 }
}

testAutoBridge().catch(console.error); 