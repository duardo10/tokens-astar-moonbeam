/*
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);

  const MeuToken = await ethers.getContractFactory("MeuToken");
  const initialSupply = ethers.parseUnits("1000000", 18); // 1 milhão de tokens com 18 casas decimais
  const token = await MeuToken.deploy(initialSupply);

  console.log("Token deployed at:", token.target); // target = endereço do contrato no ethers v6
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
*/
/*
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);

  const MeuToken = await ethers.getContractFactory("MeuToken");
  const initialSupply = ethers.parseUnits("1000000", 18);

  console.time("Deploy Time"); // 🕒 início da medição de tempo
  const token = await MeuToken.deploy(initialSupply);
  await token.waitForDeployment(); // necessário no ethers v6
  console.timeEnd("Deploy Time"); // 🕒 fim da medição de tempo

  const deployTx = token.deploymentTransaction(); // obtem transação de deploy
  const receipt = await deployTx.wait(); // aguarda e pega o receipt

  console.log("Token deployed at:", token.target);
  console.log("Gas used:", receipt.gasUsed.toString()); // ⛽ gás consumido
  console.log("Transaction hash:", receipt.hash);
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
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);

  const MeuToken = await ethers.getContractFactory("MeuToken");
  const initialSupply = ethers.parseUnits("1000000", 18);

  const inicio = Date.now(); // marca o início do tempo
  console.time("Deploy Time"); // 🕒 início da medição de tempo
  const token = await MeuToken.deploy(initialSupply);
  await token.waitForDeployment(); // necessário no ethers v6
  console.timeEnd("Deploy Time"); // 🕒 fim da medição de tempo
  const fim = Date.now(); // marca o fim do tempo

  const deployTx = token.deploymentTransaction(); // obtem transação de deploy
  const receipt = await deployTx.wait(); // aguarda e pega o receipt

  const tempo = ((fim -inicio)/ 1000).toFixed(3);


  const gasUsed = receipt.gasUsed.toString();
  const endereco = token.target;
  const txHash = receipt.hash;
  const dataHora = new Date().toISOString();

  // Caminho do arquivo CSV
  const filePath = path.join(__dirname, "deploy-log.csv");

  // Se o arquivo não existe, adiciona o cabeçalho
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "DataHora,TempoSegundos,GasUsado,EnderecoContrato,HashTransacao\n", "utf8");
  }

  // Adiciona linha ao CSV
  const linha = `${dataHora},${tempo},${gasUsed},${endereco},${txHash}\n`;
  fs.appendFileSync(filePath, linha, "utf8");

  // Exibe no terminal
  console.log("Token deployed at:", endereco);
  console.log("Gas used:", gasUsed); // ⛽ gás consumido
  console.log("Transaction hash:", txHash);
  console.log(`📁 Log salvo em: deploy-log.csv`);
}

async function loopDeploy(intervalo) {
  while (true) {
    console.log("🚀 Iniciando deploy...");
    await deployToken();
    console.log(`🔄 Aguardando ${intervalo / 60000} minutos para o próximo deploy...\n`);

    // Aguarda o intervalo (10 minutos = 600000 milissegundos)
    await new Promise(resolve => setTimeout(resolve, intervalo));
  }
}

// Defina o intervalo de 10 minutos (600000 ms)
//const intervaloDeDeploy = 600000; // 10 minutos em milissegundos
// Defina o intervalo de 1 minuto (60000 ms)
const intervaloDeDeploy = 60000; // 1 minuto em milissegundos


loopDeploy(intervaloDeDeploy).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

