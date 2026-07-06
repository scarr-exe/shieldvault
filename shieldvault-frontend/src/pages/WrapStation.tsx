import { useState } from "react";
import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { ADDRESSES, VAULT_ABI, REGISTRY_ABI, ERC20_LABELS, TOKEN_LABELS, ERC20_ABI } from "../config/contracts";
import { Card, Button, Input, Badge, Addr, useToast } from "../components/ui";
import { useRefreshOnTx } from "../hooks/useRefreshOnTx";
import { RESTRICTED_MINT_TOKENS } from "../config/contracts";
import { useZamaSDK } from "../hooks/useZamaSDK";

function cleanError(msg: string): string {
  if (msg.includes("User rejected") || msg.includes("user rejected")) return "Transaction cancelled";
  if (msg.includes("insufficient funds")) return "Insufficient ETH for gas";
  if (msg.includes("execution reverted")) return "Transaction failed — check your balance";
  return "Something went wrong — try again";
}

export function WrapStationPage() {
  const sdk = useZamaSDK();
  const { address } = useAccount();
  const { show, ToastEl } = useToast();

  const [tokenInput, setTokenInput] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"deposit" | "wrap" | "unwrap">("deposit");

  // Query registry for the entered token
  const isAddress = tokenInput.startsWith("0x") && tokenInput.length === 42;

  const { data: registryInfo, isLoading: registryLoading } = useReadContract({
    address: ADDRESSES.registry,
    abi: REGISTRY_ABI,
    functionName: "getConfidentialTokenAddress",
    args: [tokenInput as `0x${string}`],
    query: { enabled: isAddress },
  });

  const { data: userBalance } = useReadContract({
    address: tokenInput as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: isAddress && !!address },
  });

  const { data: vaultBalance } = useReadContract({
    address: ADDRESSES.vault,
    abi: VAULT_ABI,
    functionName: "publicBalance",
    args: [tokenInput as `0x${string}`],
    query: { enabled: isAddress },
  });

  const { data: allowance } = useReadContract({
    address: tokenInput as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, ADDRESSES.vault],
    query: { enabled: isAddress && !!address },
  });

  const tokenMeta = ERC20_LABELS[tokenInput.toLowerCase()] ?? null;
  const [isValid, wrapper] = registryInfo ?? [false, undefined];
  const wrapperMeta = wrapper ? TOKEN_LABELS[wrapper.toLowerCase()] : null;

  // Actions
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: txLoading, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  useRefreshOnTx(txSuccess);
  const [approving, setApproving] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [wrapping, setWrapping] = useState(false);
  const [unwrapping, setUnwrapping] = useState(false);
  const parsedAmount = amount && tokenMeta
    ? parseUnits(amount, tokenMeta.decimals)
    : 0n;

  const needsApproval = allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount;

  const handleApprove = () => {
    setApproving(true);
    writeContract({
      address: tokenInput as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ADDRESSES.vault, parsedAmount],
    }, {
      onSuccess: () => { show("Approval submitted", "info"); setApproving(false); },
      onError: (e) => { show(cleanError(e.message), "error"); setApproving(false); },
    });
  };

  const handleDeposit = () => {
    setDepositing(true);
    writeContract({
      address: ADDRESSES.vault,
      abi: VAULT_ABI,
      functionName: "deposit",
      args: [tokenInput as `0x${string}`, parsedAmount],
    }, {
      onSuccess: () => { show("Deposit confirmed", "success"); setDepositing(false); },
      onError: (e) => { show(cleanError(e.message), "error"); setDepositing(false); },
    });
  };

  const MAX_UINT64 = BigInt("18446744073709551615");

  const handleWrap = () => {
    if (!isValid) { show("Wrapper revoked or not registered", "error"); return; }

    if (parsedAmount > MAX_UINT64) {
      const maxAmount = formatUnits(MAX_UINT64, tokenMeta?.decimals ?? 18);
      show(`Max amount for this token is ${Number(maxAmount).toFixed(4)}`, "error");
      return;
    }

    setWrapping(true);
    writeContract({
      address: ADDRESSES.vault,
      abi: VAULT_ABI,
      functionName: "wrapToken",
      args: [tokenInput as `0x${string}`, parsedAmount, address!],
    }, {
      onSuccess: () => { show("Tokens wrapped — balance is now encrypted", "success"); setWrapping(false); },
      onError: (e) => { show(cleanError(e.message), "error"); setWrapping(false); },
    });
  };

  const handleUnwrap = async () => {
    if (!sdk || !wrapper) { show("Zama SDK not ready or wrapper not found", "error"); return; }

    const MAX_UINT64 = BigInt("18446744073709551615");
    if (parsedAmount > MAX_UINT64) {
      const maxAmount = formatUnits(MAX_UINT64, tokenMeta?.decimals ?? 18);
      show(`Max amount for this token is ${Number(maxAmount).toFixed(4)}`, "error");
      return;
    }

    setUnwrapping(true);

    try {
      const token = sdk.createToken(wrapper);
      await token.unshield(parsedAmount);

      show("Unwrap submitted — tokens returning to public form", "success");
      setUnwrapping(false);
    } catch (e: any) {
      console.error("UNWRAP ERROR:", e);
      show(e.message?.slice(0, 100) || "Unwrap failed", "error");
      setUnwrapping(false);
    }
  };

  // All registry pairs for quick select
  const { data: allPairs } = useReadContract({
    address: ADDRESSES.registry,
    abi: REGISTRY_ABI,
    functionName: "getTokenConfidentialTokenPairs",
  });

  return (
    <div style={{ maxWidth: "720px" }}>
      {ToastEl}

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: "1px", background: "var(--border)", borderRadius: "var(--radius)", padding: "1px", marginBottom: "24px", width: "fit-content" }}>
        {(["deposit", "wrap", "unwrap"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: "7px 20px", border: "none", borderRadius: "var(--radius)",
            background: mode === m ? "var(--bg-elevated)" : "transparent",
            color: mode === m ? "var(--text-primary)" : "var(--text-muted)",
            fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: mode === m ? 600 : 400,
            cursor: "pointer", textTransform: "capitalize", letterSpacing: "0.02em",
          }}>
            {m === "deposit" ? "Deposit ERC-20" : m === "wrap" ? "Wrap to Confidential" : "Unwrap to ERC-20"}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Left: input form */}
        <Card style={{ padding: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "16px" }}>
            {mode === "deposit" ? "Deposit Token" : "Wrap Token"}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <Input
              label="ERC-20 Token Address"
              placeholder="0x..."
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              mono
            />

            {/* Quick select from registry */}
            {allPairs && allPairs.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px" }}>
                  Quick select from registry
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {allPairs.map(pair => {
                    const meta = ERC20_LABELS[pair.tokenAddress.toLowerCase()];
                    return (
                      <button
                        key={pair.tokenAddress}
                        onClick={() => setTokenInput(pair.tokenAddress)}
                        style={{
                          padding: "4px 10px", borderRadius: "var(--radius)",
                          border: `1px solid ${tokenInput === pair.tokenAddress ? "var(--amber-border)" : "var(--border)"}`,
                          background: tokenInput === pair.tokenAddress ? "var(--amber-glow)" : "var(--bg-elevated)",
                          color: tokenInput === pair.tokenAddress ? "var(--amber)" : "var(--text-secondary)",
                          fontSize: "11px", fontFamily: "var(--font-display)", fontWeight: 600,
                          cursor: "pointer",
                          opacity: pair.isValid ? 1 : 0.4,
                        }}
                        title={pair.isValid ? "Valid" : "Revoked"}
                      >
                        {meta?.symbol ?? pair.tokenAddress.slice(0, 6)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Input
              label={mode === "deposit" ? "Amount to Deposit" : "Amount to Wrap"}
              placeholder="0.00"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              hint={
                mode === "deposit" && userBalance !== undefined && tokenMeta
                  ? `Wallet balance: ${formatUnits(userBalance as bigint, tokenMeta.decimals)} ${tokenMeta.symbol}`
                  : mode === "wrap" && vaultBalance !== undefined && tokenMeta
                    ? `Vault balance: ${formatUnits(vaultBalance as bigint, tokenMeta.decimals)} ${tokenMeta.symbol}`
                    : mode === "unwrap" && tokenMeta
                      ? `Unwraps c${tokenMeta.symbol} back to ${tokenMeta.symbol}`
                      : undefined
              }
            />

            {/* Mint button — only shown when wallet balance is 0 and token is selected */}
            {mode === "deposit" && isAddress && userBalance === 0n && tokenMeta && (
              RESTRICTED_MINT_TOKENS.has(tokenInput.toLowerCase()) ? (
                <div style={{
                  padding: "10px 12px", borderRadius: "var(--radius)",
                  border: "1px solid var(--red-border)", background: "var(--red-glow)",
                }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--red)" }}>
                    Restricted token
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    This token has no public mint. You need an existing balance to deposit here.
                  </div>
                </div>
              ) : (
                <MintButton
                  tokenAddress={tokenInput as `0x${string}`}
                  symbol={tokenMeta.symbol}
                  decimals={tokenMeta.decimals}
                  onSuccess={() => show(`10,000 ${tokenMeta.symbol} minted to your wallet`, "success")}
                  onError={(e) => show(e, "error")}
                />
              )
            )}
            {/* Action button */}
            {mode === "deposit" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {needsApproval && (
                  <Button variant="secondary" loading={approving} onClick={handleApprove} style={{ width: "100%" }}>
                    1. Approve
                  </Button>
                )}
                <Button
                  variant="primary"
                  loading={depositing}
                  disabled={!amount || !isAddress || (needsApproval ?? false)}
                  onClick={handleDeposit}
                  style={{ width: "100%" }}
                >
                  {needsApproval ? "2. Deposit" : "Deposit to Vault"}
                </Button>
              </div>
            ) : mode === "wrap" ? (
              <Button
                variant="primary"
                loading={wrapping}
                disabled={!amount || !isAddress || !isValid}
                onClick={handleWrap}
                style={{ width: "100%" }}
              >
                Wrap → Confidential
              </Button>
            ) : (
              <Button
                variant="primary"
                loading={unwrapping}
                disabled={!amount || !isAddress || !isValid || !sdk}
                onClick={handleUnwrap}
                style={{ width: "100%" }}
              >
                Unwrap → ERC-20
              </Button>
            )}
          </div>
        </Card>

        {/* Right: registry validation panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Registry check */}
          <Card style={{ padding: "16px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>
              Registry Validation
            </div>

            {!isAddress ? (
              <div style={{ fontSize: "12px", color: "var(--text-muted)", padding: "8px 0" }}>
                Enter a token address to check registry status
              </div>
            ) : registryLoading ? (
              <div style={{ display: "flex", gap: "8px", alignItems: "center", padding: "8px 0" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--text-muted)", animation: "pulse-glow 1s infinite" }} />
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Querying registry…</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Status */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Status</span>
                  {isValid
                    ? <Badge variant="valid">✓ Registry Verified</Badge>
                    : wrapper && wrapper !== "0x0000000000000000000000000000000000000000"
                      ? <Badge variant="revoked">✕ Revoked</Badge>
                      : <Badge variant="revoked">✕ Not Registered</Badge>
                  }
                </div>

                {/* Token */}
                {tokenMeta && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Token</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>{tokenMeta.symbol}</span>
                  </div>
                )}

                {/* Wrapper */}
                {wrapper && wrapper !== "0x0000000000000000000000000000000000000000" && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Wrapper</span>
                      <Addr address={wrapper} />
                    </div>
                    {wrapperMeta && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>c-Token</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--amber)" }}>{wrapperMeta.symbol}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>

          {/* How it works */}
          <Card style={{ padding: "16px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>
              How wrapping works
            </div>
            {[
              ["1", "Select a token — the app queries the Zama Registry"],
              ["2", "Registry returns the official ERC-7984 wrapper"],
              ["3", "Vault approves the wrapper and calls wrap()"],
              ["4", "Token balance becomes encrypted on-chain"],
            ].map(([n, text]) => (
              <div key={n} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <span style={{
                  width: "18px", height: "18px", borderRadius: "50%",
                  background: "var(--amber-glow)", border: "1px solid var(--amber-border)",
                  color: "var(--amber)", fontSize: "10px", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>{n}</span>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function MintButton({ tokenAddress, symbol, decimals, onSuccess, onError }: {
  tokenAddress: `0x${string}`;
  symbol: string;
  decimals: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const { address } = useAccount();
  const { writeContract, isPending, data: txHash } = useWriteContract();
  const { isLoading: txLoading } = useWaitForTransactionReceipt({ hash: txHash });

  const mintAmount = parseUnits("10000", decimals);

  const handleMint = () => {
    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "mint",
      args: [address!, mintAmount],
    }, {
      onSuccess: () => onSuccess(),
      onError: (e) => onError(cleanError(e.message)),
    });
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 12px", borderRadius: "var(--radius)",
      border: "1px solid var(--amber-border)", background: "var(--amber-glow)",
    }}>
      <div>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--amber)" }}>
          No {symbol} in wallet
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
          Mint 10,000 test tokens to get started
        </div>
      </div>
      <Button
        variant="primary"
        size="sm"
        loading={isPending || txLoading}
        onClick={handleMint}
      >
        Mint 10k {symbol}
      </Button>
    </div>
  );
}
