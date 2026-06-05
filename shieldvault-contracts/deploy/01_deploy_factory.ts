import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

// -------------------------------------------------------------------------
// IMPORTANT: Fill in the Sepolia Registry address before deploying.
// Find it at: https://docs.zama.org/protocol/protocol-apps/addresses.md
// Mainnet address for reference: 0xeb5015fF021DB115aCe010f23F55C2591059bBA0
// -------------------------------------------------------------------------
const REGISTRY_ADDRESSES: Record<string, string> = {
  sepolia: process.env.REGISTRY_ADDRESS_SEPOLIA || "FILL_ME_IN",
  mainnet: "0xeb5015fF021DB115aCe010f23F55C2591059bBA0",
  hardhat: process.env.REGISTRY_ADDRESS_LOCAL || "FILL_ME_IN",
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const registryAddress = REGISTRY_ADDRESSES[network.name];

  if (!registryAddress || registryAddress === "FILL_ME_IN") {
    throw new Error(
      `Registry address not set for network: ${network.name}\n` +
      `Get the address from: https://docs.zama.org/protocol/protocol-apps/addresses.md\n` +
      `Then set REGISTRY_ADDRESS_SEPOLIA in your .env file`
    );
  }

  log(`\nDeploying ShieldVaultFactory on ${network.name}...`);
  log(`Using Zama Registry: ${registryAddress}`);
  log(`Deployer: ${deployer}`);

  const factory = await deploy("ShieldVaultFactory", {
    from: deployer,
    args: [registryAddress],
    log: true,
    waitConfirmations: network.name === "hardhat" ? 1 : 5,
  });

  log(`\nShieldVaultFactory deployed at: ${factory.address}`);
  log(`Registry: ${registryAddress}`);

  // Auto-verify on Sepolia if Etherscan key is set
  if (network.name === "sepolia" && process.env.ETHERSCAN_API_KEY) {
    log("\nVerifying on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: factory.address,
        constructorArguments: [registryAddress],
      });
      log("Verified!");
    } catch (e: any) {
      if (e.message.toLowerCase().includes("already verified")) {
        log("Already verified.");
      } else {
        log(`Verification failed: ${e.message}`);
      }
    }
  }
};

func.tags = ["ShieldVaultFactory"];
export default func;
