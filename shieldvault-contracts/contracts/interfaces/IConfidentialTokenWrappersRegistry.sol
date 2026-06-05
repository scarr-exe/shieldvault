// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IConfidentialTokenWrappersRegistry
/// @notice Interface for the official Zama Confidential Token Wrappers Registry
/// @dev Mainnet: 0xeb5015fF021DB115aCe010f23F55C2591059bBA0
///      Sepolia: see https://docs.zama.org/protocol/protocol-apps/addresses.md
interface IConfidentialTokenWrappersRegistry {
    /// @notice Pair of an ERC-20 token and its ERC-7984 confidential wrapper
    struct TokenWrapperPair {
        address tokenAddress;             // The underlying ERC-20
        address confidentialTokenAddress; // The ERC-7984 confidential wrapper
        bool isValid;                     // false if revoked by the DAO
    }

    // -------------------------------------------------------------------------
    // Read functions
    // -------------------------------------------------------------------------

    /// @notice Returns the confidential wrapper for a given ERC-20 token
    /// @dev Always check isValid before using the returned address.
    ///      A non-zero address may still be revoked.
    /// @param erc20TokenAddress The ERC-20 token address
    /// @return isValid True if the wrapper is valid and usable
    /// @return confidentialToken The address of the ERC-7984 wrapper (0x0 if never registered)
    function getConfidentialTokenAddress(address erc20TokenAddress)
        external
        view
        returns (bool isValid, address confidentialToken);

    /// @notice Returns the underlying ERC-20 for a given confidential wrapper
    /// @param confidentialWrapperAddress The ERC-7984 wrapper address
    /// @return isValid True if the wrapper is valid and usable
    /// @return token The address of the underlying ERC-20 (0x0 if never registered)
    function getTokenAddress(address confidentialWrapperAddress)
        external
        view
        returns (bool isValid, address token);

    /// @notice Returns whether a confidential wrapper is currently valid
    /// @param confidentialWrapperAddress The ERC-7984 wrapper address
    /// @return True if valid, false if revoked
    function isConfidentialTokenValid(address confidentialWrapperAddress)
        external
        view
        returns (bool);

    /// @notice Returns all (token, wrapper) pairs including revoked ones
    function getTokenConfidentialTokenPairs()
        external
        view
        returns (TokenWrapperPair[] memory);

    /// @notice Returns total number of registered pairs
    function getTokenConfidentialTokenPairsLength()
        external
        view
        returns (uint256);

    /// @notice Returns a single pair by index (includes revoked)
    function getTokenConfidentialTokenPair(uint256 index)
        external
        view
        returns (TokenWrapperPair memory);

    /// @notice Returns a slice of pairs [fromIndex, toIndex)
    function getTokenConfidentialTokenPairsSlice(uint256 fromIndex, uint256 toIndex)
        external
        view
        returns (TokenWrapperPair[] memory);

    /// @notice Returns the index of a registered token
    /// @dev Reverts with TokenNotRegistered if the token has never been registered
    function getTokenIndex(address tokenAddress) external view returns (uint256);

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event ConfidentialTokenRegistered(
        address indexed tokenAddress,
        address indexed confidentialTokenAddress
    );

    event ConfidentialTokenRevoked(
        address indexed tokenAddress,
        address indexed confidentialTokenAddress
    );

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error TokenZeroAddress();
    error ConfidentialTokenZeroAddress();
    error TokenAddressIsConfidentialTokenAddress(address tokenAddress);
    error NotERC7984(address confidentialTokenAddress);
    error TokenAlreadyAssociatedWithConfidentialToken(
        address tokenAddress,
        address existingConfidentialTokenAddress
    );
    error ConfidentialTokenAlreadyAssociatedWithToken(
        address confidentialTokenAddress,
        address existingTokenAddress
    );
    error RevokedConfidentialToken(address confidentialTokenAddress);
    error NoTokenAssociatedWithConfidentialToken(address confidentialTokenAddress);
    error TokenNotRegistered(address tokenAddress);
}
