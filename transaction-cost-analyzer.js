const { ethers } = require('ethers');
const fs = require('fs');

class TransactionCostAnalyzer {
    constructor() {
        this.PRIVATE_KEY = 'f9f3eef39586e9398d4bcebf01001e38d34ee19b32894fc54ee6c2f548ba2bce';
        
        this.CONFIG = {
            moonbeam: {
                rpc: 'https://rpc.api.moonbase.moonbeam.network',
                bridgeAddress: '0xAeBF38ea2Ac91FD912DD88b839b1E7E175063249',
                tokenAddress: '0x66f77aEaAa01f4AB4B34fA229D550Bf7E10Dd2A5',
                nativeCurrency: 'DEV',
                explorer: 'https://moonbase.moonscan.io',
                chainId: 1287,
                faucetUrl: 'https://faucet.moonbeam.network/'
            },
            astar: {
                rpc: 'https://evm.shibuya.astar.network',
                bridgeAddress: '0x0c33d1599cbeAa6D42D43eEb5986f7917c7c467e',
                tokenAddress: '0xA1fe69910aBd0f78227E672A6b9B27A53B5648cA',
                nativeCurrency: 'SBY',
                explorer: 'https://shibuya.subscan.io',
                chainId: 81,
                faucetUrl: 'https://portal.astar.network/astar/assets'
            }
        };

        this.BRIDGE_ABI = [
            "function lockTokens(uint256 amount, string memory destinationChain, address destinationAddress) external",
            "function burnTokens(uint256 amount, string memory destinationChain, address destinationAddress) external",
            "function mintTokens(address user, uint256 amount, bytes32 transactionId) external",
            "function unlockTokens(address user, uint256 amount, bytes32 transactionId) external"
        ];

        this.TOKEN_ABI = [
            "function balanceOf(address owner) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)"
        ];

        this.costHistory = [];
        this.costHistoryFile = 'transaction-costs-analysis.json';
        this.loadCostHistory();
    }

    async initialize() {
        try {
            console.log('Inicializando Transaction Cost Analyzer...');
            
            this.moonbeamProvider = new ethers.JsonRpcProvider(this.CONFIG.moonbeam.rpc);
            this.astarProvider = new ethers.JsonRpcProvider(this.CONFIG.astar.rpc);

            this.moonbeamWallet = new ethers.Wallet(this.PRIVATE_KEY, this.moonbeamProvider);
            this.astarWallet = new ethers.Wallet(this.PRIVATE_KEY, this.astarProvider);

            this.moonbeamBridge = new ethers.Contract(this.CONFIG.moonbeam.bridgeAddress, this.BRIDGE_ABI, this.moonbeamWallet);
            this.moonbeamToken = new ethers.Contract(this.CONFIG.moonbeam.tokenAddress, this.TOKEN_ABI, this.moonbeamWallet);
            this.astarBridge = new ethers.Contract(this.CONFIG.astar.bridgeAddress, this.BRIDGE_ABI, this.astarWallet);
            this.astarToken = new ethers.Contract(this.CONFIG.astar.tokenAddress, this.TOKEN_ABI, this.astarWallet);

            console.log('Cost Analyzer inicializado com sucesso!');
            console.log(`Endereco da carteira: ${this.moonbeamWallet.address}`);
            
            return true;
        } catch (error) {
            console.error('Erro na inicializacao:', error.message);
            return false;
        }
    }

    loadCostHistory() {
        try {
            if (fs.existsSync(this.costHistoryFile)) {
                const data = fs.readFileSync(this.costHistoryFile, 'utf8');
                this.costHistory = JSON.parse(data);
            }
            
            // Integrar com histórico da bridge se existir
            this.integrateWithBridgeHistory();
        } catch (error) {
            this.costHistory = [];
        }
    }

    integrateWithBridgeHistory() {
        try {
            const bridgeHistoryFile = 'bridge-transaction-history.json';
            if (fs.existsSync(bridgeHistoryFile)) {
                const bridgeData = JSON.parse(fs.readFileSync(bridgeHistoryFile, 'utf8'));
                console.log(`Integrando com ${bridgeData.length} transações do histórico da bridge...`);
                
                // Converter transações da bridge para formato de análise de custos
                bridgeData.forEach(tx => {
                    if (!this.costHistory.find(c => c.bridgeTransactionId === tx.id)) {
                        const costAnalysis = this.convertBridgeTransactionToCostAnalysis(tx);
                        if (costAnalysis) {
                            this.costHistory.push(costAnalysis);
                        }
                    }
                });
                
                console.log(`Total de ${this.costHistory.length} análises de custo carregadas.`);
            }
        } catch (error) {
            console.log('Erro ao integrar com histórico da bridge:', error.message);
        }
    }

