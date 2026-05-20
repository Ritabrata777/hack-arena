const hre = require("hardhat");

async function main() {
  console.log("Deploying MediChain contract...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const MediChain = await hre.ethers.getContractFactory("MediChain");
  const mediChain = await MediChain.deploy(deployer.address);

  await mediChain.waitForDeployment();

  const address = await mediChain.getAddress();
  console.log("MediChain deployed to:", address);

  console.log("\nNext Steps:");
  console.log(`1. Update NEXT_PUBLIC_MEDI_CHAIN_CONTRACT_ADDRESS in .env to: ${address}`);
  console.log(`2. Verify contract: npx hardhat verify --network polygonAmoy ${address} ${deployer.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
