import { useState } from "react";
import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { ADDRESSES, VAULT_ABI, REGISTRY_ABI, TOKEN_LABELS, ERC20_LABELS } from "../config/contracts";
import { Card, Button, Input, Badge, Addr, useToast, Spinner } from "../components/ui";
import { useZamaSDK, sendConfidentialPayment } from "../hooks/useZamaSDK";
import { useRefreshOnTx } from "../hooks/useRefreshOnTx";

function cleanError(msg: string): string {
  if (msg.includes("User rejected") || msg.includes("user rejected")) return "Transaction cancelled";
  if (msg.includes("insufficient funds")) return "Insufficient ETH for gas";
  if (msg.includes("execution reverted")) return "Transaction failed — check your balance";
  return "Something went wrong — try again";
}

type Step = "idle" | "encrypting" | "submitting" | "done";

export function PayPage() {
  const { address } = useAccount();
  const { show, ToastEl } = useToast();
  const sdk = useZamaSDK();

  const [selectedContributor, setSelectedContributor] = useState("");
  const [selectedToken, setSelectedToken] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("idle");

  const { data: contributors } = useReadContract({
    address: ADDRESSES.vault, abi: VAULT_ABI, functionName: "getContributors",
  });
  const { data: admin } = useReadContract({
    address: ADDRESSES.vault, abi: VAULT_ABI, functionName: "admin",
  });
  const { data: pairs } = useReadContract({
    address: ADDRESSES.registry, abi: REGISTRY_ABI, functionName: "getTokenConfidentialTokenPairs",
  });

  const isAdmin = address?.toLowerCase() === admin?.toLowerCase();
  const validPairs = pairs?.filter(p => {
    if (!p.isValid) return false;
    const meta = ERC20_LABELS[p.tokenAddress.toLowerCase()];
    return meta?.decimals === 6;
  }) ?? [];

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: txLoading, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  useRefreshOnTx(txSuccess);

  // Derive decimals from the underlying ERC-20 via registry pairs
  const selectedPair = pairs?.find(p => p.confidentialTokenAddress === selectedToken);
  const underlyingMeta = selectedPair
    ? ERC20_LABELS[selectedPair.tokenAddress.toLowerCase()]
    : null;
  const decimals = underlyingMeta?.decimals ?? 18;

  const MAX_UINT64 = BigInt("18446744073709551615");

  const handlePay = async () => {
    if (!selectedContributor || !selectedToken || !amount) return;
    if (!sdk) { show("Zama SDK not ready", "error"); return; }

    const amountBigInt = parseUnits(amount, decimals);

    if (amountBigInt > MAX_UINT64) {
      const maxAmount = formatUnits(MAX_UINT64, decimals);
      show(`Max amount for this token is ${Number(maxAmount).toFixed(4)}`, "error");
      return;
    }

    setStep("encrypting");

    try {
      const amountBigInt = parseUnits(amount, decimals);

      setStep("submitting");

      // SDK encrypts the amount client-side and sends confidentialTransfer
      await sendConfidentialPayment(sdk, selectedToken, selectedContributor, amountBigInt);

      show("Payment sent — amount is encrypted on-chain", "success");
      setStep("done");
      setAmount("");
    } catch (e: any) {
      show(cleanError(e.message) || "Payment failed", "error");
      setStep("idle");
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: "500px" }}>
        <div style={{
          background: "var(--amber-glow)", border: "1px solid var(--amber-border)",
          borderRadius: "var(--radius)", padding: "16px 20px",
          fontSize: "13px", color: "var(--amber)",
        }}>
          Only the vault admin can send payments.
        </div>
      </div>
    );
  }

  const selectedTokenMeta = selectedToken
    ? TOKEN_LABELS[selectedToken.toLowerCase()] ?? { symbol: selectedToken.slice(0, 8) }
    : null;

  const isLoading = step === "encrypting" || step === "submitting" || isPending || txLoading;

  return (
    <div style={{ maxWidth: "600px" }}>
      {ToastEl}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* SDK status */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "7px", height: "7px", borderRadius: "50%",
            background: sdk ? "var(--green)" : "var(--amber)",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {sdk ? "Zama SDK ready" : "Zama SDK initializing…"}
          </span>
        </div>

        {/* Payment form */}
        <Card style={{ padding: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "16px" }}>
            Send Confidential Payment
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Contributor select */}
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px", fontWeight: 600 }}>
                Recipient
              </div>
              {!contributors || contributors.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text-muted)", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-elevated)" }}>
                  No contributors — add them in the Contributors tab first
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {contributors.map(addr => (
                    <ContributorOption
                      key={addr}
                      address={addr}
                      selected={selectedContributor === addr}
                      onSelect={() => setSelectedContributor(addr)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Token select */}
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px", fontWeight: 600 }}>
                Confidential Token
              </div>
              {validPairs.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text-muted)", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-elevated)" }}>
                  No valid wrappers — wrap tokens in Wrap Station first
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {validPairs.map(pair => {
                    const erc20Meta = ERC20_LABELS[pair.tokenAddress.toLowerCase()];
                    const label = erc20Meta ? `c${erc20Meta.symbol}` : `c${pair.tokenAddress.slice(2, 6).toUpperCase()}`;
                    const sel = selectedToken === pair.confidentialTokenAddress;
                    return (
                      <button key={pair.confidentialTokenAddress} onClick={() => setSelectedToken(pair.confidentialTokenAddress)} style={{
                        padding: "6px 14px", border: `1px solid ${sel ? "var(--amber-border)" : "var(--border)"}`,
                        background: sel ? "var(--amber-glow)" : "var(--bg-elevated)",
                        color: sel ? "var(--amber)" : "var(--text-secondary)",
                        borderRadius: "var(--radius)", fontFamily: "var(--font-display)",
                        fontSize: "12px", fontWeight: 600, cursor: "pointer",
                      }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Amount */}
            <Input
              label="Amount"
              placeholder="0.00"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              hint={
                selectedTokenMeta && underlyingMeta
                  ? decimals === 18
                    ? `Max per transfer: 18.44 ${selectedTokenMeta.symbol} (euint64 limit)`
                    : `Paying in ${selectedTokenMeta.symbol} — amount will be encrypted by Zama SDK`
                  : undefined
              }
            />

            {/* Pay button */}
            <Button
              variant="primary"
              size="lg"
              loading={isLoading}
              disabled={!selectedContributor || !selectedToken || !amount || !sdk || step !== "idle"}
              onClick={handlePay}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {step === "encrypting" ? (
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Spinner size={14} color="#07090D" /> Encrypting with Zama SDK…
                </span>
              ) : step === "submitting" ? (
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Spinner size={14} color="#07090D" /> Submitting transaction…
                </span>
              ) : (
                "Send Encrypted Payment →"
              )}
            </Button>

            {step === "done" && (
              <div style={{
                background: "var(--green-glow)", border: "1px solid var(--green-border)",
                borderRadius: "var(--radius)", padding: "10px 14px",
                fontSize: "12px", color: "var(--green)",
              }}>
                ✓ Payment sent. Amount is encrypted on-chain — observers see the transfer, never the value.
              </div>
            )}
          </div>
        </Card>

        {/* What happens step by step */}
        <Card style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "10px" }}>
            What happens when you click pay
          </div>
          {[
            ["Select", "Choose a contributor and confidential token"],
            ["Sign", "Wallet signs the transfer — SDK encrypts the amount internally"],
            ["Submit", "confidentialTransfer() sends the encrypted amount on-chain"],
            ["Hidden", "Only sender, recipient, and token are visible — never the amount"],
          ].map(([title, desc]) => (
            <div key={title} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <span style={{
                width: "54px", flexShrink: 0, fontFamily: "var(--font-mono)",
                fontSize: "10px", color: "var(--amber)", fontWeight: 700,
                paddingTop: "1px",
              }}>{title}</span>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{desc}</span>
            </div>
          ))}
        </Card>

      </div>
    </div>
  );
}

function ContributorOption({ address, selected, onSelect }: {
  address: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { data: label } = useReadContract({
    address: ADDRESSES.vault,
    abi: VAULT_ABI,
    functionName: "contributorLabel",
    args: [address as `0x${string}`],
  });

  return (
    <button onClick={onSelect} style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "10px 12px", borderRadius: "var(--radius)",
      border: `1px solid ${selected ? "var(--amber-border)" : "var(--border)"}`,
      background: selected ? "var(--amber-glow)" : "var(--bg-elevated)",
      cursor: "pointer", textAlign: "left", width: "100%",
    }}>
      <div style={{
        width: "28px", height: "28px", borderRadius: "2px",
        background: selected ? "var(--amber-glow)" : "var(--bg-surface)",
        border: `1px solid ${selected ? "var(--amber-border)" : "var(--border)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "11px", color: selected ? "var(--amber)" : "var(--text-muted)", fontWeight: 700,
      }}>
        {(label ?? "?")[0]?.toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: selected ? "var(--amber)" : "var(--text-primary)" }}>
          {label || "Unnamed"}
        </div>
        <Addr address={address} />
      </div>
      {selected && <span style={{ color: "var(--amber)", fontSize: "14px" }}>◆</span>}
    </button>
  );
}