    convertBridgeTransactionToCostAnalysis(bridgeTx) {
        if (bridgeTx.status !== 'SUCCESS') {
            return null; // Só analisar transações bem-sucedidas
        }

        const direction = bridgeTx.direction === 'Moonbeam → Astar' ? 'Moonbeam -> Astar' : 'Astar -> Moonbeam';
        
        // Estimativas baseadas em dados reais coletados
        let devCost = 0;
        let sbyCost = 0;
        let totalGasUsed = 0;

        if (bridgeTx.direction === 'Moonbeam → Astar') {
            devCost = 0.00000418; // approve + lock
            sbyCost = 0.13114638; // mint
            totalGasUsed = parseInt(bridgeTx.gasUsedLock || 86864) + parseInt(bridgeTx.gasUsedMint || 168272);
        } else {
            sbyCost = 0.13006000; // burn
            devCost = 0.00008700; // unlock
            totalGasUsed = parseInt(bridgeTx.gasUsedBurn || 167440) + parseInt(bridgeTx.gasUsedUnlock || 87280);
        }

        return {
            bridgeTransactionId: bridgeTx.id,
            direction: direction,
            timestamp: bridgeTx.timestamp,
            transferAmount: bridgeTx.amount || '1.0',
            success: true,
            totalCosts: {
                devSpent: devCost.toFixed(8),
                sbySpent: sbyCost.toFixed(8),
                devSpentReal: devCost.toFixed(8),
                sbySpentReal: sbyCost.toFixed(8),
                moonbeamTotal: devCost.toFixed(8),
                astarTotal: sbyCost.toFixed(8),
                totalGasUsed: {
                    total: totalGasUsed
                }
            },
            bridgeHashes: {
                lockHash: bridgeTx.lockHash,
                mintHash: bridgeTx.mintHash,
                burnHash: bridgeTx.burnHash,
                unlockHash: bridgeTx.unlockHash
            },
            testnetInfo: {
                moonbeamFaucet: this.CONFIG.moonbeam.faucetUrl,
                astarFaucet: this.CONFIG.astar.faucetUrl
            }
        };
    }

    saveCostHistory() {
        try {
            fs.writeFileSync(this.costHistoryFile, JSON.stringify(this.costHistory, null, 2));
        } catch (error) {
            console.error('Erro ao salvar historico de custos:', error.message);
        }
    }

    async getNetworkInfo(provider, networkName) {
        try {
            const gasPrice = await provider.getGasPrice();
            const blockNumber = await provider.getBlockNumber();
            const block = await provider.getBlock(blockNumber);
            const network = await provider.getNetwork();
            
            return {
                network: networkName,
                chainId: Number(network.chainId).toString(),
                gasPrice: gasPrice.toString(),
                gasPriceGwei: ethers.formatUnits(gasPrice, 'gwei'),
                gasPriceWei: gasPrice.toString(),
                blockNumber: blockNumber,
                blockTimestamp: block.timestamp,
                baseFee: block.baseFeePerGas ? block.baseFeePerGas.toString() : null,
                baseFeeGwei: block.baseFeePerGas ? ethers.formatUnits(block.baseFeePerGas, 'gwei') : null,
                difficulty: block.difficulty ? block.difficulty.toString() : null,
                gasLimit: block.gasLimit ? block.gasLimit.toString() : null
            };
        } catch (error) {
            console.error(`Erro ao coletar info da rede ${networkName}:`, error.message);
            return {
                network: networkName,
                chainId: networkName === 'Moonbeam' ? '1287' : '81',
                error: error.message
            };
        }
    }

    async getNativeBalance(provider, wallet, currency) {
        try {
            const balance = await provider.getBalance(wallet.address);
            return {
                raw: balance.toString(),
                formatted: ethers.formatEther(balance),
                currency: currency,
                wei: balance.toString()
            };
        } catch (error) {
            return {
                error: error.message,
                currency: currency
            };
        }
    }

