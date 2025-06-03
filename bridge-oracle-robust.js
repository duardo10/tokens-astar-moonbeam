const { ethers } = require('ethers');

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

const PRIVATE_KEY = 'f9f3eef39586e9398d4bcebf01001e38d34ee19b32894fc54ee6c2f548ba2bce';

const BRIDGE_ABI = [
    "function unlockTokens(address user, uint256 amount, bytes32 transactionId) external",
    "function mintTokens(address user, uint256 amount, bytes32 transactionId) external",
    "event TokensLocked(address indexed user, uint256 amount, string destinationChain, address destinationAddress, bytes32 indexed transactionId)",
    "event TokensBurned(address indexed user, uint256 amount, string destinationChain, address destinationAddress, bytes32 indexed transactionId)"
];

class RobustOracle {
    constructor() {
        this.processedTransactions = new Set();
        this.isRunning = false;
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.reconnectInterval = 30000; // 30 segundos
        this.lastBlockMoonbeam = 0;
        this.lastBlockAstar = 0;
    }

    async initialize() {
        console.log('Inicializando oracle robusto...');
        await this.setupConnections();
        console.log('Oracle inicializado com sucesso!');
        console.log('Endereço:', this.moonbeamWallet.address);
        
        // Prevenção de reconexão
        this.setupAutoReconnect();
    }

    async setupConnections() {
        // Providers com configurações de reconexão
        this.moonbeamProvider = new ethers.JsonRpcProvider(CONFIG.moonbeam.rpc, {
            name: 'moonbeam',
            chainId: 1287
        });
        
        this.astarProvider = new ethers.JsonRpcProvider(CONFIG.astar.rpc, {
            name: 'astar',
            chainId: 81
        });

        // Wallets
        this.moonbeamWallet = new ethers.Wallet(PRIVATE_KEY, this.moonbeamProvider);
        this.astarWallet = new ethers.Wallet(PRIVATE_KEY, this.astarProvider);

        // Contratos
        this.moonbeamBridge = new ethers.Contract(CONFIG.moonbeam.bridgeAddress, BRIDGE_ABI, this.moonbeamWallet);
        this.astarBridge = new ethers.Contract(CONFIG.astar.bridgeAddress, BRIDGE_ABI, this.astarWallet);

        // Pegar blocos atuais
        this.lastBlockMoonbeam = await this.moonbeamProvider.getBlockNumber();
        this.lastBlockAstar = await this.astarProvider.getBlockNumber();
    }

    async startMonitoring() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('Iniciando monitoramento robusto...\n');

        // Usar polling ao invés de WebSocket para evitar problemas de filtro
        this.startPolling();
        
        // Configurar reconexão automática
        this.setupAutoReconnect();

