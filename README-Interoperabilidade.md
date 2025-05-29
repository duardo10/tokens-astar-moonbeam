# 🔗 Sistema de Interoperabilidade - MeuToken Bridge

Este projeto implementa uma bridge para transferências cross-chain entre **MeuToken** (Moonbeam) e **MeuTokenAstar** (Astar), permitindo interoperabilidade total entre as duas redes.

## 📊 Resumo das Implementações Atuais

### 🌙 MeuTokenMoobeam (Moonbase Alpha)
- **Token**: `MeuToken` (MTK)
- **Supply**: 1 milhão de tokens (configurável)
- **Rede**: Moonbase Alpha Testnet
- **Deploy**: Automatizado a cada 1 minuto
- **Consumo médio**: ~1.5M gás, ~5 segundos

### 🌟 MeuTokenStar (Shibuya)
- **Token**: `MeuTokenAstar` (MTA)
- **Supply**: 1 milhão de tokens (fixo)
- **Rede**: Shibuya Testnet (Astar)
- **Deploy**: Automatizado a cada 1 minuto  
- **Consumo médio**: ~972K gás, ~7-9 segundos

## 🏗️ Arquitetura da Bridge

### Componentes Principais

1. **InteroperabilityBridge.sol** - Contrato inteligente da bridge
2. **BridgeOracle.js** - Oracle que monitora e executa transferências
3. **Tokens ERC20** - Tokens nas duas redes

### Fluxo de Funcionamento

```
┌─────────────┐    Lock     ┌─────────────┐    Mint      ┌─────────────┐
│   Moonbeam  │ ────────→   │   Oracle    │ ────────→    │    Astar    │
│  (MeuToken) │             │   Monitor   │              │(MeuTokenAstar)│
└─────────────┘             └─────────────┘              └─────────────┘
       ↑                           │                              │
       │        Unlock             │ Event                  Burn  │
       └───────────────────────────┴──────────────────────────────┘
```

## 🚀 Como Implementar a Interoperabilidade

### Passo 1: Deploy dos Contratos Bridge

#### No Moonbeam:
```bash
cd MeuTokenMoobeam
# Adicione o contrato InteroperabilityBridge.sol na pasta contracts/
npx hardhat run scripts/deploy-bridge.js --network moonbase
```

#### No Astar:
```bash
cd MeuTokenStar  
# Adicione o contrato InteroperabilityBridge.sol na pasta contracts/
npx hardhat run scripts/deploy-bridge.js --network shibuya
```

### Passo 2: Configurar o Oracle

1. **Instalar dependências:**
```bash
npm install ethers dotenv
```

2. **Configurar variáveis de ambiente:**
```bash
# Copie o arquivo de exemplo
cp env-example.txt .env

# Edite o .env com seus valores:
BRIDGE_OPERATOR_PRIVATE_KEY=sua_chave_privada
MOONBEAM_BRIDGE_ADDRESS=endereco_bridge_moonbeam
ASTAR_BRIDGE_ADDRESS=endereco_bridge_astar
```

3. **Executar o Oracle:**
```bash
node BridgeOracle.js
```

### Passo 3: Usar a Bridge

#### Transferir de Moonbeam para Astar:

```javascript
// No Moonbeam - Bloquear tokens
const bridgeContract = new ethers.Contract(bridgeAddress, abi, signer);

await bridgeContract.lockTokens(
    ethers.parseEther("100"),        // 100 tokens
    "shibuya",                       // rede destino
    "0x742d35cc..." // endereço destino
);
```

#### Transferir de Astar para Moonbeam:

```javascript
// No Astar - Queimar tokens  
const bridgeContract = new ethers.Contract(bridgeAddress, abi, signer);

await bridgeContract.burnTokens(
    ethers.parseEther("100"),        // 100 tokens
    "moonbase",                      // rede destino
    "0x742d35cc..." // endereço destino
);
```

## 🔧 Scripts de Deploy para Bridge

Crie os seguintes scripts em cada projeto:

### deploy-bridge.js (para ambos os projetos):