    async analyzeTransactionCost(txHash, provider, networkName, currency) {
        try {
            const receipt = await provider.getTransactionReceipt(txHash);
            const tx = await provider.getTransaction(txHash);
            
            if (!receipt || !tx) {
                throw new Error('Transacao nao encontrada');
            }

            const gasUsed = receipt.gasUsed;
            const gasPrice = tx.gasPrice;
            const gasLimit = tx.gasLimit;
            const totalCost = gasUsed * gasPrice;
            const effectiveGasPrice = receipt.effectiveGasPrice || gasPrice;
            const totalEffectiveCost = gasUsed * effectiveGasPrice;
            const gasEfficiency = (Number(gasUsed) / Number(gasLimit)) * 100;

            return {
                network: networkName,
                txHash: txHash,
                status: receipt.status === 1 ? 'SUCCESS' : 'FAILED',
                blockNumber: receipt.blockNumber,
                blockHash: receipt.blockHash,
                transactionIndex: receipt.transactionIndex,
                from: tx.from,
                to: tx.to,
                value: tx.value.toString(),
                gasLimit: gasLimit.toString(),
                gasUsed: gasUsed.toString(),
                gasPrice: gasPrice.toString(),
                gasPriceGwei: ethers.formatUnits(gasPrice, 'gwei'),
                effectiveGasPrice: effectiveGasPrice.toString(),
                effectiveGasPriceGwei: ethers.formatUnits(effectiveGasPrice, 'gwei'),
                totalCost: totalCost.toString(),
                totalCostFormatted: ethers.formatEther(totalCost),
                totalEffectiveCost: totalEffectiveCost.toString(),
                totalEffectiveCostFormatted: ethers.formatEther(totalEffectiveCost),
                gasEfficiency: gasEfficiency.toFixed(2),
                currency: currency,
                explorerUrl: `${this.CONFIG[networkName.toLowerCase()].explorer}/tx/${txHash}`,
                cumulativeGasUsed: receipt.cumulativeGasUsed ? receipt.cumulativeGasUsed.toString() : null,
                logsBloom: receipt.logsBloom,
                logs: receipt.logs.length
            };
        } catch (error) {
            return {
                network: networkName,
                txHash: txHash,
                error: error.message
            };
        }
    }

    async estimateGasForOperations() {
        console.log('\nESTIMATIVA DE GAS PARA OPERACOES:');
        console.log('='.repeat(50));
        
        const transferAmount = ethers.parseEther("1");
        
        try {
            // Estimar approve
            const approveEstimate = await this.moonbeamToken.approve.estimateGas(
                this.CONFIG.moonbeam.bridgeAddress,
                transferAmount
            );
            console.log(`Approve (Moonbeam): ${approveEstimate.toString()} gas`);
            
            return {
                approve: approveEstimate.toString(),
                lock: "~87000",
                mint: "~168000"
            };
            
        } catch (error) {
            console.log('Usando estimativas baseadas no historico:');
            console.log('Approve (Moonbeam): ~47000 gas');
            console.log('Lock (Moonbeam): ~87000 gas');
            console.log('Mint (Astar): ~168000 gas');
            
            return {
                approve: "~47000",
                lock: "~87000",
                mint: "~168000"
            };
        }
    }

