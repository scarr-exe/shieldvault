import React, { useState } from "react";

// ── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "secondary" | "ghost" | "danger";

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
}

const btnBase: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  gap: "8px", fontFamily: "var(--font-display)", fontWeight: 600,
  cursor: "pointer", border: "1px solid", borderRadius: "var(--radius)",
  transition: "all 0.15s ease", whiteSpace: "nowrap", position: "relative",
  letterSpacing: "0.02em",
};

const btnVariants: Record<BtnVariant, React.CSSProperties> = {
  primary:   { background: "var(--amber)",       borderColor: "var(--amber)",       color: "#07090D" },
  secondary: { background: "var(--bg-elevated)",  borderColor: "var(--border-strong)", color: "var(--text-primary)" },
  ghost:     { background: "transparent",          borderColor: "transparent",          color: "var(--text-secondary)" },
  danger:    { background: "var(--red-glow)",      borderColor: "var(--red-border)",    color: "var(--red)" },
};

const btnSizes: Record<string, React.CSSProperties> = {
  sm: { padding: "6px 12px",  fontSize: "12px", height: "30px" },
  md: { padding: "8px 16px",  fontSize: "13px", height: "36px" },
  lg: { padding: "12px 24px", fontSize: "14px", height: "44px" },
};

export function Button({ variant = "secondary", loading, size = "md", children, style, disabled, ...rest }: BtnProps) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        ...btnBase,
        ...btnVariants[variant],
        ...btnSizes[size],
        opacity: disabled || loading ? 0.5 : 1,
        ...style,
      }}
      {...rest}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 16 16"
      style={{ animation: "spin 0.7s linear infinite", flexShrink: 0 }}
    >
      <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.2" />
      <path d="M8 2 A6 6 0 0 1 14 8" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = "valid" | "revoked" | "encrypted" | "neutral" | "amber";

const badgeStyles: Record<BadgeVariant, React.CSSProperties> = {
  valid:     { background: "var(--green-glow)", border: "1px solid var(--green-border)",  color: "var(--green)" },
  revoked:   { background: "var(--red-glow)",   border: "1px solid var(--red-border)",    color: "var(--red)" },
  encrypted: { background: "var(--amber-glow)", border: "1px solid var(--amber-border)",  color: "var(--amber)" },
  neutral:   { background: "var(--bg-elevated)",border: "1px solid var(--border)",        color: "var(--text-secondary)" },
  amber:     { background: "var(--amber-glow)", border: "1px solid var(--amber-border)",  color: "var(--amber)" },
};

export function Badge({ variant = "neutral", children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  return (
    <span style={{
      ...badgeStyles[variant],
      padding: "2px 8px", borderRadius: "2px",
      fontSize: "11px", fontWeight: 600, fontFamily: "var(--font-display)",
      letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap",
      display: "inline-flex", alignItems: "center", gap: "4px",
    }}>
      {children}
    </span>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style, glow }: { children: React.ReactNode; style?: React.CSSProperties; glow?: "amber" | "green" }) {
  const glowStyle = glow === "amber"
    ? { boxShadow: "0 0 0 1px var(--amber-border), inset 0 1px 0 rgba(245,158,11,0.05)" }
    : glow === "green"
    ? { boxShadow: "0 0 0 1px var(--green-border), inset 0 1px 0 rgba(16,185,129,0.05)" }
    : {};
  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      ...glowStyle,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
}

export function Input({ label, hint, error, mono, style, ...rest }: InputProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {label}
        </label>
      )}
      <input
        style={{
          background: "var(--bg-elevated)",
          border: `1px solid ${error ? "var(--red-border)" : "var(--border-strong)"}`,
          borderRadius: "var(--radius)",
          padding: "9px 12px",
          color: "var(--text-primary)",
          fontFamily: mono ? "var(--font-mono)" : "var(--font-display)",
          fontSize: mono ? "12px" : "13px",
          outline: "none",
          width: "100%",
          transition: "border-color 0.15s",
          ...style,
        }}
        onFocus={e => (e.target.style.borderColor = "var(--amber-border)")}
        onBlur={e => (e.target.style.borderColor = error ? "var(--red-border)" : "var(--border-strong)")}
        {...rest}
      />
      {hint && !error && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{hint}</span>}
      {error && <span style={{ fontSize: "11px", color: "var(--red)" }}>{error}</span>}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(7,9,13,0.85)",
        backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 100, padding: "20px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="fade-in"
        style={{
          background: "var(--bg-surface)", border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius)", width: "100%", maxWidth: "480px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border)",
        }}>
          <span style={{ fontWeight: 700, fontSize: "14px" }}>{title}</span>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "var(--text-muted)",
            cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "2px 6px",
          }}>×</button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

// ── Truncate address ─────────────────────────────────────────────────────────
export function Addr({ address, full }: { address: string; full?: boolean }) {
  const [copied, setCopied] = useState(false);
  const display = full ? address : `${address.slice(0, 6)}…${address.slice(-4)}`;

  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span
      onClick={copy}
      title={address}
      style={{
        fontFamily: "var(--font-mono)", fontSize: "12px",
        color: copied ? "var(--green)" : "var(--text-secondary)",
        cursor: "pointer", transition: "color 0.15s",
      }}
    >
      {copied ? "copied!" : display}
    </span>
  );
}

// ── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ label }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "4px 0" }}>
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
      {label && <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>}
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function Empty({ icon, title, description }: { icon: string; title: string; description?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
      <div style={{ fontSize: "32px", marginBottom: "12px" }}>{icon}</div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>{title}</div>
      {description && <div style={{ fontSize: "12px" }}>{description}</div>}
    </div>
  );
}

// ── Toast notification ───────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";

export function Toast({ message, type, onClose }: { message: string; type: ToastType; onClose: () => void }) {
  const colors = {
    success: { bg: "var(--green-glow)", border: "var(--green-border)", color: "var(--green)" },
    error:   { bg: "var(--red-glow)",   border: "var(--red-border)",   color: "var(--red)" },
    info:    { bg: "var(--amber-glow)", border: "var(--amber-border)", color: "var(--amber)" },
  };
  const c = colors[type];
  return (
    <div className="fade-in" style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 200,
      background: "var(--bg-elevated)", border: `1px solid ${c.border}`,
      borderRadius: "var(--radius)", padding: "12px 16px",
      display: "flex", alignItems: "center", gap: "10px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)", maxWidth: "360px",
    }}>
      <span style={{ color: c.color, fontSize: "16px" }}>
        {type === "success" ? "✓" : type === "error" ? "✕" : "◆"}
      </span>
      <span style={{ fontSize: "13px", flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>×</button>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const show = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  const ToastEl = toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null;
  return { show, ToastEl };
}
