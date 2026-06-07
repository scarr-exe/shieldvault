// ── Deployed addresses ──────────────────────────────────────────────────────
export const ADDRESSES = {
  registry: (import.meta.env.VITE_REGISTRY_ADDRESS ||
    "0x2f0750Bbb0A246059d80e94c454586a7F27a128e") as `0x${string}`,
  factory: (import.meta.env.VITE_FACTORY_ADDRESS ||
    "0x6AF19cF8dCb588DCc239726e87881B8AfbF0F1b2") as `0x${string}`,
  vault: (import.meta.env.VITE_VAULT_ADDRESS ||
    "0x430d43d293de91a008Cc48dB6116b5CAca687077") as `0x${string}`,
  relayerUrl:
    import.meta.env.VITE_RELAYER_URL || "https://relayer.testnet.zama.org",
};

// ── Known Sepolia confidential token labels ──────────────────────────────────
export const TOKEN_LABELS: Record<
  string,
  { symbol: string; name: string; decimals: number }
> = {
  "0x9b5cd13b8efb858dc25a05cf411d8056058adfff": {
    symbol: "cUSDC",
    name: "Confidential USDC (Mock)",
    decimals: 6,
  },
  "0xa7da08fafdc9097cc0e7d4f113a61e31d7e8e9b0": {
    symbol: "cUSDT",
    name: "Confidential USDT (Mock)",
    decimals: 6,
  },
  "0x46208622da27d91db4f0393733c8ba082ed83158": {
    symbol: "cWETH",
    name: "Confidential WETH (Mock)",
    decimals: 18,
  },
  "0xff54739b16576fa5402f211d0b938469ab9a5f3f": {
    symbol: "cBRON",
    name: "Confidential BRON (Mock)",
    decimals: 18,
  },
  "0xaa5612fa27c927a0c7961f5aefee5ba3a0f9c891": {
    symbol: "cBRON",
    name: "Confidential BRON (Mock)",
    decimals: 18,
  },
  "0xf021fb13ca64e5354c62c954b949a88cfdeb25e": {
    symbol: "cZAMA",
    name: "Confidential ZAMA (Mock)",
    decimals: 18,
  },
  "0x2d628d2598af4eaf94cb76a437ff86ca78ffbfb": {
    symbol: "ctGBP",
    name: "Confidential tGBP (Mock)",
    decimals: 18,
  },
  "0x75355a85c6fb9df5f0c80ff54e8747eee9a0bf57": {
    symbol: "cXAUt",
    name: "Confidential XAUt (Mock)",
    decimals: 6,
  },
};

export const ERC20_LABELS: Record<
  string,
  { symbol: string; name: string; decimals: number }
> = {
  "0x7c5bf43b851c1dff1a4fee8db225b87f2c223639": {
    symbol: "USDC",
    name: "USD Coin (Mock)",
    decimals: 6,
  },
  "0x4e7b06d78965594eb5ef5414c357ca21e1554491": {
    symbol: "USDT",
    name: "Tether USD (Mock)",
    decimals: 6,
  },
  "0xff54739b16576fa5402f211d0b938469ab9a5f3f": {
    symbol: "WETH",
    name: "Wrapped ETH (Mock)",
    decimals: 18,
  },
  "0xaa5612fa27c927a0c7961f5aefee5ba3a0f9c891": {
    symbol: "BRON",
    name: "BRON (Mock)",
    decimals: 18,
  },
  "0xf021fb13ca64e5354c62c954b949a88cfdeb25e": {
    symbol: "ZAMA",
    name: "ZAMA (Mock)",
    decimals: 18,
  },
  "0x2d628d2598af4eaf94cb76a437ff86ca78ffbfb": {
    symbol: "tGBP",
    name: "tGBP (Mock)",
    decimals: 18,
  },
  "0x75355a85c6fb9df5f0c80ff54e8747eee9a0bf57": {
    symbol: "XAUt",
    name: "Tether Gold (Mock)",
    decimals: 6,
  },
};
// ── ABIs ─────────────────────────────────────────────────────────────────────
export const REGISTRY_ABI = [
  {
    type: "function",
    name: "getConfidentialTokenAddress",
    inputs: [{ name: "erc20TokenAddress", type: "address" }],
    outputs: [
      { name: "isValid", type: "bool" },
      { name: "confidentialToken", type: "address" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isConfidentialTokenValid",
    inputs: [{ name: "confidentialWrapperAddress", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokenConfidentialTokenPairs",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "tokenAddress", type: "address" },
          { name: "confidentialTokenAddress", type: "address" },
          { name: "isValid", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokenConfidentialTokenPairsLength",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokenAddress",
    inputs: [{ name: "confidentialWrapperAddress", type: "address" }],
    outputs: [
      { name: "isValid", type: "bool" },
      { name: "token", type: "address" },
    ],
    stateMutability: "view",
  },
] as const;

export const VAULT_ABI = [
  // View
  {
    type: "function",
    name: "admin",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingAdmin",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "registry",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isContributor",
    inputs: [{ name: "a", type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "contributorLabel",
    inputs: [{ name: "a", type: "address" }],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getContributors",
    inputs: [],
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "contributorCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "publicBalance",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRegistryInfo",
    inputs: [{ name: "erc20Token", type: "address" }],
    outputs: [
      { name: "isValid", type: "bool" },
      { name: "wrapper", type: "address" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAllRegistryPairs",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "tokenAddress", type: "address" },
          { name: "confidentialTokenAddress", type: "address" },
          { name: "isValid", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  // Write
  {
    type: "function",
    name: "deposit",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [
      { name: "token", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "wrapToken",
    inputs: [
      { name: "erc20Token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "addContributor",
    inputs: [
      { name: "contributor", type: "address" },
      { name: "label", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeContributor",
    inputs: [{ name: "contributor", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "payContributor",
    inputs: [
      { name: "contributor", type: "address" },
      { name: "confidentialToken", type: "address" },
      { name: "encryptedAmount", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferAdmin",
    inputs: [{ name: "newAdmin", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "acceptAdmin",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Events
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: true, name: "from", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "TokenWrapped",
    inputs: [
      { indexed: true, name: "erc20Token", type: "address" },
      { indexed: true, name: "wrapper", type: "address" },
      { indexed: true, name: "recipient", type: "address" },
    ],
  },
  {
    type: "event",
    name: "ContributorPaid",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "confidentialToken", type: "address" },
    ],
  },
  {
    type: "event",
    name: "ContributorAdded",
    inputs: [
      { indexed: true, name: "contributor", type: "address" },
      { indexed: false, name: "label", type: "string" },
    ],
  },
  {
    type: "event",
    name: "ContributorRemoved",
    inputs: [{ indexed: true, name: "contributor", type: "address" }],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const FACTORY_ABI = [
  {
    type: "function",
    name: "deployVault",
    inputs: [{ name: "admin", type: "address" }],
    outputs: [{ name: "vault", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getVaultsByAdmin",
    inputs: [{ name: "admin", type: "address" }],
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isShieldVault",
    inputs: [{ name: "a", type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "VaultDeployed",
    inputs: [
      { indexed: true, name: "vault", type: "address" },
      { indexed: true, name: "admin", type: "address" },
      { indexed: false, name: "vaultIndex", type: "uint256" },
    ],
  },
] as const;
