const { ethers } = require('ethers');

async function checkBalance() {
    console.log('Verificando saldo no Shibuya...\n');

    const privateKey = 'f9f3eef39586e9398d4bcebf01001e38d34ee19b32894fc54ee6c2f548ba2bce';
    const rpcUrl = 'https://evm.shibuya.astar.network';

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    try {
        const balance = await provider.getBalance(wallet.address);
        console.log(`Endereço: ${wallet.address}`);
        console.log(`Saldo SBY: ${ethers.formatEther(balance)} SBY`);

        const minBalance = ethers.parseEther('0.01');
        
        if (balance >= minBalance) {
            console.log('Saldo suficiente para deploy!');
            console.log('\nAgora pode executar:');
            console.log('node scripts/deploy.js');
        } else {
            console.log('Saldo insuficiente!');
            console.log('Use o faucet: https://portal.astar.network');
        }

    } catch (error) {
        console.error('Erro:', error.message);
    }
}

checkBalance(); 