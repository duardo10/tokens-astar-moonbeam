/*
const { ethers } = require("hardhat");

async function main() {
  const MyToken = await ethers.getContractFactory("MyToken");
  const token = await MyToken.deploy();
  await token.waitForDeployment();
  console.log(`Contrato implantado em: ${token.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
*/

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function deployToken() {
  const MyToken = await ethers.getContractFactory("MyToken");

  console.time("⏱️ Tempo de deploy");
  const inicio = Date.now();

  const token = await MyToken.deploy();
  await token.waitForDeployment();

  const fim = Date.now();
  console.timeEnd("⏱️ Tempo de deploy");

  const deployTx = token.deploymentTransaction();
  const receipt = await deployTx.wait();

  const tempo = ((fim - inicio) / 1000).toFixed(3);
  const gasUsed = receipt.gasUsed.toString();
  const endereco = token.target;
  const txHash = receipt.hash;
  const dataHora = new Date().toISOString();

  // Caminho do arquivo
  const filePath = path.join(__dirname, "deploy-log.csv");

  // Se o arquivo não existe, adiciona o cabeçalho
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "DataHora,TempoSegundos,GasUsado,EnderecoContrato,HashTransacao\n", "utf8");
  }

  // Adiciona linha ao CSV
  const linha = `${dataHora},${tempo},${gasUsed},${endereco},${txHash}\n`;
  fs.appendFileSync(filePath, linha, "utf8");

  // Exibe no terminal
  console.log(`Contrato implantado em: ${endereco}`);
  console.log(`Gas utilizado: ${gasUsed}`);
  console.log(`Hash da transação: ${txHash}`);
  console.log(`Log salvo em: deploy-log.csv`);

  return endereco;
}

async function deployContract() {
  try {
    return await deployToken();
  } catch (error) {
    console.error("Erro no deploy:", error.message);
    throw error;
  }
}

async function main() {
  console.log("Iniciando deploy...");
  await deployContract();
  
  // Aguarda 1 minuto antes do próximo deploy
  setTimeout(main, intervalo);
  console.log(`Aguardando ${intervalo / 60000} minutos para o próximo deploy...\n`);
}

// Defina o intervalo de 10 minutos (600000 ms)
//const intervaloDeDeploy = 600000; // 10 minutos em milissegundos
// Defina o intervalo de 1 minuto (60000 ms)
const intervaloDeDeploy = 60000; // 1 minuto em milissegundos

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

