const { ethers } = require('ethers');

async function autoRefillBridges() {
    console.log('VERIFICANDO E RECARREGANDO BRIDGES AUTOMATICAMENTE');
    console.log('='.repeat(60));
    
    const PRIVATE_KEY = 'f9f3eef39586e9398d4bcebf01001e38d34ee19b32894fc54ee6c2f548ba2bce';
    
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

    const TOKEN_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function approve(address spender, uint256 amount) returns (bool)"
    ];

    const MINIMUM_BRIDGE_BALANCE = ethers.parseEther("10"); // 10 tokens mínimo
    const REFILL_AMOUNT = ethers.parseEther("50000"); // Recarregar com 50k tokens

    try {
        // Setup
        const moonbeamProvider = new ethers.JsonRpcProvider(CONFIG.moonbeam.rpc);
        const astarProvider = new ethers.JsonRpcProvider(CONFIG.astar.rpc);

        const moonbeamWallet = new ethers.Wallet(PRIVATE_KEY, moonbeamProvider);
        const astarWallet = new ethers.Wallet(PRIVATE_KEY, astarProvider);

        const moonbeamToken = new ethers.Contract(CONFIG.moonbeam.tokenAddress, TOKEN_ABI, moonbeamWallet);
        const astarToken = new ethers.Contract(CONFIG.astar.tokenAddress, TOKEN_ABI, astarWallet);

        console.log(`Carteira: ${moonbeamWallet.address}\n`);

        // 1. Verificar Bridge Moonbeam
        console.log('1. VERIFICANDO BRIDGE MOONBEAM:');
        const moonbeamBridgeBalance = await moonbeamToken.balanceOf(CONFIG.moonbeam.bridgeAddress);
        console.log(`   Saldo atual: ${ethers.formatEther(moonbeamBridgeBalance)} MTK`);
        console.log(`   Mínimo necessário: ${ethers.formatEther(MINIMUM_BRIDGE_BALANCE)} MTK`);

        if (moonbeamBridgeBalance < MINIMUM_BRIDGE_BALANCE) {
            console.log('   RECARREGANDO BRIDGE MOONBEAM...');
            
            const userBalance = await moonbeamToken.balanceOf(moonbeamWallet.address);
            if (userBalance < REFILL_AMOUNT) {
                console.log(`   ERRO: Usuário tem apenas ${ethers.formatEther(userBalance)} MTK`);
                console.log(`   Precisa de pelo menos ${ethers.formatEther(REFILL_AMOUNT)} MTK`);
            } else {
                const transferTx = await moonbeamToken.transfer(CONFIG.moonbeam.bridgeAddress, REFILL_AMOUNT);
                console.log(`   Hash da transferência: ${transferTx.hash}`);
                await transferTx.wait();
                console.log('   BRIDGE MOONBEAM RECARREGADO!');
            }
        } else {
            console.log('   Bridge Moonbeam OK - saldo suficiente');
        }

        // 2. Verificar Bridge Astar
        console.log('\n2. VERIFICANDO BRIDGE ASTAR:');
        const astarBridgeBalance = await astarToken.balanceOf(CONFIG.astar.bridgeAddress);
        console.log(`   Saldo atual: ${ethers.formatEther(astarBridgeBalance)} MTA`);
        console.log(`   Mínimo necessário: ${ethers.formatEther(MINIMUM_BRIDGE_BALANCE)} MTA`);

        if (astarBridgeBalance < MINIMUM_BRIDGE_BALANCE) {
            console.log('   RECARREGANDO BRIDGE ASTAR...');
            
            const userBalance = await astarToken.balanceOf(astarWallet.address);
            if (userBalance < REFILL_AMOUNT) {
                console.log(`   ERRO: Usuário tem apenas ${ethers.formatEther(userBalance)} MTA`);
                console.log(`   Precisa de pelo menos ${ethers.formatEther(REFILL_AMOUNT)} MTA`);
            } else {
                // Aprovar primeiro
                console.log('   Aprovando transferência...');
                const approveTx = await astarToken.approve(CONFIG.astar.bridgeAddress, REFILL_AMOUNT);
                await approveTx.wait();
                
                const transferTx = await astarToken.transfer(CONFIG.astar.bridgeAddress, REFILL_AMOUNT);
                console.log(`   Hash da transferência: ${transferTx.hash}`);
                await transferTx.wait();
                console.log('   BRIDGE ASTAR RECARREGADO!');
            }
        } else {
            console.log('   Bridge Astar OK - saldo suficiente');
        }

        // 3. Verificar saldos finais
        console.log('\n3. SALDOS FINAIS DOS BRIDGES:');
        const finalMoonbeamBalance = await moonbeamToken.balanceOf(CONFIG.moonbeam.bridgeAddress);
        const finalAstarBalance = await astarToken.balanceOf(CONFIG.astar.bridgeAddress);
        
        console.log(`   Moonbeam Bridge: ${ethers.formatEther(finalMoonbeamBalance)} MTK`);
        console.log(`   Astar Bridge: ${ethers.formatEther(finalAstarBalance)} MTA`);

        // 4. Status final
        const moonbeamOK = finalMoonbeamBalance >= MINIMUM_BRIDGE_BALANCE;
        const astarOK = finalAstarBalance >= MINIMUM_BRIDGE_BALANCE;
        
        console.log('\n' + '='.repeat(60));
        if (moonbeamOK && astarOK) {
            console.log('TODOS OS BRIDGES ESTÃO COM SALDO SUFICIENTE!');
            console.log('Sistema pode operar normalmente.');
        } else {
            console.log('ATENÇÃO: Alguns bridges ainda estão com saldo baixo!');
            if (!moonbeamOK) console.log('- Bridge Moonbeam precisa de mais tokens MTK');
            if (!astarOK) console.log('- Bridge Astar precisa de mais tokens MTA');
        }
        console.log('='.repeat(60));

        return moonbeamOK && astarOK;

    } catch (error) {
        console.error('Erro no auto-refill:', error.message);
        return false;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    autoRefillBridges().catch(console.error);
}

module.exports = autoRefillBridges; 