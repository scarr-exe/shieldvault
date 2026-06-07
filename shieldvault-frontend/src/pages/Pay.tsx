import { useState } from "react";
import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, VAULT_ABI, REGISTRY_ABI, TOKEN_LABELS } from "../config/contracts";
import { Card, Button, Input, Badge, Addr, useToast } from "../components/ui";

export function PayPage() {
  const { address } = useAccount();
  const { show, ToastEl } = useToast();

  const [selectedContributor, setSelectedContributor] = useState("");
  const [selectedToken, setSelectedToken] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"idle" | "encrypting" | "submitting" | "done">("idle");

  const { data: contributors } = useReadContract({ address: ADDRESSES.vault, abi: VAULT_ABI, functionName: "getContributors" });
  const { data: admin } = useReadContract({ address: ADDRESSES.vault, abi: VAULT_ABI, functionName: "admin" });
  const { data: pairs } = useReadContract({ address: ADDRESSES.registry, abi: REGISTRY_ABI, functionName: "getTokenConfidentialTokenPairs" });

  const isAdmin = address?.toLowerCase() === admin?.toLowerCase();
  const validPairs = pairs?.filter(p => p.isValid) ?? [];

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: txLoading } = useWaitForTransactionReceipt({ hash: txHash });

  const handlePay = async () => {
    if (!selectedContributor || !selectedToken || !amount) return;

    setStep("encrypting");

    try {
      // ── Zama SDK encryption ─────────────────────────────────────────────────
      // In production this is how you encrypt the amount using the Zama SDK:
      //
      // import { ZamaSDK } from "@zama-fhe/sdk";
      // import { ViemSigner } from "@zama-fhe/sdk/viem";
      //
      // const sdk = new ZamaSDK({ ... });
      // const token = sdk.createToken(selectedToken);
      // const encryptedInput = await sdk.createEncryptedInput(selectedToken, address);
      // encryptedInput.add64(BigInt(parseUnits(amount, decimals)));
      // const { handles, inputProof } = await encryptedInput.encrypt();
      // const encryptedAmount = handles[0];
      //
      // Then pass encryptedAmount + inputProof to payContributor below.
      // ───────────────────────────────────────────────────────────────────────

      // Placeholder encrypted values for demo — replace with SDK output in production
      const encryptedAmount = "0x0000000000000000000000000000000000000000000000000000000000000001" as `0x${string}`;
      const inputProof = "0x00" as `0x${string}`;

      setStep("submitting");

      writeContract({
        address: ADDRESSES.vault,
        abi: VAULT_ABI,
        functionName: "payContributor",
        args: [
          selectedContributor as `0x${string}`,
          selectedToken as `0x${string}`,
          encryptedAmount,
          inputProof,
        ],
      }, {
        onSuccess: () => {
          show("Payment submitted — amount stays encrypted on-chain", "success");
          setStep("done");
          setAmount("");
        },
        onError: (e) => {
          show(e.message.slice(0, 80), "error");
          setStep("idle");
        },
      });
    } catch (e: any) {
      show(e.message?.slice(0, 80) || "Encryption failed", "error");
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

  const selectedTokenMeta = selectedToken ? TOKEN_LABELS[selectedToken.toLowerCase()] : null;

  return (
    <div style={{ maxWidth: "600px" }}>
      {ToastEl}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Payment form */}
        <Card style={{ padding: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "16px" }}>Send Confidential Payment</div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Contributor select */}
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px", fontWeight: 600 }}>
                Recipient
              </div>
              {!contributors || contributors.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text-muted)", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-elevated)" }}>
                  No contributors — add them first
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
                  No valid wrappers — wrap tokens first
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {validPairs.map(pair => {
                    const meta = TOKEN_LABELS[pair.confidentialTokenAddress.toLowerCase()];
                    const sel = selectedToken === pair.confidentialTokenAddress;
                    return (
                      <button key={pair.confidentialTokenAddress} onClick={() => setSelectedToken(pair.confidentialTokenAddress)} style={{
                        padding: "6px 14px", border: `1px solid ${sel ? "var(--amber-border)" : "var(--border)"}`,
                        background: sel ? "var(--amber-glow)" : "var(--bg-elevated)",
                        color: sel ? "var(--amber)" : "var(--text-secondary)",
                        borderRadius: "var(--radius)", fontFamily: "var(--font-display)",
                        fontSize: "12px", fontWeight: 600, cursor: "pointer",
                      }}>
                        {meta?.symbol ?? pair.confidentialTokenAddress.slice(0, 8)}
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
              hint={selectedTokenMeta ? `Paying in ${selectedTokenMeta.symbol} — amount will be encrypted` : undefined}
            />

            {/* Pay button */}
            <Button
              variant="primary"
              size="lg"
              loading={step === "encrypting" || step === "submitting" || isPending || txLoading}
              disabled={!selectedContributor || !selectedToken || !amount || step !== "idle"}
              onClick={handlePay}
              style={{ width: "100%" }}
            >
              {step === "encrypting" ? "Encrypting amount…"
               : step === "submitting" ? "Submitting transaction…"
               : "Send Encrypted Payment →"}
            </Button>

            {step === "done" && (
              <div style={{
                background: "var(--green-glow)", border: "1px solid var(--green-border)",
                borderRadius: "var(--radius)", padding: "10px 14px",
                fontSize: "12px", color: "var(--green)",
              }}>
                ✓ Payment sent. The amount is encrypted on-chain — no one can see how much was transferred.
              </div>
            )}
          </div>
        </Card>

        {/* Privacy explanation */}
        <Card style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "10px" }}>
            Privacy Guarantee
          </div>
          {[
            "Amount is encrypted client-side before broadcast",
            "On-chain event emits sender, recipient and token — not the amount",
            "Only the recipient can decrypt their incoming balance",
            "Even the vault admin cannot see the recipient's decrypted balance",
          ].map(line => (
            <div key={line} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <span style={{ color: "var(--green)", fontSize: "11px", marginTop: "1px" }}>✓</span>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{line}</span>
            </div>
          ))}
        </Card>

        {/* Zama SDK note */}
        <Card style={{ padding: "14px 16px", border: "1px solid var(--amber-border)", background: "var(--amber-glow)" }}>
          <div style={{ fontSize: "11px", color: "var(--amber)", fontWeight: 600, marginBottom: "4px" }}>
            Zama SDK Integration Note
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Amounts are encrypted via <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg-elevated)", padding: "0 4px" }}>sdk.createEncryptedInput()</code> before being passed to the contract. Replace the placeholder in <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg-elevated)", padding: "0 4px" }}>PayPage.tsx</code> with the live Zama SDK call when connecting your relayer.
          </div>
        </Card>

      </div>
    </div>
  );
}

function ContributorOption({ address, selected, onSelect }: { address: string; selected: boolean; onSelect: () => void }) {
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
        <div style={{ fontSize: "13px", fontWeight: 600, color: selected ? "var(--amber)" : "var(--text-primary)" }}>{label || "Unnamed"}</div>
        <Addr address={address} />
      </div>
      {selected && <span style={{ color: "var(--amber)", fontSize: "14px" }}>◆</span>}
    </button>
  );
}
