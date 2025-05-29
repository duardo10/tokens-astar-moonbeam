const { ethers } = require('ethers');
require('dotenv').config();

// ✅ ENDEREÇOS ATUALIZADOS COM OS DEPLOYS REAIS
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

const BRIDGE_ABI = [
    "function lockTokens(uint256 amount, string memory destinationChain, address destinationAddress) external",
    "function burnTokens(uint256 amount, string memory destinationChain, address destinationAddress) external",
    "function unlockTokens(address user, uint256 amount, bytes32 transactionId) external",
    "function mintTokens(address user, uint256 amount, bytes32 transactionId) external",
    "event TokensLocked(address indexed user, uint256 amount, string destinationChain, address destinationAddress, bytes32 indexed transactionId)",
    "event TokensBurned(address indexed user, uint256 amount, string destinationChain, address destinationAddress, bytes32 indexed transactionId)"
];

const TOKEN_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
];

async function testBridge() {
    console.log('🧪 Iniciando teste da bridge...\n');

    // Configurar providers
    const moonbeamProvider = new ethers.JsonRpcProvider(CONFIG.moonbeam.rpc);
    const astarProvider = new ethers.JsonRpcProvider(CONFIG.astar.rpc);

    // Configurar wallet (mesmo para ambas as redes)
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        console.error('❌ Configure PRIVATE_KEY no arquivo .env');
        return;
    }

    const moonbeamWallet = new ethers.Wallet(privateKey, moonbeamProvider);
    const astarWallet = new ethers.Wallet(privateKey, astarProvider);

    console.log('🔑 Usando endereço:', moonbeamWallet.address);

    try {
        // Configurar contratos
        const moonbeamBridge = new ethers.Contract(CONFIG.moonbeam.bridgeAddress, BRIDGE_ABI, moonbeamWallet);
        const moonbeamToken = new ethers.Contract(CONFIG.moonbeam.tokenAddress, TOKEN_ABI, moonbeamWallet);
        
        const astarBridge = new ethers.Contract(CONFIG.astar.bridgeAddress, BRIDGE_ABI, astarWallet);
        const astarToken = new ethers.Contract(CONFIG.astar.tokenAddress, TOKEN_ABI, astarWallet);

        // Verificar saldos iniciais
        console.log('💰 Verificando saldos iniciais...');
        const moonbeamBalance = await moonbeamToken.balanceOf(moonbeamWallet.address);
        const astarBalance = await astarToken.balanceOf(astarWallet.address);
        
        console.log(`   Moonbeam: ${ethers.formatEther(moonbeamBalance)} MTK`);
        console.log(`   Astar: ${ethers.formatEther(astarBalance)} MTA\n`);

        // TESTE 1: Lock tokens no Moonbeam
        console.log('🔒 TESTE 1: Bloqueando tokens no Moonbeam...');
        const transferAmount = ethers.parseEther("10"); // 10 tokens

        // Aprovar o bridge para gastar tokens
        console.log('   Aprovando bridge para gastar tokens...');
        const approveTx = await moonbeamToken.approve(CONFIG.moonbeam.bridgeAddress, transferAmount);
        await approveTx.wait();
        console.log('   ✅ Aprovação concluída');

        // Lock tokens
        console.log('   Bloqueando tokens...');
        const lockTx = await moonbeamBridge.lockTokens(
            transferAmount,
            "shibuya",
            moonbeamWallet.address // mesmo endereço na outra rede
        );
        
        console.log(`   📝 Hash da transação: ${lockTx.hash}`);
        const lockReceipt = await lockTx.wait();
        console.log('   ✅ Tokens bloqueados com sucesso!\n');

        // Extrair evento TokensLocked
        const lockEvent = lockReceipt.logs.find(log => {
            try {
                const parsed = moonbeamBridge.interface.parseLog(log);
                return parsed.name === 'TokensLocked';
            } catch {
                return false;
            }
        });

        if (lockEvent) {
            const parsed = moonbeamBridge.interface.parseLog(lockEvent);
            const transactionId = parsed.args.transactionId;
            console.log(`🔑 Transaction ID: ${transactionId}`);
            
            // TESTE 2: Simular mint no Astar (você faria isso manualmente ou com o oracle)
            console.log('\n🪙 TESTE 2: Simulando mint no Astar...');
            console.log('   (Normalmente o oracle faria isso automaticamente)');
            
            // Para testar manualmente, você pode chamar mintTokens se for o owner:
            console.log('   💡 Para completar a transferência, execute:');
            console.log(`   await astarBridge.mintTokens("${moonbeamWallet.address}", "${transferAmount}", "${transactionId}")`);
        }

        // Verificar saldos após lock
        console.log('\n💰 Verificando saldos após lock...');
        const moonbeamBalanceAfter = await moonbeamToken.balanceOf(moonbeamWallet.address);
        console.log(`   Moonbeam: ${ethers.formatEther(moonbeamBalanceAfter)} MTK (reduzido em 10)`);

        console.log('\n✅ Teste de lock concluído com sucesso!');
        console.log('\n📝 Para testar o fluxo completo:');
        console.log('   1. Execute o oracle com: node bridge-oracle.js');
        console.log('   2. O oracle detectará o evento e executará o mint automaticamente');

    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        
        if (error.message.includes('insufficient funds')) {
            console.log('\n💡 Dica: Certifique-se de ter tokens suficientes em sua carteira');
        } else if (error.message.includes('invalid address')) {
            console.log('\n💡 Dica: Verifique se configurou os endereços corretos no CONFIG');
        }
    }
}

// Executar teste se chamado diretamente
if (require.main === module) {
    testBridge().catch(console.error);
}

module.exports = { testBridge }; 