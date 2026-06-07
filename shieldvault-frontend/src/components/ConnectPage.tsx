import { useConnect, useAccount } from "wagmi";
import { Button, Spinner } from "./ui";

export function ConnectPage() {
  const { connectors, connect, isPending } = useConnect();
  const { isConnecting } = useAccount();

  return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <div className="fade-in" style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo mark */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{
            width: "64px", height: "64px", margin: "0 auto 20px",
            background: "var(--amber-glow)", border: "1px solid var(--amber-border)",
            borderRadius: "var(--radius)", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "28px",
          }}>⬡</div>
          <h1 style={{ fontWeight: 800, fontSize: "24px", letterSpacing: "-0.03em", marginBottom: "8px" }}>
            ShieldVault
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.6 }}>
            Your treasury is public.<br />It shouldn't be.
          </p>
        </div>

        {/* Value props */}
        <div style={{
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: "20px", marginBottom: "24px",
        }}>
          {[
            ["⟳", "Wrap tokens", "Convert ERC-20s to confidential ERC-7984 via the official Zama Registry"],
            ["◈", "Pay privately", "Send salaries with amounts hidden on-chain — always"],
            ["⊞", "Registry verified", "Every wrap checks the Zama Wrappers Registry. Revoked wrappers are blocked."],
          ].map(([icon, title, desc]) => (
            <div key={title as string} style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <span style={{ color: "var(--amber)", fontSize: "16px", marginTop: "1px", flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "2px" }}>{title}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Connectors */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {connectors.map(connector => (
            <Button
              key={connector.uid}
              variant="primary"
              size="lg"
              loading={isPending || isConnecting}
              onClick={() => connect({ connector })}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {connector.name === "Injected" ? "Connect MetaMask" : `Connect ${connector.name}`}
            </Button>
          ))}
        </div>

        {/* Sepolia note */}
        <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-muted)", marginTop: "16px" }}>
          Sepolia testnet only — switch your wallet to Sepolia before connecting
        </p>
      </div>
    </div>
  );
}
