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

async function main() {
  const MyToken = await ethers.getContractFactory("MyToken");

  console.time("⏱️ Tempo de deploy"); // Inicia contagem de tempo

  const token = await MyToken.deploy();
  await token.waitForDeployment();

  console.timeEnd("⏱️ Tempo de deploy"); // Finaliza contagem de tempo

  const deployTx = token.deploymentTransaction(); // Pega transação de deploy
  const receipt = await deployTx.wait(); // Espera confirmação e pega o receipt

  console.log(`✅ Contrato implantado em: ${token.target}`);
  console.log(`⛽ Gas utilizado: ${receipt.gasUsed.toString()}`);
  console.log(`🔗 Hash da transação: ${receipt.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
