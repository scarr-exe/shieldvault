import { useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { ADDRESSES, VAULT_ABI, REGISTRY_ABI, ERC20_LABELS, TOKEN_LABELS } from "../config/contracts";
import { Card, Badge, Addr, Empty, Spinner } from "../components/ui";

export function DashboardPage() {
  // Fetch all registry pairs
  const { data: pairs, isLoading: pairsLoading } = useReadContract({
    address: ADDRESSES.registry,
    abi: REGISTRY_ABI,
    functionName: "getTokenConfidentialTokenPairs",
  });

  // Fetch vault admin
  const { data: admin } = useReadContract({
    address: ADDRESSES.vault,
    abi: VAULT_ABI,
    functionName: "admin",
  });

  // Fetch contributor count
  const { data: contributorCount } = useReadContract({
    address: ADDRESSES.vault,
    abi: VAULT_ABI,
    functionName: "contributorCount",
  });

  // Fetch public balances for all known tokens
  const tokenAddresses = pairs?.map(p => p.tokenAddress) ?? [];
  const balanceCalls = tokenAddresses.map(token => ({
    address: ADDRESSES.vault,
    abi: VAULT_ABI,
    functionName: "publicBalance" as const,
    args: [token],
  }));

  const { data: balances } = useReadContracts({ contracts: balanceCalls });

  const validPairs  = pairs?.filter(p => p.isValid) ?? [];
  const revokedPairs = pairs?.filter(p => !p.isValid) ?? [];
  const nonZeroBalances = balances?.filter(b => b.result && b.result > 0n) ?? [];

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Valid Wrappers",    value: validPairs.length,                icon: "⊞", color: "var(--green)"  },
          { label: "Revoked Wrappers",  value: revokedPairs.length,              icon: "⊠", color: "var(--red)"    },
          { label: "Contributors",      value: Number(contributorCount ?? 0),    icon: "◈", color: "var(--amber)"  },
          { label: "Token Holdings",    value: nonZeroBalances.length,           icon: "⬡", color: "var(--blue)"   },
        ].map(stat => (
          <Card key={stat.label} style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px" }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.03em" }}>
                  {stat.value}
                </div>
              </div>
              <span style={{ fontSize: "20px", color: stat.color, opacity: 0.7 }}>{stat.icon}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Public balances */}
        <Card>
          <SectionHeader title="Public Balances" hint="Unwrapped ERC-20 held in vault" />
          <div style={{ padding: "0 0 8px" }}>
            {pairsLoading ? (
              <div style={{ padding: "24px", display: "flex", justifyContent: "center" }}><Spinner /></div>
            ) : nonZeroBalances.length === 0 ? (
              <Empty icon="○" title="No public balances" description="Deposit tokens to get started" />
            ) : (
              tokenAddresses.map((addr, i) => {
                const balance = balances?.[i]?.result ?? 0n;
                if (!balance) return null;
                const meta = ERC20_LABELS[addr.toLowerCase()] ?? { symbol: "?", name: "Unknown", decimals: 18 };
                return (
                  <div key={addr} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 20px", borderBottom: "1px solid var(--border)",
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "13px" }}>{meta.symbol}</div>
                      <Addr address={addr} />
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-primary)" }}>
                      {Number(formatUnits(balance, meta.decimals)).toLocaleString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Confidential balances */}
        <Card>
          <SectionHeader title="Confidential Balances" hint="FHE-encrypted — amounts hidden" />
          <div style={{ padding: "0 0 8px" }}>
            {validPairs.length === 0 ? (
              <Empty icon="⬡" title="No wrapped tokens" description="Use the Wrap Station to encrypt tokens" />
            ) : (
              validPairs.map(pair => {
                const meta = TOKEN_LABELS[pair.confidentialTokenAddress.toLowerCase()];
                return (
                  <div key={pair.confidentialTokenAddress} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 20px", borderBottom: "1px solid var(--border)",
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "13px" }}>{meta?.symbol ?? "Unknown"}</div>
                      <Addr address={pair.confidentialTokenAddress} />
                    </div>
                    <Badge variant="encrypted">ENCRYPTED</Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Vault info */}
        <Card>
          <SectionHeader title="Vault Info" />
          <div style={{ padding: "0 20px 16px" }}>
            <InfoRow label="Vault Address"    value={<Addr address={ADDRESSES.vault} />} />
            <InfoRow label="Admin"            value={<Addr address={admin ?? "—"} />} />
            <InfoRow label="Registry"         value={<Addr address={ADDRESSES.registry} />} />
            <InfoRow label="Network"          value={<span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--green)" }}>Sepolia</span>} />
          </div>
        </Card>

        {/* Registry summary */}
        <Card>
          <SectionHeader title="Registry Summary" hint="Official Zama Wrappers Registry" />
          <div style={{ padding: "0 20px 16px" }}>
            <InfoRow label="Total Pairs"  value={<Mono>{pairs?.length ?? "—"}</Mono>} />
            <InfoRow label="Valid"        value={<Mono color="var(--green)">{validPairs.length}</Mono>} />
            <InfoRow label="Revoked"      value={<Mono color="var(--red)">{revokedPairs.length}</Mono>} />
            <InfoRow label="Registry"     value={<Addr address={ADDRESSES.registry} />} />
          </div>
        </Card>

      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ fontWeight: 700, fontSize: "13px" }}>{title}</div>
      {hint && <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{hint}</div>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Mono({ children, color }: { children: React.ReactNode; color?: string }) {
  return <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: color ?? "var(--text-primary)" }}>{children}</span>;
}
