import { cn } from "@/lib/utils";

type Status = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "expired";

const styles: Record<Status, string> = {
  pending: "bg-orange-100 text-orange-700 border-orange-200",
  confirmed: "bg-purple-100 text-purple-700 border-purple-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  expired: "bg-slate-100 text-slate-700 border-slate-200",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const normalizedStatus = status.toLowerCase() as Status;
  
  return (
    <span className={cn(
      "px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider",
      styles[normalizedStatus] || "bg-gray-100 text-gray-700 border-gray-200",
      className
    )}>
      {status}
    </span>
  );
}
