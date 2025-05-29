import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox"; // já inclui o suporte ao ethers v6

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    moonbase: {
      url: "https://rpc.api.moonbase.moonbeam.network",
      //accounts: ["f9f3eef39586e9398d4bcebf01001e38d34ee19b32894fc54ee6c2f548ba2bce"]
      accounts:["f9f3eef39586e9398d4bcebf01001e38d34ee19b32894fc54ee6c2f548ba2bce"]
    }
  }
};

export default config;