        console.log('Oracle ativo! Usando polling para eventos...');
    }

    startPolling() {
        // Polling para Moonbeam (TokensLocked)
        this.moonbeamInterval = setInterval(async () => {
            try {
                await this.pollMoonbeamEvents();
            } catch (error) {
                console.error('⚠️ Erro no polling Moonbeam:', error.message);
                this.handleError('Moonbeam', error);
            }
        }, 10000); // 10 segundos

        // Polling para Astar (TokensBurned)
        this.astarInterval = setInterval(async () => {
            try {
                await this.pollAstarEvents();
            } catch (error) {
                console.error('⚠️ Erro no polling Astar:', error.message);
                this.handleError('Astar', error);
            }
        }, 10000); // 10 segundos
    }

    async pollMoonbeamEvents() {
        const currentBlock = await this.moonbeamProvider.getBlockNumber();
        
        if (currentBlock > this.lastBlockMoonbeam) {
            // Buscar eventos TokensLocked dos últimos blocos
            const filter = this.moonbeamBridge.filters.TokensLocked();
            const events = await this.moonbeamBridge.queryFilter(filter, this.lastBlockMoonbeam + 1, currentBlock);
            
            for (const event of events) {
                await this.handleTokensLocked(
                    event.args.user,
                    event.args.amount,
                    event.args.destinationChain,
                    event.args.destinationAddress,
                    event.args.transactionId
                );
            }
            
            this.lastBlockMoonbeam = currentBlock;
        }
    }

    async pollAstarEvents() {
        const currentBlock = await this.astarProvider.getBlockNumber();
        
        if (currentBlock > this.lastBlockAstar) {
            // Buscar eventos TokensBurned dos últimos blocos
            const filter = this.astarBridge.filters.TokensBurned();
            const events = await this.astarBridge.queryFilter(filter, this.lastBlockAstar + 1, currentBlock);
            
            for (const event of events) {
                await this.handleTokensBurned(
                    event.args.user,
                    event.args.amount,
                    event.args.destinationChain,
                    event.args.destinationAddress,
                    event.args.transactionId
                );
            }
            
            this.lastBlockAstar = currentBlock;
        }
    }

    async handleTokensLocked(user, amount, destinationChain, destinationAddress, transactionId) {
        try {
            const txId = transactionId.toString();
            
            if (this.processedTransactions.has(txId)) {
                return;
            }

            console.log(`EVENTO DETECTADO - Tokens Bloqueados:`);
            console.log(`   Usuário: ${user}`);
            console.log(`   Quantidade: ${ethers.formatEther(amount)} tokens`);
            console.log(`   Destino: ${destinationChain}`);
            console.log(`   Endereço: ${destinationAddress}`);
            console.log(`   TX ID: ${txId.substring(0, 10)}...`);

            // Aguardar confirmações
            console.log('Aguardando confirmações...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Executar mint
            console.log('Executando mint no Astar...');
            const mintTx = await this.astarBridge.mintTokens(destinationAddress, amount, transactionId, {
                gasLimit: 300000
            });

            console.log(`   Hash: ${mintTx.hash}`);
            const receipt = await mintTx.wait();
            console.log(`   Mint concluído! Gas usado: ${receipt.gasUsed}`);

            // Marcar como processado
            this.processedTransactions.add(txId);
            console.log(`Transferência cross-chain concluída!\n`);

        } catch (error) {
            this.handleError('Erro ao processar lock', error);
        }
    }

    async handleTokensBurned(user, amount, destinationChain, destinationAddress, transactionId) {
        try {
            const txId = transactionId.toString();
            
            if (this.processedTransactions.has(txId)) {
                return;
            }

            console.log(`EVENTO DETECTADO - Tokens Queimados:`);
            console.log(`   Usuário: ${user}`);
            console.log(`   Quantidade: ${ethers.formatEther(amount)} tokens`);
            console.log(`   Destino: ${destinationChain}`);
            console.log(`   Endereço: ${destinationAddress}`);
            console.log(`   TX ID: ${txId.substring(0, 10)}...`);

            // Aguardar confirmações
            console.log('Aguardando confirmações...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Executar unlock
            console.log('Executando unlock no Moonbeam...');
            const unlockTx = await this.moonbeamBridge.unlockTokens(destinationAddress, amount, transactionId, {
                gasLimit: 300000
            });

            console.log(`   Hash: ${unlockTx.hash}`);
            const receipt = await unlockTx.wait();
            console.log(`   Unlock concluído! Gas usado: ${receipt.gasUsed}`);

            // Marcar como processado
            this.processedTransactions.add(txId);
            console.log(`Transferência cross-chain concluída!\n`);

        } catch (error) {
            this.handleError('Erro ao processar burn', error);
        }
    }

    handleError(context, error) {
        this.retryAttempts++;
        
        if (error.code === 'FILTER_NOT_FOUND' || error.message.includes('filter not found')) {
            console.log('Filtro expirado, reconectando...');
            
            if (this.retryAttempts <= this.maxRetries) {
                console.log(`Tentativa ${this.retryAttempts}/${this.maxRetries} em 5 segundos...`);
                setTimeout(() => {
                    this.reconnect();
                }, 5000);
            } else {
                console.error('Máximo de tentativas atingido. Parando oracle.');
                this.stop();
            }
        } else {
            console.log('Reconectando oracle...');
            setTimeout(() => {
                this.reconnect();
            }, 3000);
        }
    }

    async reconnect() {
        try {
            this.retryAttempts = 0;
            this.stop();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.initialize();
            await this.startMonitoring();
            console.log('Reconexão bem-sucedida!');
        } catch (error) {
            console.error('Erro na reconexão:', error.message);
            this.handleError('Reconexão', error);
        }
    }

    async restart() {
        console.log('Reiniciando oracle completamente...');
        this.stop();
        await new Promise(resolve => setTimeout(resolve, 5000));
        await this.initialize();
        await this.startMonitoring();
    }

    setupAutoReconnect() {
        // Reconexão preventiva a cada 30 minutos
        setInterval(async () => {
            if (!this.isRunning) return;
            
            console.log('Reconexão preventiva...');
            await this.setupConnections();
        }, this.reconnectInterval);
    }

    stop() {
        this.isRunning = false;
        if (this.moonbeamInterval) clearInterval(this.moonbeamInterval);
        if (this.astarInterval) clearInterval(this.astarInterval);
        console.log('Oracle parado');
    }
}

async function main() {
    const oracle = new RobustOracle();

    const initialized = await oracle.initialize();
    if (!initialized) {
        console.error('❌ Falha na inicialização');
        return;
    }

    await oracle.startMonitoring();

    // Exibe estatísticas a cada minuto
    setInterval(() => {
        console.log('\n='.repeat(60));
        console.log(`Transações processadas: ${oracle.processedTransactions.size}`);
        console.log(`Status: ${oracle.isRunning ? 'ATIVO' : 'INATIVO'}`);
        console.log('='.repeat(60));
    }, 60000);

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nEncerrando oracle...');
        oracle.stop();
        process.exit(0);
    });
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = RobustOracle; 