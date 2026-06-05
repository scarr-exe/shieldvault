import { expect } from "chai";
import { ethers } from "hardhat";
import { ShieldVault, ShieldVaultFactory } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/// @notice These tests use a mock registry and mock ERC-20/ERC-7984 contracts.
/// For real FHE behaviour, run against Sepolia with `--network sepolia`.

describe("ShieldVault", function () {
  let factory: ShieldVaultFactory;
  let vault: ShieldVault;
  let admin: SignerWithAddress;
  let contributor1: SignerWithAddress;
  let contributor2: SignerWithAddress;
  let stranger: SignerWithAddress;
  let mockRegistry: any;
  let mockERC20: any;

  // Deploy mock contracts before each test
  beforeEach(async function () {
    [admin, contributor1, contributor2, stranger] = await ethers.getSigners();

    // Deploy mock registry
    const MockRegistry = await ethers.getContractFactory("MockRegistry");
    mockRegistry = await MockRegistry.deploy();

    // Deploy mock ERC-20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("USD Coin", "USDC");

    // Deploy factory with mock registry
    const Factory = await ethers.getContractFactory("ShieldVaultFactory");
    factory = await Factory.deploy(await mockRegistry.getAddress());

    // Deploy a vault via the factory
    const tx = await factory.deployVault(admin.address);
    const receipt = await tx.wait();

    const event = receipt?.logs
      .map((log: any) => {
        try { return factory.interface.parseLog(log); } catch { return null; }
      })
      .find((e: any) => e?.name === "VaultDeployed");

    vault = await ethers.getContractAt("ShieldVault", event?.args?.vault);
  });

  // -------------------------------------------------------------------------
  // Deployment
  // -------------------------------------------------------------------------

  describe("Deployment", function () {
    it("sets the correct registry address", async function () {
      expect(await vault.registry()).to.equal(await mockRegistry.getAddress());
    });

    it("sets the correct admin", async function () {
      expect(await vault.admin()).to.equal(admin.address);
    });

    it("factory tracks deployed vault", async function () {
      expect(await factory.totalVaults()).to.equal(1);
      expect(await factory.isShieldVault(await vault.getAddress())).to.be.true;
    });

    it("reverts if registry is zero address", async function () {
      const Factory = await ethers.getContractFactory("ShieldVaultFactory");
      await expect(Factory.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        { interface: (await ethers.getContractFactory("ShieldVaultFactory")).interface },
        "ZeroAddress"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Access Control
  // -------------------------------------------------------------------------

  describe("Access Control", function () {
    it("non-admin cannot add contributor", async function () {
      await expect(
        vault.connect(stranger).addContributor(contributor1.address, "Developer")
      ).to.be.revertedWithCustomError(vault, "NotAdmin");
    });

    it("non-admin cannot call withdraw", async function () {
      await expect(
        vault.connect(stranger).withdraw(
          await mockERC20.getAddress(),
          stranger.address,
          100n
        )
      ).to.be.revertedWithCustomError(vault, "NotAdmin");
    });

    it("non-admin cannot wrap tokens", async function () {
      await expect(
        vault.connect(stranger).wrapToken(
          await mockERC20.getAddress(),
          100n,
          admin.address
        )
      ).to.be.revertedWithCustomError(vault, "NotAdmin");
    });
  });

  // -------------------------------------------------------------------------
  // Contributor Management
  // -------------------------------------------------------------------------

  describe("Contributor Management", function () {
    it("admin can add a contributor", async function () {
      await expect(
        vault.connect(admin).addContributor(contributor1.address, "Developer")
      )
        .to.emit(vault, "ContributorAdded")
        .withArgs(contributor1.address, "Developer");

      expect(await vault.isContributor(contributor1.address)).to.be.true;
      expect(await vault.contributorLabel(contributor1.address)).to.equal("Developer");
    });

    it("cannot add same contributor twice", async function () {
      await vault.connect(admin).addContributor(contributor1.address, "Dev");
      await expect(
        vault.connect(admin).addContributor(contributor1.address, "Dev 2")
      ).to.be.revertedWithCustomError(vault, "AlreadyAContributor");
    });

    it("admin can remove a contributor", async function () {
      await vault.connect(admin).addContributor(contributor1.address, "Dev");
      await expect(vault.connect(admin).removeContributor(contributor1.address))
        .to.emit(vault, "ContributorRemoved")
        .withArgs(contributor1.address);

      expect(await vault.isContributor(contributor1.address)).to.be.false;
    });

    it("cannot remove non-contributor", async function () {
      await expect(
        vault.connect(admin).removeContributor(stranger.address)
      ).to.be.revertedWithCustomError(vault, "NotAContributor");
    });

    it("getContributors returns correct list", async function () {
      await vault.connect(admin).addContributor(contributor1.address, "Dev");
      await vault.connect(admin).addContributor(contributor2.address, "Design");
      const list = await vault.getContributors();
      expect(list).to.include(contributor1.address);
      expect(list).to.include(contributor2.address);
    });
  });

  // -------------------------------------------------------------------------
  // Deposit & Withdraw
  // -------------------------------------------------------------------------

  describe("Deposit & Withdraw", function () {
    it("anyone can deposit ERC-20 tokens", async function () {
      const amount = ethers.parseUnits("1000", 6);
      await mockERC20.mint(stranger.address, amount);
      await mockERC20.connect(stranger).approve(await vault.getAddress(), amount);

      await expect(vault.connect(stranger).deposit(await mockERC20.getAddress(), amount))
        .to.emit(vault, "Deposited")
        .withArgs(await mockERC20.getAddress(), stranger.address, amount);

      expect(await vault.publicBalance(await mockERC20.getAddress())).to.equal(amount);
    });

    it("admin can withdraw ERC-20 tokens", async function () {
      const amount = ethers.parseUnits("500", 6);
      await mockERC20.mint(await vault.getAddress(), amount);

      await expect(
        vault.connect(admin).withdraw(
          await mockERC20.getAddress(),
          admin.address,
          amount
        )
      ).to.emit(vault, "Withdrawn");
    });

    it("reverts if withdraw amount exceeds balance", async function () {
      await expect(
        vault.connect(admin).withdraw(
          await mockERC20.getAddress(),
          admin.address,
          ethers.parseUnits("9999", 6)
        )
      ).to.be.revertedWithCustomError(vault, "InsufficientBalance");
    });
  });

  // -------------------------------------------------------------------------
  // Registry Integration
  // -------------------------------------------------------------------------

  describe("Registry Integration", function () {
    it("wrapToken reverts if wrapper is revoked in registry", async function () {
      // Set registry to return isValid = false
      await mockRegistry.setValid(await mockERC20.getAddress(), false);

      await expect(
        vault.connect(admin).wrapToken(
          await mockERC20.getAddress(),
          100n,
          await vault.getAddress()
        )
      ).to.be.revertedWithCustomError(vault, "WrapperRevokedOrNotRegistered");
    });

    it("getRegistryInfo returns correct wrapper data", async function () {
      const mockWrapper = contributor1.address; // reuse address as mock wrapper
      await mockRegistry.register(await mockERC20.getAddress(), mockWrapper);

      const [isValid, wrapper] = await vault.getRegistryInfo(await mockERC20.getAddress());
      expect(isValid).to.be.true;
      expect(wrapper).to.equal(mockWrapper);
    });
  });

  // -------------------------------------------------------------------------
  // Admin Transfer
  // -------------------------------------------------------------------------

  describe("Admin Transfer (2-step)", function () {
    it("admin can initiate transfer and new admin accepts", async function () {
      await vault.connect(admin).transferAdmin(contributor1.address);
      expect(await vault.pendingAdmin()).to.equal(contributor1.address);

      await vault.connect(contributor1).acceptAdmin();
      expect(await vault.admin()).to.equal(contributor1.address);
    });

    it("non-pending-admin cannot accept", async function () {
      await vault.connect(admin).transferAdmin(contributor1.address);
      await expect(
        vault.connect(stranger).acceptAdmin()
      ).to.be.revertedWithCustomError(vault, "NotPendingAdmin");
    });
  });
});
