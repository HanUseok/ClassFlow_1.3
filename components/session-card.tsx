import Link from "next/link"
import type { Session } from "@/lib/mock-data"
import { StatusBadge, TypeBadge } from "@/components/status-badge"
import { CalendarDays } from "lucide-react"

export function SessionCard({ session }: { session: Session }) {
  return (
    <Link
      href={`/teacher/sessions/${session.id}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/20 hover:bg-accent/50"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-card-foreground group-hover:text-foreground">
          {session.title}
        </h3>
        <StatusBadge status={session.status} />
      </div>
      <div className="flex items-center gap-2">
        <TypeBadge type={session.type} />
        <span className="text-xs text-muted-foreground">{session.className}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>
          {new Date(session.date).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </Link>
  )
}
