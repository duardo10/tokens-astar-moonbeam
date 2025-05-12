require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.28",
  networks: {
    shibuya: {
      url: "https://evm.shibuya.astar.network",
      chainId: 81,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};