const { ethers } = require('ethers');

async function checkBalances() {
    console.log('Verificando saldos...\n');

    const privateKey = 'f9f3eef39586e9398d4bcebf01001e38d34ee19b32894fc54ee6c2f548ba2bce';
    
    const moonbeamProvider = new ethers.JsonRpcProvider('https://rpc.api.moonbase.moonbeam.network');
    const astarProvider = new ethers.JsonRpcProvider('https://evm.shibuya.astar.network');
    
    const wallet = new ethers.Wallet(privateKey);
    
    try {
        console.log('Endereço:', wallet.address);
        console.log();
        
        // Verificar saldos nativos
        const moonbeamBalance = await moonbeamProvider.getBalance(wallet.address);
        const astarBalance = await astarProvider.getBalance(wallet.address);
        
        console.log('SALDOS NATIVOS (GAS):');
        console.log(`   Moonbeam DEV: ${ethers.formatEther(moonbeamBalance)}`);
        console.log(`   Astar SBY: ${ethers.formatEther(astarBalance)}`);
        
        // Verificar se tem gas suficiente
        const minBalance = ethers.parseEther('0.01'); // 0.01 para gas
        
        console.log();
        console.log('STATUS:');
        console.log(`   Moonbeam: ${moonbeamBalance >= minBalance ? 'OK' : 'Insuficiente'}`);
        console.log(`   Astar: ${astarBalance >= minBalance ? 'OK' : 'Insuficiente - PRECISA DE FAUCET!'}`);
        
        if (astarBalance < minBalance) {
            console.log();
            console.log('FAUCETS:');
            console.log('   Astar Portal: https://portal.astar.network/astar/assets');
            console.log('   Discord: https://discord.gg/astarnetwork');
        }
        
    } catch (error) {
        console.error('Erro:', error.message);
    }
}

checkBalances(); 