    async executeMoonbeamToAstarWithCostAnalysis() {
        console.log('\nEXECUTANDO: Moonbeam -> Astar (Com Analise de Custos)');
        console.log('='.repeat(70));

        const transferAmount = ethers.parseEther("1");
        const analysisData = {
            direction: 'Moonbeam -> Astar',
            timestamp: new Date().toISOString(),
            transferAmount: ethers.formatEther(transferAmount),
            testnetInfo: {
                moonbeamFaucet: this.CONFIG.moonbeam.faucetUrl,
                astarFaucet: this.CONFIG.astar.faucetUrl
            }
        };

        try {
            // 1. Coletar informacoes iniciais das redes
            console.log('Coletando informacoes das redes...');
            const moonbeamInfo = await this.getNetworkInfo(this.moonbeamProvider, 'Moonbeam');
            const astarInfo = await this.getNetworkInfo(this.astarProvider, 'Astar');
            
            // 2. Verificar saldos nativos iniciais
            const moonbeamBalanceInit = await this.getNativeBalance(this.moonbeamProvider, this.moonbeamWallet, 'DEV');
            const astarBalanceInit = await this.getNativeBalance(this.astarProvider, this.astarWallet, 'SBY');

            // 3. Estimar gas
            const gasEstimates = await this.estimateGasForOperations();

            analysisData.initialNetworkInfo = {
                moonbeam: moonbeamInfo,
                astar: astarInfo
            };
            
            analysisData.initialNativeBalances = {
                moonbeam: moonbeamBalanceInit,
                astar: astarBalanceInit
            };

            analysisData.gasEstimates = gasEstimates;

            console.log(`Moonbeam Chain ID: ${moonbeamInfo.chainId}`);
            console.log(`Moonbeam Gas Price: ${moonbeamInfo.gasPriceGwei} Gwei`);
            console.log(`Astar Chain ID: ${astarInfo.chainId}`);
            console.log(`Astar Gas Price: ${astarInfo.gasPriceGwei} Gwei`);
            console.log(`Saldo DEV inicial: ${moonbeamBalanceInit.formatted} DEV`);
            console.log(`Saldo SBY inicial: ${astarBalanceInit.formatted} SBY`);

            // 4. Aprovar tokens no Moonbeam
            console.log('\nAprovando tokens no Moonbeam...');
            const approveTx = await this.moonbeamToken.approve(this.CONFIG.moonbeam.bridgeAddress, transferAmount);
            console.log(`Hash da aprovacao: ${approveTx.hash}`);
            
            const approveReceipt = await approveTx.wait();
            const approveCostAnalysis = await this.analyzeTransactionCost(approveTx.hash, this.moonbeamProvider, 'Moonbeam', 'DEV');
            
            analysisData.approveTransaction = approveCostAnalysis;
            console.log(`Custo da aprovacao: ${approveCostAnalysis.totalEffectiveCostFormatted} DEV`);
            console.log(`Gas usado: ${approveCostAnalysis.gasUsed} / ${approveCostAnalysis.gasLimit} (${approveCostAnalysis.gasEfficiency}%)`);

            // 5. Lock tokens no Moonbeam
            console.log('\nBloqueando tokens no Moonbeam...');
            const lockTx = await this.moonbeamBridge.lockTokens(
                transferAmount,
                "shibuya",
                this.moonbeamWallet.address
            );
            console.log(`Hash do lock: ${lockTx.hash}`);
            
            const lockReceipt = await lockTx.wait();
            const lockCostAnalysis = await this.analyzeTransactionCost(lockTx.hash, this.moonbeamProvider, 'Moonbeam', 'DEV');
            
            analysisData.lockTransaction = lockCostAnalysis;
            console.log(`Custo do lock: ${lockCostAnalysis.totalEffectiveCostFormatted} DEV`);
            console.log(`Gas usado: ${lockCostAnalysis.gasUsed} / ${lockCostAnalysis.gasLimit} (${lockCostAnalysis.gasEfficiency}%)`);

            // 6. Aguardar processamento
            console.log('\nAguardando processamento do oracle...');
            await new Promise(resolve => setTimeout(resolve, 10000));

            // 7. Mint tokens no Astar
            const transactionId = ethers.keccak256(ethers.toUtf8Bytes(`${lockTx.hash}_${Date.now()}`));
            console.log('\nExecutando mint no Astar...');
            
            const mintTx = await this.astarBridge.mintTokens(
                this.moonbeamWallet.address,
                transferAmount,
                transactionId,
                { gasLimit: 300000 }
            );
            console.log(`Hash do mint: ${mintTx.hash}`);
            
            const mintReceipt = await mintTx.wait();
            const mintCostAnalysis = await this.analyzeTransactionCost(mintTx.hash, this.astarProvider, 'Astar', 'SBY');
            
            analysisData.mintTransaction = mintCostAnalysis;
            console.log(`Custo do mint: ${mintCostAnalysis.totalEffectiveCostFormatted} SBY`);
            console.log(`Gas usado: ${mintCostAnalysis.gasUsed} / ${mintCostAnalysis.gasLimit} (${mintCostAnalysis.gasEfficiency}%)`);

            // 8. Verificar saldos nativos finais
            const moonbeamBalanceFinal = await this.getNativeBalance(this.moonbeamProvider, this.moonbeamWallet, 'DEV');
            const astarBalanceFinal = await this.getNativeBalance(this.astarProvider, this.astarWallet, 'SBY');

            analysisData.finalNativeBalances = {
                moonbeam: moonbeamBalanceFinal,
                astar: astarBalanceFinal
            };

            // 9. Calcular custos totais e diferenças
            const totalMoonbeamCost = parseFloat(approveCostAnalysis.totalEffectiveCostFormatted) + parseFloat(lockCostAnalysis.totalEffectiveCostFormatted);
            const totalAstarCost = parseFloat(mintCostAnalysis.totalEffectiveCostFormatted);
            
            const devSpentReal = parseFloat(moonbeamBalanceInit.formatted) - parseFloat(moonbeamBalanceFinal.formatted);
            const sbySpentReal = parseFloat(astarBalanceInit.formatted) - parseFloat(astarBalanceFinal.formatted);

            analysisData.totalCosts = {
                moonbeamTotal: totalMoonbeamCost.toFixed(8),
                astarTotal: totalAstarCost.toFixed(8),
                devSpent: totalMoonbeamCost.toFixed(8),
                sbySpent: totalAstarCost.toFixed(8),
                devSpentReal: devSpentReal.toFixed(8),
                sbySpentReal: Math.abs(sbySpentReal).toFixed(8),
                totalGasUsed: {
                    approve: approveCostAnalysis.gasUsed,
                    lock: lockCostAnalysis.gasUsed,
                    mint: mintCostAnalysis.gasUsed
                }
            };

            analysisData.success = true;
            
            // Salvar dados
            this.costHistory.push(analysisData);
            this.saveCostHistory();

            // Mostrar resumo
            this.showCostSummary(analysisData);
            
            return true;

        } catch (error) {
            console.error('Erro na transferencia:', error.message);
            analysisData.success = false;
            analysisData.error = error.message;
            
            this.costHistory.push(analysisData);
            this.saveCostHistory();
            
            return false;
        }
    }

