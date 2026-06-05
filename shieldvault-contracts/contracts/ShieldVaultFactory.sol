// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ShieldVault } from "./ShieldVault.sol";
import { IConfidentialTokenWrappersRegistry } from "./interfaces/IConfidentialTokenWrappersRegistry.sol";

/// @title ShieldVaultFactory
/// @notice Deploys individual ShieldVault instances for DAOs and tracks them on-chain
/// @dev Each DAO gets its own isolated vault. The factory never holds funds.
contract ShieldVaultFactory {

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice The official Zama Wrappers Registry — shared across all deployed vaults
    address public immutable registry;

    /// @notice Factory owner (can update registry or pause in future versions)
    address public owner;

    /// @notice All deployed vault addresses
    address[] private _allVaults;

    /// @notice Vaults deployed by a specific admin address
    mapping(address => address[]) private _vaultsByAdmin;

    /// @notice Whether an address is a ShieldVault deployed by this factory
    mapping(address => bool) public isShieldVault;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event VaultDeployed(
        address indexed vault,
        address indexed admin,
        uint256 vaultIndex
    );

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error ZeroAddress();
    error NotOwner();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param _registry Official Zama Wrappers Registry address
    constructor(address _registry) {
        if (_registry == address(0)) revert ZeroAddress();
        registry = _registry;
        owner = msg.sender;
    }

    // -------------------------------------------------------------------------
    // Deploy
    // -------------------------------------------------------------------------

    /// @notice Deploy a new ShieldVault for a DAO
    /// @param admin The admin address for the new vault (typically a DAO multisig)
    /// @return vault The address of the newly deployed ShieldVault
    function deployVault(address admin) external returns (address vault) {
        if (admin == address(0)) revert ZeroAddress();

        ShieldVault newVault = new ShieldVault(registry, admin);
        vault = address(newVault);

        _allVaults.push(vault);
        _vaultsByAdmin[admin].push(vault);
        isShieldVault[vault] = true;

        emit VaultDeployed(vault, admin, _allVaults.length - 1);
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    /// @notice Returns all vaults deployed by this factory
    function getAllVaults() external view returns (address[] memory) {
        return _allVaults;
    }

    /// @notice Returns total number of deployed vaults
    function totalVaults() external view returns (uint256) {
        return _allVaults.length;
    }

    /// @notice Returns vaults where a specific address is admin
    function getVaultsByAdmin(address admin) external view returns (address[] memory) {
        return _vaultsByAdmin[admin];
    }

    /// @notice Returns a vault address by index
    function getVaultAt(uint256 index) external view returns (address) {
        return _allVaults[index];
    }
}
