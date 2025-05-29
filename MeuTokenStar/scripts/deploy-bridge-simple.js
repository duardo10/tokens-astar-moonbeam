const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying Bridge no Astar com conta:", deployer.address);

  const tokenAddress = "0xA1fe69910aBd0f78227E672A6b9B27A53B5648cA";
  console.log("📍 Usando token:", tokenAddress);
  
  const Bridge = await ethers.getContractFactory("InteroperabilityBridge");
  
  console.time("⏱️ Tempo de deploy");
  const bridge = await Bridge.deploy(tokenAddress);
  await bridge.waitForDeployment();
  console.timeEnd("⏱️ Tempo de deploy");
  
  console.log("✅ Bridge deployada em:", bridge.target);
  console.log("🪙 Token address:", tokenAddress);
  console.log("👤 Owner:", deployer.address);
  
  console.log("\n📋 INFORMAÇÕES IMPORTANTES:");
  console.log(`ASTAR_BRIDGE_ADDRESS=${bridge.target}`);
  console.log(`ASTAR_TOKEN_ADDRESS=${tokenAddress}`);
  
  console.log("\n💡 Para depositar tokens manualmente (opcional):");
  console.log("   1. Acesse o token no block explorer");
  console.log("   2. Aprove o bridge para gastar tokens");
  console.log("   3. Chame depositTokens() no bridge");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 