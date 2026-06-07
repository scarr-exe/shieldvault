import { useState } from "react";
import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { ADDRESSES, VAULT_ABI } from "../config/contracts";
import { Card, Button, Input, Badge, Addr, Modal, Empty, useToast } from "../components/ui";

export function ContributorsPage() {
  const { address } = useAccount();
  const { show, ToastEl } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [newAddr, setNewAddr] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [addrError, setAddrError] = useState("");

  const { data: admin } = useReadContract({ address: ADDRESSES.vault, abi: VAULT_ABI, functionName: "admin" });
  const { data: contributors, refetch } = useReadContract({ address: ADDRESSES.vault, abi: VAULT_ABI, functionName: "getContributors" });

  const isAdmin = address?.toLowerCase() === admin?.toLowerCase();

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: txLoading } = useWaitForTransactionReceipt({ hash: txHash });
  const isSubmitting = isPending || txLoading;

  const validateAddr = (val: string) => {
    if (!val.startsWith("0x") || val.length !== 42) return "Invalid Ethereum address";
    return "";
  };

  const handleAdd = () => {
    const err = validateAddr(newAddr);
    if (err) { setAddrError(err); return; }
    if (!newLabel.trim()) { setAddrError("Label is required"); return; }

    writeContract({
      address: ADDRESSES.vault,
      abi: VAULT_ABI,
      functionName: "addContributor",
      args: [newAddr as `0x${string}`, newLabel],
    }, {
      onSuccess: () => {
        show(`${newLabel} added as contributor`, "success");
        setAddOpen(false);
        setNewAddr("");
        setNewLabel("");
        setTimeout(() => refetch(), 2000);
      },
      onError: (e) => show(e.message.slice(0, 80), "error"),
    });
  };

  const handleRemove = (addr: string, label: string) => {
    if (!confirm(`Remove ${label || addr} from contributors?`)) return;
    writeContract({
      address: ADDRESSES.vault,
      abi: VAULT_ABI,
      functionName: "removeContributor",
      args: [addr as `0x${string}`],
    }, {
      onSuccess: () => {
        show("Contributor removed", "success");
        setTimeout(() => refetch(), 2000);
      },
      onError: (e) => show(e.message.slice(0, 80), "error"),
    });
  };

  return (
    <div style={{ maxWidth: "700px" }}>
      {ToastEl}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "15px" }}>Contributors</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            {contributors?.length ?? 0} registered
          </div>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={() => setAddOpen(true)} size="sm">
            + Add Contributor
          </Button>
        )}
      </div>

      {/* Admin notice */}
      {!isAdmin && (
        <div style={{
          background: "var(--amber-glow)", border: "1px solid var(--amber-border)",
          borderRadius: "var(--radius)", padding: "10px 14px",
          fontSize: "12px", color: "var(--amber)", marginBottom: "16px",
        }}>
          You are not the vault admin — viewing read-only
        </div>
      )}

      {/* Contributor table */}
      <Card>
        {/* Table header */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 100px",
          padding: "10px 20px", borderBottom: "1px solid var(--border)",
          fontSize: "10px", color: "var(--text-muted)",
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          <span>Label / Role</span>
          <span>Address</span>
          {isAdmin && <span style={{ textAlign: "right" }}>Action</span>}
        </div>

        {/* Rows */}
        {!contributors || contributors.length === 0 ? (
          <Empty icon="◈" title="No contributors yet" description="Add contributors to enable confidential payments" />
        ) : (
          contributors.map(addr => (
            <ContributorRow
              key={addr}
              address={addr}
              isAdmin={isAdmin}
              onRemove={handleRemove}
              isSubmitting={isSubmitting}
            />
          ))
        )}
      </Card>

      {/* Add contributor modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setAddrError(""); }} title="Add Contributor">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Input
            label="Wallet Address"
            placeholder="0x..."
            value={newAddr}
            onChange={e => { setNewAddr(e.target.value); setAddrError(""); }}
            error={addrError}
            mono
          />
          <Input
            label="Label / Role"
            placeholder="e.g. Developer, Designer, Advisor"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
          />
          <div style={{ fontSize: "11px", color: "var(--text-muted)", padding: "8px 10px", background: "var(--bg-elevated)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
            Once added, this address can receive encrypted salary payments from the vault. The payment amount is never visible on-chain.
          </div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={isSubmitting} onClick={handleAdd}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ContributorRow({ address, isAdmin, onRemove, isSubmitting }: {
  address: string;
  isAdmin: boolean;
  onRemove: (a: string, l: string) => void;
  isSubmitting: boolean;
}) {
  const { data: label } = useReadContract({
    address: ADDRESSES.vault,
    abi: VAULT_ABI,
    functionName: "contributorLabel",
    args: [address as `0x${string}`],
  });

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr 100px",
      alignItems: "center", padding: "12px 20px",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{
          width: "28px", height: "28px", borderRadius: "2px",
          background: "var(--bg-elevated)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "11px", color: "var(--amber)", fontWeight: 700,
        }}>
          {(label ?? "?")[0]?.toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: "13px" }}>{label || "—"}</div>
          <Badge variant="neutral">contributor</Badge>
        </div>
      </div>

      <Addr address={address} />

      {isAdmin && (
        <div style={{ textAlign: "right" }}>
          <Button
            variant="danger"
            size="sm"
            loading={isSubmitting}
            onClick={() => onRemove(address, label || address)}
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
