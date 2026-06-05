# ShieldVault — Contracts

Confidential DAO Treasury Manager built on the official Zama Wrappers Registry.

## Architecture

```
ShieldVaultFactory
└── deploys → ShieldVault (one per DAO)
                ├── reads  → Zama Wrappers Registry (official, read-only)
                ├── holds  → ERC-20 tokens (public balances)
                ├── holds  → ERC-7984 tokens (encrypted balances)
                └── pays   → Contributors (encrypted amounts)
```

## Contracts

| Contract | Description |
|---|---|
| `ShieldVault.sol` | Core treasury — wrap, unwrap, pay contributors |
| `ShieldVaultFactory.sol` | Deploys vault instances, tracks them on-chain |
| `interfaces/IConfidentialTokenWrappersRegistry.sol` | Interface for the Zama Registry |
| `interfaces/IERC7984ConfidentialToken.sol` | Interface for ERC-7984 wrappers |
| `test/Mocks.sol` | Mock contracts for local Hardhat testing only |

## Setup

```bash
cp .env.example .env
# Fill in SEPOLIA_RPC_URL, PRIVATE_KEY, REGISTRY_ADDRESS_SEPOLIA
# Get the Sepolia registry address from:
# https://docs.zama.org/protocol/protocol-apps/addresses.md

npm install
```

## Local Testing

```bash
npm run compile
npm run test
```

## Deploy to Sepolia

```bash
npm run deploy:sepolia
```

The deploy script outputs the factory and vault addresses.
Copy them into your frontend `.env`.

## Key Design Decisions

**Registry validation on every wrap:**
`wrapToken` calls three registry checks before touching any token:
1. `getConfidentialTokenAddress(erc20)` — gets the wrapper and validates `isValid`
2. `isConfidentialTokenValid(wrapper)` — double-checks validity directly
3. `getTokenAddress(wrapper)` — verifies the wrapper's underlying token matches

This means a revoked wrapper is always caught before any funds move.

**No amounts in payment events:**
`ContributorPaid` deliberately omits the payment amount. On-chain observers
see that a payment happened, not how much was sent.

**2-step admin transfer:**
Admin cannot accidentally transfer control to a wrong address. The pending
admin must explicitly call `acceptAdmin()`.

**No AMM, no swap:**
ShieldVault does one thing well — treasury management with confidential payments.
It does not attempt to build a DEX or price discovery mechanism.

## Sepolia FHEVM Addresses (pre-filled)

| Contract | Address |
|---|---|
| ACL | `0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D` |
| KMS Verifier | `0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A` |
| Input Verifier | `0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0` |
| Relayer | `https://relayer.testnet.zama.org` |
