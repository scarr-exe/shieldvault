// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IConfidentialTokenWrappersRegistry } from "../interfaces/IConfidentialTokenWrappersRegistry.sol";

/// @notice Mock ERC-20 for local testing
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

/// @notice Mock Registry for local testing
/// @dev Simulates the Zama Wrappers Registry without FHE dependencies
contract MockRegistry {
    struct Pair {
        address confidentialToken;
        bool isValid;
    }

    mapping(address => Pair) private _pairs;
    mapping(address => address) private _wrapperToToken;
    IConfidentialTokenWrappersRegistry.TokenWrapperPair[] private _allPairs;

    function register(address token, address wrapper) external {
        _pairs[token] = Pair({ confidentialToken: wrapper, isValid: true });
        _wrapperToToken[wrapper] = token;
        _allPairs.push(
            IConfidentialTokenWrappersRegistry.TokenWrapperPair({
                tokenAddress: token,
                confidentialTokenAddress: wrapper,
                isValid: true
            })
        );
    }

    function setValid(address token, bool valid) external {
        _pairs[token].isValid = valid;
    }

    function getConfidentialTokenAddress(address token)
        external
        view
        returns (bool isValid, address confidentialToken)
    {
        Pair memory p = _pairs[token];
        return (p.isValid, p.confidentialToken);
    }

    function getTokenAddress(address wrapper)
        external
        view
        returns (bool isValid, address token)
    {
        address t = _wrapperToToken[wrapper];
        if (t == address(0)) return (false, address(0));
        return (_pairs[t].isValid, t);
    }

    function isConfidentialTokenValid(address wrapper) external view returns (bool) {
        address t = _wrapperToToken[wrapper];
        if (t == address(0)) return false;
        return _pairs[t].isValid;
    }

    function getTokenConfidentialTokenPairs()
        external
        view
        returns (IConfidentialTokenWrappersRegistry.TokenWrapperPair[] memory)
    {
        return _allPairs;
    }

    function getTokenConfidentialTokenPairsLength() external view returns (uint256) {
        return _allPairs.length;
    }

    function getTokenConfidentialTokenPair(uint256 index)
        external
        view
        returns (IConfidentialTokenWrappersRegistry.TokenWrapperPair memory)
    {
        return _allPairs[index];
    }

    function getTokenConfidentialTokenPairsSlice(uint256 from, uint256 to)
        external
        view
        returns (IConfidentialTokenWrappersRegistry.TokenWrapperPair[] memory)
    {
        IConfidentialTokenWrappersRegistry.TokenWrapperPair[] memory result =
            new IConfidentialTokenWrappersRegistry.TokenWrapperPair[](to - from);
        for (uint256 i = from; i < to; i++) {
            result[i - from] = _allPairs[i];
        }
        return result;
    }

    function getTokenIndex(address token) external view returns (uint256) {
        for (uint256 i = 0; i < _allPairs.length; i++) {
            if (_allPairs[i].tokenAddress == token) return i;
        }
        revert IConfidentialTokenWrappersRegistry.TokenNotRegistered(token);
    }
}
