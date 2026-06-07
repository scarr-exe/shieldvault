import React from "react";
import { useAccount, useDisconnect } from "wagmi";
import { Addr } from "./ui";

type Page = "dashboard" | "wrap" | "contributors" | "pay" | "registry";

interface ShellProps {
  page: Page;
  onNav: (p: Page) => void;
  children: React.ReactNode;
  vaultAddress: string;
}

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: "dashboard",    label: "Dashboard",     icon: "⬡" },
  { id: "wrap",         label: "Wrap Station",   icon: "⟳" },
  { id: "contributors", label: "Contributors",   icon: "◈" },
  { id: "pay",          label: "Pay",            icon: "→" },
  { id: "registry",     label: "Registry",       icon: "⊞" },
];

export function Shell({ page, onNav, children, vaultAddress }: ShellProps) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{
        width: "220px", flexShrink: 0,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px",
              background: "var(--amber-glow)",
              border: "1px solid var(--amber-border)",
              borderRadius: "var(--radius)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px",
            }}>⬡</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "14px", letterSpacing: "-0.02em" }}>ShieldVault</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Treasury Manager</div>
            </div>
          </div>
        </div>

        {/* Vault address pill */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "4px" }}>Active Vault</div>
          <Addr address={vaultAddress} />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 0", overflow: "auto" }}>
          {navItems.map(item => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNav(item.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 20px", background: active ? "var(--amber-glow)" : "none",
                  border: "none", borderLeft: `2px solid ${active ? "var(--amber)" : "transparent"}`,
                  color: active ? "var(--amber)" : "var(--text-secondary)",
                  cursor: "pointer", fontSize: "13px", fontFamily: "var(--font-display)",
                  fontWeight: active ? 600 : 400, transition: "all 0.15s", textAlign: "left",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "none"; }}
              >
                <span style={{ fontSize: "14px", width: "18px", textAlign: "center", opacity: 0.8 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer: connected wallet */}
        <div style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px" }}>Connected</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Addr address={address || ""} />
            <button
              onClick={() => disconnect()}
              title="Disconnect"
              style={{
                background: "none", border: "none", color: "var(--text-muted)",
                cursor: "pointer", fontSize: "10px", letterSpacing: "0.04em",
                fontFamily: "var(--font-display)", padding: "2px 4px",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
            >
              EXIT
            </button>
          </div>
          {/* Sepolia indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", animation: "pulse-glow 2s infinite" }} />
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Sepolia</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {/* Topbar */}
        <header style={{
          height: "52px", flexShrink: 0,
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center",
          padding: "0 28px", gap: "12px",
          background: "var(--bg-surface)",
        }}>
          <span style={{ fontWeight: 700, fontSize: "13px", letterSpacing: "0.02em" }}>
            {navItems.find(n => n.id === page)?.label}
          </span>
          <div style={{ flex: 1 }} />
          <a
            href={`https://sepolia.etherscan.io/address/${vaultAddress}`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "11px", color: "var(--text-muted)", textDecoration: "none", letterSpacing: "0.04em" }}
          >
            View on Etherscan ↗
          </a>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, padding: "28px", overflow: "auto" }} className="fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
