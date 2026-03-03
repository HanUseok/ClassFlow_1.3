import { cn } from "@/lib/utils"
import type { SessionStatus, SessionType } from "@/lib/mock-data"

export function StatusBadge({ status }: { status: SessionStatus }) {
  const statusLabel =
    status === "Live" ? "진행 중" : status === "Ended" ? "종료" : "대기"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "Live" && "bg-chart-2/15 text-chart-2",
        status === "Ended" && "bg-muted text-muted-foreground",
        status === "Pending" && "bg-chart-4/15 text-chart-4"
      )}
    >
      {status === "Live" && (
        <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-chart-2" />
      )}
      {statusLabel}
    </span>
  )
}

export function TypeBadge({ type }: { type: SessionType }) {
  const typeLabel = type === "Debate" ? "토론" : "발표"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        type === "Debate" && "bg-chart-1/15 text-chart-1",
        type === "Presentation" && "bg-chart-3/15 text-chart-3"
      )}
    >
      {typeLabel}
    </span>
  )
}
