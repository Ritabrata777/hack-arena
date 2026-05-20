const hre = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("Deploying Fundraiser contract...");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Existing MediChain address from .env.local
    const mediChainAddress = "0x19c8AE9c376ad50f6b683434Cc3457dcb5f91D72";
    console.log("Linking to MediChain at:", mediChainAddress);

    const Fundraiser = await hre.ethers.getContractFactory("Fundraiser");
    // Constructor args: initialOwner (deployer), mediChainAddress
    const fundraiser = await Fundraiser.deploy(deployer.address, mediChainAddress);

    await fundraiser.waitForDeployment();

    const address = await fundraiser.getAddress();
    console.log("Fundraiser deployed to:", address);

    fs.writeFileSync("fundraiser_address.txt", address);
    console.log("Address saved to fundraiser_address.txt");

    console.log("\nAction Required:");
    console.log(`Update NEXT_PUBLIC_FUNDRAISER_CONTRACT_ADDRESS in .env.local to: ${address}`);
    console.log(`Verify with: npx hardhat verify --network polygonAmoy ${address} ${deployer.address} ${mediChainAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
