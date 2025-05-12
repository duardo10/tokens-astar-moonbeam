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
