const { ethers } = require('ethers');

async function checkStatus() {
    console.log('🔍 VERIFICANDO STATUS DO SISTEMA DE INTEROPERABILIDADE');
    console.log('='.repeat(60));

    const PRIVATE_KEY = 'f9f3eef39586e9398d4bcebf01001e38d34ee19b32894fc54ee6c2f548ba2bce';
    const address = '0xE88a9aC732B1A67fbB407b8C73EB7862439cA604';

    // Configurações
    const CONFIG = {
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

    try {
        // Providers
        const moonbeamProvider = new ethers.JsonRpcProvider(CONFIG.moonbeam.rpc);
        const astarProvider = new ethers.JsonRpcProvider(CONFIG.astar.rpc);

        // Wallets
        const moonbeamWallet = new ethers.Wallet(PRIVATE_KEY, moonbeamProvider);
        const astarWallet = new ethers.Wallet(PRIVATE_KEY, astarProvider);

        console.log('🔑 Endereço da Carteira:', address);
        console.log();

        // 1. VERIFICAR SALDOS NATIVOS (GAS)
        console.log('⛽ SALDOS DE GAS:');
        const moonbeamGas = await moonbeamProvider.getBalance(address);
        const astarGas = await astarProvider.getBalance(address);
        
        console.log(`   🌙 Moonbeam DEV: ${ethers.formatEther(moonbeamGas)}`);
        console.log(`   🌟 Astar SBY: ${ethers.formatEther(astarGas)}`);

        // 2. VERIFICAR SALDOS DOS TOKENS
        console.log('\n💰 SALDOS DOS TOKENS:');
        const tokenABI = ["function balanceOf(address) view returns (uint256)"];
        
        const moonbeamToken = new ethers.Contract(CONFIG.moonbeam.tokenAddress, tokenABI, moonbeamProvider);
        const astarToken = new ethers.Contract(CONFIG.astar.tokenAddress, tokenABI, astarProvider);
        
        const moonbeamBalance = await moonbeamToken.balanceOf(address);
        const astarBalance = await astarToken.balanceOf(address);
        
        console.log(`   🌙 Moonbeam MTK: ${ethers.formatEther(moonbeamBalance)}`);
        console.log(`   🌟 Astar MTA: ${ethers.formatEther(astarBalance)}`);

        // 3. VERIFICAR SALDO DO BRIDGE (ASTAR)
        console.log('\n🏦 SALDO DO BRIDGE (para mints):');
        const astarBridgeBalance = await astarToken.balanceOf(CONFIG.astar.bridgeAddress);
        console.log(`   💎 Bridge Astar: ${ethers.formatEther(astarBridgeBalance)} MTA`);

        // 4. STATUS DOS CONTRATOS
        console.log('\n📍 ENDEREÇOS DOS CONTRATOS:');
        console.log(`   🌙 Moonbeam Bridge: ${CONFIG.moonbeam.bridgeAddress}`);
        console.log(`   🌙 Moonbeam Token: ${CONFIG.moonbeam.tokenAddress}`);
        console.log(`   🌟 Astar Bridge: ${CONFIG.astar.bridgeAddress}`);
        console.log(`   🌟 Astar Token: ${CONFIG.astar.tokenAddress}`);

        // 5. VERIFICAÇÕES
        console.log('\n✅ VERIFICAÇÕES:');
        console.log(`   Gas Moonbeam: ${moonbeamGas > ethers.parseEther('0.01') ? '✅ OK' : '❌ Insuficiente'}`);
        console.log(`   Gas Astar: ${astarGas > ethers.parseEther('0.01') ? '✅ OK' : '❌ Insuficiente'}`);
        console.log(`   Tokens MTK: ${moonbeamBalance > ethers.parseEther('10') ? '✅ OK' : '❌ Insuficiente'}`);
        console.log(`   Tokens MTA: ${astarBalance > ethers.parseEther('10') ? '✅ OK' : '❌ Insuficiente'}`);
        console.log(`   Bridge Astar: ${astarBridgeBalance > ethers.parseEther('100') ? '✅ OK' : '⚠️ Precisa depósito'}`);

        console.log('\n🎯 PRÓXIMOS PASSOS:');
        if (astarBridgeBalance < ethers.parseEther('100')) {
            console.log('   1. Execute: node deposit-tokens-astar.js');
            console.log('   2. Execute: node test-bridge-final.js');
        } else {
            console.log('   ✅ Tudo pronto! Execute: node test-bridge-final.js');
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

checkStatus(); 