    showCostSummary(data) {
        console.log('\n' + '='.repeat(80));
        console.log('RESUMO COMPLETO DE CUSTOS DA TRANSACAO');
        console.log('='.repeat(80));
        
        console.log(`Direcao: ${data.direction}`);
        console.log(`Valor transferido: ${data.transferAmount} tokens`);
        console.log(`Status: ${data.success ? 'SUCESSO' : 'FALHA'}`);
        console.log(`Timestamp: ${data.timestamp}`);
        
        if (data.success) {
            console.log('\nINFORMACOES DAS REDES:');
            console.log(`  Moonbeam Chain ID: ${data.initialNetworkInfo.moonbeam.chainId}`);
            console.log(`  Moonbeam Block: ${data.initialNetworkInfo.moonbeam.blockNumber}`);
            console.log(`  Astar Chain ID: ${data.initialNetworkInfo.astar.chainId}`);
            console.log(`  Astar Block: ${data.initialNetworkInfo.astar.blockNumber}`);
            
            console.log('\nCUSTO POR OPERACAO:');
            console.log(`  Aprovacao (Moonbeam):`);
            console.log(`    Gas usado: ${data.approveTransaction.gasUsed} / ${data.approveTransaction.gasLimit} (${data.approveTransaction.gasEfficiency}%)`);
            console.log(`    Gas price: ${data.approveTransaction.gasPriceGwei} Gwei`);
            console.log(`    Custo: ${data.approveTransaction.totalEffectiveCostFormatted} DEV`);
            
            console.log(`  Lock (Moonbeam):`);
            console.log(`    Gas usado: ${data.lockTransaction.gasUsed} / ${data.lockTransaction.gasLimit} (${data.lockTransaction.gasEfficiency}%)`);
            console.log(`    Gas price: ${data.lockTransaction.gasPriceGwei} Gwei`);
            console.log(`    Custo: ${data.lockTransaction.totalEffectiveCostFormatted} DEV`);
            
            console.log(`  Mint (Astar):`);
            console.log(`    Gas usado: ${data.mintTransaction.gasUsed} / ${data.mintTransaction.gasLimit} (${data.mintTransaction.gasEfficiency}%)`);
            console.log(`    Gas price: ${data.mintTransaction.gasPriceGwei} Gwei`);
            console.log(`    Custo: ${data.mintTransaction.totalEffectiveCostFormatted} SBY`);
            
            console.log('\nCUSTO TOTAL:');
            console.log(`  Moonbeam: ${data.totalCosts.moonbeamTotal} DEV`);
            console.log(`  Astar: ${data.totalCosts.astarTotal} SBY`);
            console.log(`  DEV gasto real (diferenca de saldo): ${data.totalCosts.devSpentReal} DEV`);
            console.log(`  SBY gasto real (diferenca de saldo): ${data.totalCosts.sbySpentReal} SBY`);
            
            console.log('\nTAXAS DAS TESTNETS:');
            console.log(`  Moonbeam cobra: ${data.initialNetworkInfo.moonbeam.gasPriceGwei} Gwei por gas`);
            console.log(`  Astar cobra: ${data.initialNetworkInfo.astar.gasPriceGwei} Gwei por gas`);
            
            console.log('\nFAUCETS PARA REPOR TOKENS:');
            console.log(`  Moonbeam DEV: ${data.testnetInfo.moonbeamFaucet}`);
            console.log(`  Astar SBY: ${data.testnetInfo.astarFaucet}`);
            
            console.log('\nVERIFICACAO NOS EXPLORADORES:');
            console.log(`  Approve: ${data.approveTransaction.explorerUrl}`);
            console.log(`  Lock: ${data.lockTransaction.explorerUrl}`);
            console.log(`  Mint: ${data.mintTransaction.explorerUrl}`);
        }
        
        console.log('='.repeat(80));
    }

