const { ethers } = require('ethers');

async function checkBalances() {
    console.log('💰 Verificando saldos...\n');

    // Seu endereço (pego do erro)
    const address = '0xE88a9aC732B1A67fbB407b8C73EB7862439cA604';

    try {
        // Moonbeam
        console.log('🌙 MOONBEAM (Moonbase Alpha):');
        const moonbeamProvider = new ethers.JsonRpcProvider('https://rpc.api.moonbase.moonbeam.network');
        const moonbeamBalance = await moonbeamProvider.getBalance(address);
        console.log(`   Saldo DEV: ${ethers.formatEther(moonbeamBalance)} DEV`);
        
        // Astar
        console.log('\n🌟 ASTAR (Shibuya):');
        const astarProvider = new ethers.JsonRpcProvider('https://evm.shibuya.astar.network');
        const astarBalance = await astarProvider.getBalance(address);
        console.log(`   Saldo SBY: ${ethers.formatEther(astarBalance)} SBY`);

        // Verificar se tem saldo suficiente
        const minBalance = ethers.parseEther('0.01'); // 0.01 é suficiente para deploy
        
        console.log('\n📊 STATUS:');
        console.log(`   Moonbeam: ${moonbeamBalance >= minBalance ? '✅ OK' : '❌ Insuficiente'}`);
        console.log(`   Astar: ${astarBalance >= minBalance ? '✅ OK' : '❌ Insuficiente - PRECISA DE FAUCET!'}`);
        
        if (astarBalance < minBalance) {
            console.log('\n🚨 AÇÃO NECESSÁRIA:');
            console.log('   1. Acesse: https://portal.astar.network');
            console.log('   2. Clique em "Faucet"');
            console.log('   3. Complete o captcha');
            console.log('   4. Confirme para receber SBY');
            console.log(`   5. Use o endereço: ${address}`);
        }

    } catch (error) {
        console.error('❌ Erro ao verificar saldos:', error.message);
    }
}

checkBalances(); 