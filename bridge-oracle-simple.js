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
    "function unlockTokens(address user, uint256 amount, bytes32 transactionId) external",
    "function mintTokens(address user, uint256 amount, bytes32 transactionId) external",
    "event TokensLocked(address indexed user, uint256 amount, string destinationChain, address destinationAddress, bytes32 indexed transactionId)",
    "event TokensBurned(address indexed user, uint256 amount, string destinationChain, address destinationAddress, bytes32 indexed transactionId)"
];

class SimpleOracle {
    constructor() {
        this.processedTransactions = new Set();
        this.isRunning = false;
    }

    async initialize() {
        try {
            console.log('🔗 Inicializando oracle...');

            // Providers
            this.moonbeamProvider = new ethers.JsonRpcProvider(CONFIG.moonbeam.rpc);
            this.astarProvider = new ethers.JsonRpcProvider(CONFIG.astar.rpc);

            // Wallets
            const privateKey = process.env.PRIVATE_KEY;
            this.moonbeamWallet = new ethers.Wallet(privateKey, this.moonbeamProvider);
            this.astarWallet = new ethers.Wallet(privateKey, this.astarProvider);

            // Contratos
            this.moonbeamBridge = new ethers.Contract(CONFIG.moonbeam.bridgeAddress, BRIDGE_ABI, this.moonbeamWallet);
            this.astarBridge = new ethers.Contract(CONFIG.astar.bridgeAddress, BRIDGE_ABI, this.astarWallet);

            console.log('✅ Oracle inicializado!');
            console.log('👤 Endereço:', this.moonbeamWallet.address);
            return true;
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            return false;
        }
    }

    async startMonitoring() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('👁️ Iniciando monitoramento...\n');

        // Monitora TokensLocked no Moonbeam
        this.moonbeamBridge.on('TokensLocked', async (user, amount, destinationChain, destinationAddress, transactionId) => {
            await this.handleTokensLocked(user, amount, destinationChain, destinationAddress, transactionId);
        });

        // Monitora TokensBurned no Astar
        this.astarBridge.on('TokensBurned', async (user, amount, destinationChain, destinationAddress, transactionId) => {
            await this.handleTokensBurned(user, amount, destinationChain, destinationAddress, transactionId);
        });

        console.log('🚀 Oracle ativo! Aguardando eventos...');
    }

    async handleTokensLocked(user, amount, destinationChain, destinationAddress, transactionId) {
        try {
            const txId = transactionId.toString();
            
            if (this.processedTransactions.has(txId)) {
                console.log(`⏭️ Transação ${txId} já processada`);
                return;
            }

            console.log(`🔒 EVENTO DETECTADO - Tokens Bloqueados:`);
            console.log(`   👤 Usuário: ${user}`);
            console.log(`   💰 Quantidade: ${ethers.formatEther(amount)} tokens`);
            console.log(`   🎯 Destino: ${destinationChain}`);
            console.log(`   📍 Endereço: ${destinationAddress}`);
            console.log(`   🔑 TX ID: ${txId.substring(0, 10)}...`);

            // Aguarda 3 segundos (simula confirmações)
            console.log('⏳ Aguardando confirmações...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Executa mint no Astar
            if (destinationChain.toLowerCase().includes('astar') || destinationChain.toLowerCase().includes('shibuya')) {
                console.log('🪙 Executando mint no Astar...');
                
                const mintTx = await this.astarBridge.mintTokens(destinationAddress, amount, transactionId, {
                    gasLimit: 300000
                });

                console.log(`   📝 Hash: ${mintTx.hash}`);
                const receipt = await mintTx.wait();
                console.log(`   ✅ Mint concluído! Gas usado: ${receipt.gasUsed}`);
            }

            this.processedTransactions.add(txId);
            console.log(`🎉 Transferência cross-chain concluída!\n`);

        } catch (error) {
            console.error(`❌ Erro ao processar tokens bloqueados:`, error.message);
        }
    }

    async handleTokensBurned(user, amount, destinationChain, destinationAddress, transactionId) {
        try {
            const txId = transactionId.toString();
            
            if (this.processedTransactions.has(txId)) {
                console.log(`⏭️ Transação ${txId} já processada`);
                return;
            }

            console.log(`🔥 EVENTO DETECTADO - Tokens Queimados:`);
            console.log(`   👤 Usuário: ${user}`);
            console.log(`   💰 Quantidade: ${ethers.formatEther(amount)} tokens`);
            console.log(`   🎯 Destino: ${destinationChain}`);
            console.log(`   📍 Endereço: ${destinationAddress}`);
            console.log(`   🔑 TX ID: ${txId.substring(0, 10)}...`);

            // Aguarda 3 segundos (simula confirmações)
            console.log('⏳ Aguardando confirmações...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Executa unlock no Moonbeam
            if (destinationChain.toLowerCase().includes('moonbeam') || destinationChain.toLowerCase().includes('moonbase')) {
                console.log('🔓 Executando unlock no Moonbeam...');
                
                const unlockTx = await this.moonbeamBridge.unlockTokens(destinationAddress, amount, transactionId, {
                    gasLimit: 300000
                });

                console.log(`   📝 Hash: ${unlockTx.hash}`);
                const receipt = await unlockTx.wait();
                console.log(`   ✅ Unlock concluído! Gas usado: ${receipt.gasUsed}`);
            }

            this.processedTransactions.add(txId);
            console.log(`🎉 Transferência cross-chain concluída!\n`);

        } catch (error) {
            console.error(`❌ Erro ao processar tokens queimados:`, error.message);
        }
    }

    stop() {
        this.isRunning = false;
        this.moonbeamBridge.removeAllListeners();
        this.astarBridge.removeAllListeners();
        console.log('🛑 Oracle parado');
    }
}

async function main() {
    const oracle = new SimpleOracle();

    const initialized = await oracle.initialize();
    if (!initialized) {
        console.error('❌ Falha na inicialização');
        return;
    }

    await oracle.startMonitoring();

    // Exibe estatísticas a cada minuto
    setInterval(() => {
        console.log(`📊 Transações processadas: ${oracle.processedTransactions.size}`);
    }, 60000);

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🔄 Encerrando oracle...');
        oracle.stop();
        process.exit(0);
    });
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SimpleOracle; 