import { STATUS_LABELS, ACOMODACAO_STATUS_LABELS, STATUS_VARIANT } from "@/utils/formatters";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, tipo = "hospedagem" }: { status: string; tipo?: "hospedagem" | "acomodacao" }) {
  const label =
    (tipo === "acomodacao" ? ACOMODACAO_STATUS_LABELS[status] : STATUS_LABELS[status]) ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_VARIANT[status] || "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
