import { Progress } from "@/components/ui/progress";
import type { TxProgressState } from "@/lib/genlayer";

interface TransactionStatusCardProps {
  status: TxProgressState;
}

function shortHash(hash: string): string {
  if (hash.length <= 16) {
    return hash;
  }
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export default function TransactionStatusCard({ status }: TransactionStatusCardProps) {
  if (status.stage === "idle") {
    return null;
  }

  const isError = status.stage === "error";
  const barClass = isError ? "[&>*]:bg-destructive" : "";

  return (
    <div
      className={`rounded-xl border p-4 ${
        isError
          ? "border-destructive/40 bg-destructive/5"
          : "border-border bg-card"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Transaction Status</p>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {status.stage}
        </span>
      </div>
      <Progress value={status.progress} className={`h-2 ${barClass}`} />
      <p className="mt-2 text-xs text-muted-foreground">{status.message}</p>
      {status.txHash && (
        <p className="mt-1 text-xs text-muted-foreground">
          Tx: <span className="font-mono">{shortHash(status.txHash)}</span>
        </p>
      )}
      {status.error && <p className="mt-1 text-xs text-destructive">{status.error}</p>}
    </div>
  );
}
