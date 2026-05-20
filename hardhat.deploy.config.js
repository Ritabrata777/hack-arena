require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: '.env.local' });

module.exports = {
    solidity: "0.8.20",
    networks: {
        polygonAmoy: {
            url: process.env.NEXT_PUBLIC_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 80002
        },
    },
    paths: {
        sources: "./src/backend/contracts",
        tests: "./test",
        cache: "./cache_deploy",
        artifacts: "./src/backend/artifacts_deploy"
    },
};
