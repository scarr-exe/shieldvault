import { useReadContract } from "wagmi";
import { ADDRESSES, REGISTRY_ABI, ERC20_LABELS, TOKEN_LABELS } from "../config/contracts";
import { Card, Badge, Addr, Spinner, Empty } from "../components/ui";

export function RegistryPage() {
  const { data: pairs, isLoading } = useReadContract({
    address: ADDRESSES.registry,
    abi: REGISTRY_ABI,
    functionName: "getTokenConfidentialTokenPairs",
  });

  const valid   = pairs?.filter(p => p.isValid)  ?? [];
  const revoked = pairs?.filter(p => !p.isValid) ?? [];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>Wrappers Registry</div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          Official Zama Wrappers Registry — source of truth for all ERC-7984 wrapper addresses
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {ADDRESSES.registry}
          </div>
          <a
            href={`https://sepolia.etherscan.io/address/${ADDRESSES.registry}`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "11px", color: "var(--amber)", textDecoration: "none" }}
          >
            ↗
          </a>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <StatPill label="Total"   value={pairs?.length ?? 0} color="var(--text-secondary)" />
        <StatPill label="Valid"   value={valid.length}       color="var(--green)" />
        <StatPill label="Revoked" value={revoked.length}     color="var(--red)" />
      </div>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
          <Spinner size={24} />
        </div>
      ) : !pairs || pairs.length === 0 ? (
        <Empty icon="⊞" title="No pairs found" description="The registry appears empty on this network" />
      ) : (
        <Card>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "40px 1fr 1fr 120px 80px",
            padding: "10px 20px", borderBottom: "1px solid var(--border)",
            fontSize: "10px", color: "var(--text-muted)",
            letterSpacing: "0.08em", textTransform: "uppercase",
            alignItems: "center",
          }}>
            <span>#</span>
            <span>ERC-20 Token</span>
            <span>Confidential Wrapper</span>
            <span>Interface</span>
            <span>Status</span>
          </div>

          {/* Rows — valid first */}
          {[...valid, ...revoked].map((pair, i) => {
            const erc20Meta    = ERC20_LABELS[pair.tokenAddress.toLowerCase()];
            const wrapperMeta  = TOKEN_LABELS[pair.confidentialTokenAddress.toLowerCase()];
            return (
              <div
                key={pair.tokenAddress}
                style={{
                  display: "grid", gridTemplateColumns: "40px 1fr 1fr 120px 80px",
                  padding: "12px 20px", borderBottom: "1px solid var(--border)",
                  alignItems: "center",
                  opacity: pair.isValid ? 1 : 0.45,
                  background: pair.isValid ? "transparent" : "var(--red-glow)",
                }}
              >
                {/* Index */}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* ERC-20 */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                    <span style={{ fontWeight: 600, fontSize: "13px" }}>{erc20Meta?.symbol ?? "—"}</span>
                    {erc20Meta && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{erc20Meta.name}</span>}
                  </div>
                  <Addr address={pair.tokenAddress} />
                </div>

                {/* Wrapper */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                    <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--amber)" }}>{wrapperMeta?.symbol ?? "—"}</span>
                    {wrapperMeta && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{wrapperMeta.name}</span>}
                  </div>
                  <Addr address={pair.confidentialTokenAddress} />
                </div>

                {/* Interface */}
                <Badge variant="neutral">ERC-7984</Badge>

                {/* Status */}
                {pair.isValid
                  ? <Badge variant="valid">✓ Valid</Badge>
                  : <Badge variant="revoked">✕ Revoked</Badge>
                }
              </div>
            );
          })}
        </Card>
      )}

      {/* Registry explanation */}
      <div style={{ marginTop: "20px" }}>
        <Card style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "10px" }}>
            How ShieldVault uses this registry
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {[
              ["Every wrap is validated", "Before wrapping any token, the vault calls getConfidentialTokenAddress() to confirm the wrapper exists and is not revoked."],
              ["Revoked = blocked", "If isValid returns false, the wrap is rejected at the contract level — not just the UI."],
              ["No custom wrappers", "ShieldVault only uses official registry wrappers. No self-deployed or unverified wrappers can be used."],
              ["Double validation", "The vault calls both getConfidentialTokenAddress() and isConfidentialTokenValid() before any token moves."],
            ].map(([title, desc]) => (
              <div key={title} style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--amber)", flexShrink: 0 }}>◆</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "2px" }}>{title}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      padding: "6px 14px", borderRadius: "var(--radius)",
      border: "1px solid var(--border)", background: "var(--bg-surface)",
      display: "flex", gap: "8px", alignItems: "center",
    }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}
