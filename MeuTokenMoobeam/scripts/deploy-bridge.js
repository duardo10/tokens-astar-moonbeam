const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Bridge no Moonbeam com conta:", deployer.address);

  // Você precisa pegar o endereço de um dos seus tokens já deployados
  // Veja no deploy-log.csv o último endereço deployado
  const tokenAddress = "0x66f77aEaAa01f4AB4B34fA229D550Bf7E10Dd2A5"; // ⚠️ ALTERE ESTE ENDEREÇO
  
  console.log("Usando token:", tokenAddress);
  
  console.log("Deploying InteroperabilityBridge...");
  
  const Bridge = await ethers.getContractFactory("InteroperabilityBridge");
  
  console.time("⏱️ Tempo de deploy");
  const bridge = await Bridge.deploy(tokenAddress);
  await bridge.waitForDeployment();
  console.timeEnd("⏱️ Tempo de deploy");
  
  console.log("Bridge deployada em:", bridge.target);
  console.log("Token address:", tokenAddress);
  console.log("👤 Owner:", deployer.address);
  
  // Salva info importante
  console.log("\n📋 SALVE ESTAS INFORMAÇÕES:");
  console.log(`MOONBEAM_BRIDGE_ADDRESS=${bridge.target}`);
  console.log(`MOONBEAM_TOKEN_ADDRESS=${tokenAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 