// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title IERC7984ConfidentialToken
/// @notice Minimal interface for interacting with Zama ERC-7984 confidential token wrappers
/// @dev Amounts are encrypted using TFHE. Raw uint256 amounts are used for wrap/unwrap;
///      encrypted euint64 handles are used for transfers.
interface IERC7984ConfidentialToken {
    /// @notice Wraps ERC-20 tokens into confidential form
    /// @dev Caller must have approved this contract for `amount` of the underlying ERC-20.
    ///      The confidential tokens are minted to `to`.
    /// @param to Recipient of the confidential tokens
    /// @param amount Amount of ERC-20 tokens to wrap
    function wrap(address to, uint256 amount) external;

    /// @notice Initiates unwrapping of confidential tokens back to ERC-20
    /// @dev Amount is encrypted. Two-step process: request then claim.
    ///      The encrypted amount handle must be allowed to this contract via TFHE ACL.
    /// @param encryptedAmount Encrypted amount handle (euint64 as bytes32)
    /// @param inputProof Zero-knowledge proof for the encrypted amount
    function unwrap(bytes32 encryptedAmount, bytes calldata inputProof) external;

    /// @notice Transfers confidential tokens to another address
    /// @dev Amount stays encrypted on-chain. On-chain observers see the transfer
    ///      but never the value.
    /// @param to Recipient address
    /// @param encryptedAmount Encrypted amount handle
    /// @param inputProof ZK proof for the amount
    function confidentialTransfer(
        address to,
        bytes32 encryptedAmount,
        bytes calldata inputProof
    ) external;

    /// @notice Returns the encrypted balance of an account
    /// @dev Only the ACL-allowed addresses can decrypt the returned handle
    /// @param account The address to query
    /// @return Encrypted balance handle (euint64)
    function balanceOf(address account) external view returns (bytes32);

    /// @notice Returns the address of the underlying ERC-20 token
    function underlying() external view returns (address);

    /// @notice ERC-165 support check
    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    // ERC-7984 interface ID
    // bytes4(keccak256("IERC7984")) = 0x4958f2a4
}
