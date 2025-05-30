const { ethers } = require('ethers');

async function depositTokens() {
    console.log('💰 Depositando tokens no bridge do Astar...\n');

    const PRIVATE_KEY = 'f9f3eef39586e9398d4bcebf01001e38d34ee19b32894fc54ee6c2f548ba2bce';
    const astarRpc = 'https://evm.shibuya.astar.network';
    const bridgeAddress = '0x0c33d1599cbeAa6D42D43eEb5986f7917c7c467e';
    const tokenAddress = '0xA1fe69910aBd0f78227E672A6b9B27A53B5648cA';

    const provider = new ethers.JsonRpcProvider(astarRpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    const tokenABI = [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function balanceOf(address owner) view returns (uint256)"
    ];

    const bridgeABI = [
        "function depositTokens(uint256 amount) external"
    ];

    try {
        const token = new ethers.Contract(tokenAddress, tokenABI, wallet);
        const bridge = new ethers.Contract(bridgeAddress, bridgeABI, wallet);

        const depositAmount = ethers.parseEther("50000"); // 50k tokens
        
        console.log('🔑 Wallet:', wallet.address);
        console.log('💎 Depositando:', ethers.formatEther(depositAmount), 'MTA');
        
        // Verificar saldo
        const balance = await token.balanceOf(wallet.address);
        console.log('💰 Saldo atual:', ethers.formatEther(balance), 'MTA');
        
        if (balance < depositAmount) {
            console.log('❌ Saldo insuficiente para depósito');
            return;
        }

        // Aprovar
        console.log('\n📝 Aprovando bridge...');
        const approveTx = await token.approve(bridgeAddress, depositAmount);
        await approveTx.wait();
        console.log('✅ Aprovação confirmada');

        // Depositar
        console.log('💰 Depositando tokens...');
        const depositTx = await bridge.depositTokens(depositAmount);
        await depositTx.wait();
        
        console.log('✅ Depósito realizado!');
        console.log('📝 Hash:', depositTx.hash);
        
        console.log('\n🎉 Bridge do Astar agora tem tokens para mint!');
        console.log('🔄 Execute novamente: node test-bridge-final.js');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

depositTokens(); 