```javascript
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying bridge with account:", deployer.address);

  // Endereço do token (ajuste para cada rede)
  const tokenAddress = "ENDERECO_DO_SEU_TOKEN_AQUI";
  
  const Bridge = await ethers.getContractFactory("InteroperabilityBridge");
  const bridge = await Bridge.deploy(tokenAddress);
  
  await bridge.waitForDeployment();
  
  console.log("Bridge deployed at:", bridge.target);
  console.log("Token address:", tokenAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

## 🛡️ Recursos de Segurança

### 1. **Controle de Acesso**
- Apenas o owner pode executar `unlockTokens` e `mintTokens`
- Proteção contra reentrancy

### 2. **Prevenção de Double-Spending**
- Mapping de transações processadas
- IDs únicos para cada operação cross-chain

### 3. **Confirmações de Bloco**
- Oracle aguarda confirmações antes de processar
- Configurável via variáveis de ambiente

## 📊 Monitoramento e Logs

### Eventos Importantes:

- `TokensLocked` - Tokens bloqueados no Moonbeam
- `TokensBurned` - Tokens queimados no Astar  
- `TokensUnlocked` - Tokens desbloqueados no Moonbeam
- `TokensMinted` - Tokens criados no Astar

### Logs do Oracle:

```
🔒 Tokens bloqueados detectados:
   Usuário: 0x742d35cc...
   Quantidade: 100.0 tokens
   Destino: shibuya
   Endereço Destino: 0x123...
   
🪙 Executando mint no Astar...
   ✅ Mint executado com sucesso! Gas usado: 125000
```

## ⚙️ Configurações Avançadas

### Limites de Transferência:
```solidity
// Adicione no contrato bridge:
uint256 public constant MIN_TRANSFER = 1 ether;
uint256 public constant MAX_TRANSFER = 1000000 ether;
```

### Taxa de Bridge:
```solidity
// Taxa de 0.1% para transferências
uint256 public constant FEE_RATE = 10; // 0.1%
```

### Multisig para Operações:
```solidity
// Require múltiplas assinaturas para operações críticas
mapping(bytes32 => uint256) public confirmations;
uint256 public constant REQUIRED_CONFIRMATIONS = 2;
```

## 🔄 Fluxo Completo de Transferência

1. **Usuário inicia transferência** → Chama `lockTokens()` no Moonbeam
2. **Oracle detecta evento** → Monitora `TokensLocked`
3. **Oracle aguarda confirmações** → 3 blocos por padrão
4. **Oracle executa mint** → Chama `mintTokens()` no Astar
5. **Usuário recebe tokens** → Tokens aparecem no Astar

## 🚨 Tratamento de Erros

### Cenários Comuns:

- **Transação já processada**: Oracle ignora duplicatas
- **Falha na rede**: Oracle tenta novamente
- **Saldo insuficiente**: Transação reverte com erro claro
- **Endereço inválido**: Validação before execution

## 📈 Próximos Passos

### Melhorias Sugeridas:

1. **Interface Web** - Frontend para facilitar transferências
2. **API REST** - Endpoints para consultar status  
3. **Dashboard** - Monitoramento em tempo real
4. **Suporte Multisig** - Maior segurança operacional
5. **Taxas Dinâmicas** - Baseadas na demanda da rede

### Integrações Possíveis:

- **Chainlink Oracles** - Para dados de preço
- **The Graph** - Para indexação de eventos
- **IPFS** - Para armazenar metadados
- **Discord/Telegram Bots** - Para notificações

---

## 🎯 Resumo

Este sistema de interoperabilidade permite que usuários movam tokens livremente entre Moonbeam e Astar usando uma arquitetura segura de **lock/unlock** e **burn/mint**. O oracle automatiza todo o processo, garantindo que as transferências sejam executadas de forma confiável e transparente.

**Tempo estimado de transferência**: 30-60 segundos  
**Custo estimado**: ~$0.01-0.05 USD em gas fees  
**Disponibilidade**: 24/7 com o oracle rodando 