    showCostHistory() {
        console.log('\nHISTORICO INTEGRADO DE ANALISE DE CUSTOS');
        console.log('='.repeat(140));
        
        if (this.costHistory.length === 0) {
            console.log('Nenhuma analise de custo registrada.');
            console.log('Execute: node transaction-cost-analyzer.js');
            return;
        }

        console.log('| ID | Timestamp           | Direcao           | DEV Gasto | SBY Gasto | Gas Total | Hashes                | Fonte   |');
        console.log('|----|---------------------|-------------------|-----------|-----------|-----------|----------------------|---------|');
        
        this.costHistory.forEach((record, index) => {
            const timestamp = new Date(record.timestamp).toLocaleString().substring(0, 19);
            const devCost = record.totalCosts ? record.totalCosts.devSpent : 'N/A';
            const sbyCost = record.totalCosts ? record.totalCosts.sbySpent : 'N/A';
            const gasTotal = record.totalCosts?.totalGasUsed?.total || 'N/A';
            const source = record.bridgeTransactionId ? 'Bridge' : 'Analyzer';
            
            // Mostrar hash principal
            let mainHash = 'N/A';
            if (record.bridgeHashes?.lockHash) mainHash = record.bridgeHashes.lockHash.substring(0, 10) + '...';
            else if (record.bridgeHashes?.burnHash) mainHash = record.bridgeHashes.burnHash.substring(0, 10) + '...';
            else if (record.lockTransaction?.txHash) mainHash = record.lockTransaction.txHash.substring(0, 10) + '...';
            
            console.log(`| ${(index + 1).toString().padStart(2)} | ${timestamp} | ${record.direction.padEnd(17)} | ${devCost.padEnd(9)} | ${sbyCost.padEnd(9)} | ${gasTotal.toString().padEnd(9)} | ${mainHash.padEnd(20)} | ${source.padEnd(7)} |`);
        });
        
        console.log('='.repeat(140));
        
        // Estatisticas detalhadas
        const successful = this.costHistory.filter(r => r.success);
        const bridgeTransactions = this.costHistory.filter(r => r.bridgeTransactionId);
        const analyzerTransactions = this.costHistory.filter(r => !r.bridgeTransactionId);
        
        if (successful.length > 0) {
            const totalDev = successful.reduce((sum, r) => sum + (r.totalCosts ? parseFloat(r.totalCosts.devSpentReal || r.totalCosts.devSpent) : 0), 0);
            const totalSby = successful.reduce((sum, r) => sum + (r.totalCosts ? parseFloat(r.totalCosts.sbySpentReal || r.totalCosts.sbySpent) : 0), 0);
            
            console.log('\nESTATISTICAS INTEGRADAS:');
            console.log(`Total de analises: ${this.costHistory.length}`);
            console.log(`  - Do Bridge History: ${bridgeTransactions.length}`);
            console.log(`  - Do Cost Analyzer: ${analyzerTransactions.length}`);
            console.log(`Sucessos: ${successful.length}`);
            console.log(`\nCUSTO TOTAL ACUMULADO:`);
            console.log(`DEV gasto: ${totalDev.toFixed(8)} DEV (~$${(totalDev * 0.005).toFixed(6)} USD)`);
            console.log(`SBY gasto: ${totalSby.toFixed(8)} SBY (~$${(totalSby * 0.00005).toFixed(6)} USD)`);
            console.log(`Media DEV por transacao: ${(totalDev / successful.length).toFixed(8)} DEV`);
            console.log(`Media SBY por transacao: ${(totalSby / successful.length).toFixed(8)} SBY`);
            
            // Análise por direção
            const moonbeamToAstar = successful.filter(r => r.direction.includes('Moonbeam'));
            const astarToMoonbeam = successful.filter(r => r.direction.includes('Astar'));
            
            console.log(`\nANALISE POR DIRECAO:`);
            console.log(`Moonbeam → Astar: ${moonbeamToAstar.length} transações`);
            console.log(`Astar → Moonbeam: ${astarToMoonbeam.length} transações`);
            
            if (bridgeTransactions.length > 0) {
                console.log(`\nINTEGRACAO COM BRIDGE:`);
                console.log(`✅ ${bridgeTransactions.length} transações integradas do bridge-transaction-history.json`);
                console.log(`📊 Para relatório Excel completo execute: node create-excel-report.js`);
            }
        }
    }

