const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying Bridge no Astar com conta:", deployer.address);

  // Você precisa pegar o endereço de um dos seus tokens já deployados
  // Veja no deploy-log.csv o último endereço deployado
  const tokenAddress = "0xA1fe69910aBd0f78227E672A6b9B27A53B5648cA"; // ⚠️ ALTERE ESTE ENDEREÇO
  
  console.log("📍 Usando token:", tokenAddress);
  
  const Bridge = await ethers.getContractFactory("InteroperabilityBridge");
  
  console.time("⏱️ Tempo de deploy");
  const bridge = await Bridge.deploy(tokenAddress);
  await bridge.waitForDeployment();
  console.timeEnd("⏱️ Tempo de deploy");
  
  console.log("✅ Bridge deployada em:", bridge.target);
  console.log("🪙 Token address:", tokenAddress);
  console.log("👤 Owner:", deployer.address);
  
  // Deposita alguns tokens no contrato para permitir mints
  console.log("\n💰 Depositando tokens no contrato bridge...");
  const token = await ethers.getContractAt("MyToken", tokenAddress);
  
  // Aprova o bridge para gastar tokens
  const depositAmount = ethers.parseEther("100000"); // 100k tokens
  await token.approve(bridge.target, depositAmount);
  await bridge.depositTokens(depositAmount);
  
  console.log(`✅ Depositados ${ethers.formatEther(depositAmount)} tokens no bridge`);
  
  // Salva info importante
  console.log("\n📋 SALVE ESTAS INFORMAÇÕES:");
  console.log(`ASTAR_BRIDGE_ADDRESS=${bridge.target}`);
  console.log(`ASTAR_TOKEN_ADDRESS=${tokenAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 