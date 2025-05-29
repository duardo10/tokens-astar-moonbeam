const { ethers } = require('ethers');

async function checkBalance() {
    console.log('💰 Verificando saldo no Shibuya...\n');

    // Seu endereço (pego do erro)
    const address = '0xE88a9aC732B1A67fbB407b8C73EB7862439cA604';

    try {
        const astarProvider = new ethers.JsonRpcProvider('https://evm.shibuya.astar.network');
        const balance = await astarProvider.getBalance(address);
        
        console.log(`🔑 Endereço: ${address}`);
        console.log(`💎 Saldo SBY: ${ethers.formatEther(balance)} SBY`);
        
        const minBalance = ethers.parseEther('0.01'); // 0.01 é suficiente para deploy
        
        if (balance >= minBalance) {
            console.log('✅ Saldo suficiente para deploy!');
            console.log('\n🚀 Agora pode executar:');
            console.log('   npx hardhat run scripts/deploy-bridge.js --network shibuya');
        } else {
            console.log('❌ Saldo insuficiente!');
            console.log('\n🆘 PRECISA DE FAUCET:');
            console.log('   1. Acesse: https://portal.astar.network');
            console.log('   2. Clique em "Faucet"');
            console.log('   3. Complete o captcha');
            console.log('   4. Cole este endereço:', address);
            console.log('   5. Aguarde alguns minutos');
            console.log('   6. Execute novamente: node check-balance.js');
        }

    } catch (error) {
        console.error('❌ Erro ao verificar saldo:', error.message);
    }
}

checkBalance(); 