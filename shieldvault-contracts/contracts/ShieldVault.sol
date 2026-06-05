// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IConfidentialTokenWrappersRegistry } from "./interfaces/IConfidentialTokenWrappersRegistry.sol";
import { IERC7984ConfidentialToken } from "./interfaces/IERC7984ConfidentialToken.sol";

/// @title ShieldVault
/// @notice Confidential DAO Treasury Manager — wrap, hold, and pay contributors
///         without exposing fund allocations or salaries on-chain.
/// @dev Wraps are validated against the official Zama Wrappers Registry on every call.
///      Revoked wrappers are always rejected. Payment amounts are never revealed on-chain.
contract ShieldVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice The official Zama Confidential Token Wrappers Registry
    IConfidentialTokenWrappersRegistry public immutable registry;

    /// @notice The admin of this vault (typically the DAO multisig)
    address public admin;

    /// @notice Pending admin for 2-step ownership transfer
    address public pendingAdmin;

    /// @notice Contributor registry — wallet => label
    mapping(address => string) public contributorLabel;

    /// @notice Whether an address is a registered contributor
    mapping(address => bool) public isContributor;

    /// @notice Ordered list of all contributor addresses
    address[] private _contributorList;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when ERC-20 tokens are deposited into the vault
    event Deposited(address indexed token, address indexed from, uint256 amount);

    /// @notice Emitted when ERC-20 tokens are withdrawn from the vault
    event Withdrawn(address indexed token, address indexed to, uint256 amount);

    /// @notice Emitted when tokens are wrapped via the registry
    /// @dev Amount is NOT included — this is intentional
    event TokenWrapped(address indexed erc20Token, address indexed wrapper, address indexed recipient);

    /// @notice Emitted when confidential tokens are unwrapped
    /// @dev Amount is NOT included — this is intentional
    event TokenUnwrapped(address indexed wrapper, address indexed erc20Token);

    /// @notice Emitted when a contributor is paid
    /// @dev Amount is NOT emitted — this is the core privacy guarantee
    event ContributorPaid(
        address indexed from,
        address indexed to,
        address indexed confidentialToken
    );

    /// @notice Emitted when a contributor is added
    event ContributorAdded(address indexed contributor, string label);

    /// @notice Emitted when a contributor is removed
    event ContributorRemoved(address indexed contributor);

    /// @notice Emitted when contributor label is updated
    event ContributorLabelUpdated(address indexed contributor, string newLabel);

    /// @notice Emitted when admin transfer is initiated
    event AdminTransferInitiated(address indexed currentAdmin, address indexed pendingAdmin);

    /// @notice Emitted when admin transfer is completed
    event AdminTransferCompleted(address indexed oldAdmin, address indexed newAdmin);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotAdmin();
    error NotPendingAdmin();
    error ZeroAddress();
    error InvalidAmount();
    error NotAContributor(address account);
    error AlreadyAContributor(address account);
    error WrapperRevokedOrNotRegistered(address erc20Token);
    error RegistryValidationFailed(address erc20Token, address wrapper);
    error InsufficientBalance(address token, uint256 requested, uint256 available);
    error TransferFailed();

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param _registry Address of the official Zama Wrappers Registry
    /// @param _admin Initial admin (typically the deployer or DAO multisig)
    constructor(address _registry, address _admin) {
        if (_registry == address(0)) revert ZeroAddress();
        if (_admin == address(0)) revert ZeroAddress();

        registry = IConfidentialTokenWrappersRegistry(_registry);
        admin = _admin;
    }

    // -------------------------------------------------------------------------
    // Treasury: Deposit & Withdraw ERC-20
    // -------------------------------------------------------------------------

    /// @notice Deposit ERC-20 tokens into the vault
    /// @param token ERC-20 token address
    /// @param amount Amount to deposit
    function deposit(address token, uint256 amount) external nonReentrant {
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(token, msg.sender, amount);
    }

    /// @notice Withdraw ERC-20 tokens from the vault (admin only)
    /// @param token ERC-20 token address
    /// @param to Recipient address
    /// @param amount Amount to withdraw
    function withdraw(address token, address to, uint256 amount) external onlyAdmin nonReentrant {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();

        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance(token, amount, balance);

        IERC20(token).safeTransfer(to, amount);
        emit Withdrawn(token, to, amount);
    }

    // -------------------------------------------------------------------------
    // Wrap: ERC-20 → Confidential Token
    // -------------------------------------------------------------------------

    /// @notice Wrap vault-held ERC-20 tokens into their confidential equivalent
    /// @dev Validates the wrapper against the Zama Registry before proceeding.
    ///      Reverts if the wrapper is revoked or not registered.
    /// @param erc20Token The ERC-20 token to wrap
    /// @param amount Amount of ERC-20 tokens to wrap
    /// @param recipient Who receives the confidential tokens (usually address(this))
    function wrapToken(
        address erc20Token,
        uint256 amount,
        address recipient
    ) external onlyAdmin nonReentrant {
        if (erc20Token == address(0) || recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();

        // --- Registry validation (core of ShieldVault's registry integration) ---
        (bool isValid, address wrapper) = registry.getConfidentialTokenAddress(erc20Token);

        if (!isValid || wrapper == address(0)) {
            revert WrapperRevokedOrNotRegistered(erc20Token);
        }

        // Double-check validity directly on the wrapper address
        if (!registry.isConfidentialTokenValid(wrapper)) {
            revert WrapperRevokedOrNotRegistered(erc20Token);
        }

        // Verify the wrapper's underlying token matches what we're wrapping
        (bool wrapperValid, address underlyingToken) = registry.getTokenAddress(wrapper);
        if (!wrapperValid || underlyingToken != erc20Token) {
            revert RegistryValidationFailed(erc20Token, wrapper);
        }
        // -------------------------------------------------------------------------

        uint256 balance = IERC20(erc20Token).balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance(erc20Token, amount, balance);

        // Approve the wrapper contract to pull the ERC-20
        IERC20(erc20Token).approve(wrapper, amount);

        // Wrap — confidential tokens are sent to `recipient`
        IERC7984ConfidentialToken(wrapper).wrap(recipient, amount);

        emit TokenWrapped(erc20Token, wrapper, recipient);
    }

    // -------------------------------------------------------------------------
    // Unwrap: Confidential Token → ERC-20
    // -------------------------------------------------------------------------

    /// @notice Initiate unwrapping of confidential tokens back to ERC-20
    /// @dev The encrypted amount must be prepared client-side using the Zama SDK.
    ///      Validates the wrapper against the registry before proceeding.
    /// @param confidentialToken The ERC-7984 wrapper address to unwrap from
    /// @param encryptedAmount Encrypted amount handle (from Zama SDK)
    /// @param inputProof ZK proof for the encrypted amount
    function unwrapToken(
        address confidentialToken,
        bytes32 encryptedAmount,
        bytes calldata inputProof
    ) external onlyAdmin nonReentrant {
        if (confidentialToken == address(0)) revert ZeroAddress();

        // Validate wrapper is still valid in the registry
        if (!registry.isConfidentialTokenValid(confidentialToken)) {
            revert WrapperRevokedOrNotRegistered(confidentialToken);
        }

        IERC7984ConfidentialToken(confidentialToken).unwrap(encryptedAmount, inputProof);

        // Get the underlying ERC-20 for the event
        (, address underlyingToken) = registry.getTokenAddress(confidentialToken);
        emit TokenUnwrapped(confidentialToken, underlyingToken);
    }

    // -------------------------------------------------------------------------
    // Pay Contributors
    // -------------------------------------------------------------------------

    /// @notice Send an encrypted payment to a contributor
    /// @dev The amount is encrypted client-side — it is NEVER visible on-chain.
    ///      Only registered contributors can receive payments.
    ///      The wrapper is validated against the Zama Registry before sending.
    /// @param contributor Recipient contributor address
    /// @param confidentialToken ERC-7984 wrapper to pay with
    /// @param encryptedAmount Encrypted amount handle (from Zama SDK)
    /// @param inputProof ZK proof for the encrypted amount
    function payContributor(
        address contributor,
        address confidentialToken,
        bytes32 encryptedAmount,
        bytes calldata inputProof
    ) external onlyAdmin nonReentrant {
        if (contributor == address(0) || confidentialToken == address(0)) revert ZeroAddress();

        // Must be a registered contributor
        if (!isContributor[contributor]) revert NotAContributor(contributor);

        // Validate wrapper is still valid in the registry
        if (!registry.isConfidentialTokenValid(confidentialToken)) {
            revert WrapperRevokedOrNotRegistered(confidentialToken);
        }

        // Transfer — amount is encrypted, never revealed
        IERC7984ConfidentialToken(confidentialToken).confidentialTransfer(
            contributor,
            encryptedAmount,
            inputProof
        );

        // Event intentionally omits amount
        emit ContributorPaid(address(this), contributor, confidentialToken);
    }

    // -------------------------------------------------------------------------
    // Contributor Management
    // -------------------------------------------------------------------------

    /// @notice Add a contributor to the vault
    /// @param contributor Wallet address of the contributor
    /// @param label Human-readable label (name or role)
    function addContributor(address contributor, string calldata label) external onlyAdmin {
        if (contributor == address(0)) revert ZeroAddress();
        if (isContributor[contributor]) revert AlreadyAContributor(contributor);

        isContributor[contributor] = true;
        contributorLabel[contributor] = label;
        _contributorList.push(contributor);

        emit ContributorAdded(contributor, label);
    }

    /// @notice Remove a contributor from the vault
    /// @param contributor Address to remove
    function removeContributor(address contributor) external onlyAdmin {
        if (!isContributor[contributor]) revert NotAContributor(contributor);

        isContributor[contributor] = false;
        delete contributorLabel[contributor];

        // Remove from ordered list
        uint256 len = _contributorList.length;
        for (uint256 i = 0; i < len; i++) {
            if (_contributorList[i] == contributor) {
                _contributorList[i] = _contributorList[len - 1];
                _contributorList.pop();
                break;
            }
        }

        emit ContributorRemoved(contributor);
    }

    /// @notice Update the label of an existing contributor
    function updateContributorLabel(address contributor, string calldata newLabel) external onlyAdmin {
        if (!isContributor[contributor]) revert NotAContributor(contributor);
        contributorLabel[contributor] = newLabel;
        emit ContributorLabelUpdated(contributor, newLabel);
    }

    /// @notice Returns the full list of contributor addresses
    function getContributors() external view returns (address[] memory) {
        return _contributorList;
    }

    /// @notice Returns contributor count
    function contributorCount() external view returns (uint256) {
        return _contributorList.length;
    }

    // -------------------------------------------------------------------------
    // Registry Queries (read-only helpers for the frontend)
    // -------------------------------------------------------------------------

    /// @notice Validates a token against the registry and returns wrapper info
    /// @param erc20Token The ERC-20 token address to check
    /// @return isValid Whether the wrapper is valid and usable
    /// @return wrapper The ERC-7984 wrapper address (0x0 if not registered)
    function getRegistryInfo(address erc20Token)
        external
        view
        returns (bool isValid, address wrapper)
    {
        return registry.getConfidentialTokenAddress(erc20Token);
    }

    /// @notice Returns all registered (token, wrapper) pairs from the registry
    function getAllRegistryPairs()
        external
        view
        returns (IConfidentialTokenWrappersRegistry.TokenWrapperPair[] memory)
    {
        return registry.getTokenConfidentialTokenPairs();
    }

    /// @notice Returns vault's ERC-20 balance of a given token
    function publicBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // -------------------------------------------------------------------------
    // Admin Transfer (2-step)
    // -------------------------------------------------------------------------

    /// @notice Step 1: Initiate transfer to a new admin
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        pendingAdmin = newAdmin;
        emit AdminTransferInitiated(admin, newAdmin);
    }

    /// @notice Step 2: New admin accepts the transfer
    function acceptAdmin() external {
        if (msg.sender != pendingAdmin) revert NotPendingAdmin();
        address oldAdmin = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit AdminTransferCompleted(oldAdmin, admin);
    }
}