    exportCostAnalysisToCSV() {
        const csvHeader = 'ID,Timestamp,Direction,TransferAmount,DevSpent,SbySpent,DevReal,SbyReal,MoonbeamGasPrice,AstarGasPrice,Status,ApproveHash,LockHash,MintHash,ApproveGas,LockGas,MintGas\n';
        
        const csvData = this.costHistory.map((record, index) => {
            return [
                index + 1,
                record.timestamp,
                record.direction,
                record.transferAmount,
                record.totalCosts ? record.totalCosts.devSpent : '',
                record.totalCosts ? record.totalCosts.sbySpent : '',
                record.totalCosts ? record.totalCosts.devSpentReal : '',
                record.totalCosts ? record.totalCosts.sbySpentReal : '',
                record.initialNetworkInfo ? record.initialNetworkInfo.moonbeam.gasPriceGwei : '',
                record.initialNetworkInfo ? record.initialNetworkInfo.astar.gasPriceGwei : '',
                record.success ? 'SUCCESS' : 'FAILED',
                record.approveTransaction ? record.approveTransaction.txHash : '',
                record.lockTransaction ? record.lockTransaction.txHash : '',
                record.mintTransaction ? record.mintTransaction.txHash : '',
                record.approveTransaction ? record.approveTransaction.gasUsed : '',
                record.lockTransaction ? record.lockTransaction.gasUsed : '',
                record.mintTransaction ? record.mintTransaction.gasUsed : ''
            ].join(',');
        }).join('\n');

        const csvContent = csvHeader + csvData;
        const fileName = `transaction-costs-${new Date().toISOString().split('T')[0]}.csv`;
        
        fs.writeFileSync(fileName, csvContent);
        console.log(`Analise de custos exportada para: ${fileName}`);
    }
}

async function main() {
    const analyzer = new TransactionCostAnalyzer();
    
    if (!(await analyzer.initialize())) {
        process.exit(1);
    }

    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === 'test') {
        // Executar teste com analise de custos
        console.log('Executando teste de transferencia com analise completa de custos...');
        await analyzer.executeMoonbeamToAstarWithCostAnalysis();
        
    } else if (args[0] === 'history') {
        // Mostrar historico
        analyzer.showCostHistory();
        
    } else if (args[0] === 'export') {
        // Exportar para CSV
        analyzer.exportCostAnalysisToCSV();
        
    } else {
        console.log('Comandos disponiveis:');
        console.log('  node transaction-cost-analyzer.js        - Executar teste com analise completa');
        console.log('  node transaction-cost-analyzer.js history - Mostrar historico de custos');
        console.log('  node transaction-cost-analyzer.js export  - Exportar analise para CSV');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = TransactionCostAnalyzer;