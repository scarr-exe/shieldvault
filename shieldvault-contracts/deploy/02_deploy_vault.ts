import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

/// @dev Deploys a ShieldVault via the factory for the deployer's address.
///      In production, the admin should be your DAO multisig, not the deployer EOA.
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  // The admin of the first vault — override with your DAO multisig address
  const vaultAdmin = process.env.VAULT_ADMIN_ADDRESS || deployer;

  log(`\nDeploying initial ShieldVault via factory...`);
  log(`Vault admin: ${vaultAdmin}`);

  const factoryDeployment = await get("ShieldVaultFactory");
  const factory = await ethers.getContractAt(
    "ShieldVaultFactory",
    factoryDeployment.address
  );

  const tx = await factory.deployVault(vaultAdmin);
  const receipt = await tx.wait();

  // Parse the VaultDeployed event to get the vault address
  const event = receipt?.logs
    .map((log: any) => {
      try {
        return factory.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e: any) => e?.name === "VaultDeployed");

  const vaultAddress = event?.args?.vault;

  log(`\nShieldVault deployed at: ${vaultAddress}`);
  log(`Admin: ${vaultAdmin}`);
  log(`Factory: ${factoryDeployment.address}`);
  log(`Network: ${network.name}`);

  // Save vault address for frontend config
  log("\n--- Copy this into your frontend .env ---");
  log(`VITE_FACTORY_ADDRESS=${factoryDeployment.address}`);
  log(`VITE_VAULT_ADDRESS=${vaultAddress}`);
  log(`VITE_NETWORK=sepolia`);
};

func.tags = ["ShieldVault"];
func.dependencies = ["ShieldVaultFactory"];
export default func;
