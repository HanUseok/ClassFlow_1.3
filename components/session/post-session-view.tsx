"use client"

import { useState, useMemo } from "react"
import type { Session } from "@/lib/mock-data"
import { debateEvents } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle, XCircle, CheckCheck, Ban } from "lucide-react"

export function PostSessionView({ session }: { session: Session }) {
  const [filterStudent, setFilterStudent] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())

  const events = debateEvents.filter((e) => e.sessionId === session.id)

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filterStudent !== "all" && e.studentId !== filterStudent) return false
      if (filterType !== "all" && e.speechType !== filterType) return false
      return true
    })
  }, [events, filterStudent, filterType])

  const toggleSelect = (eventId: string) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      return next
    })
  }

  const grouped = useMemo(() => {
    const map = new Map<number, typeof filtered>()
    for (const evt of filtered) {
      if (!map.has(evt.round)) map.set(evt.round, [])
      map.get(evt.round)!.push(evt)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b)
  }, [filtered])

  const allStudents = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of events) {
      map.set(e.studentId, e.studentName)
    }
    return Array.from(map.entries())
  }, [events])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterStudent} onValueChange={setFilterStudent}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="전체 학생" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 학생</SelectItem>
            {allStudents.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="전체 유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            <SelectItem value="Claim">주장</SelectItem>
            <SelectItem value="Rebuttal">반박</SelectItem>
            <SelectItem value="Question">질문</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {grouped.length > 0 ? (
        <div className="flex flex-col gap-6">
          {grouped.map(([round, roundEvents]) => (
            <div key={round}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                {round}라운드
              </h3>
              <div className="flex flex-col gap-2">
                {roundEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border"
                      checked={selectedEvents.has(evt.id)}
                      onChange={() => toggleSelect(evt.id)}
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-card-foreground">
                          {evt.studentName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {evt.team === "Team 1" ? "1팀" : "2팀"}
                        </span>
                        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {evt.speechType === "Claim"
                            ? "주장"
                            : evt.speechType === "Rebuttal"
                              ? "반박"
                              : "질문"}
                        </span>
                      </div>
                      {evt.note && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {evt.note}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {evt.approved ? (
                        <CheckCircle className="h-4 w-4 text-chart-2" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">기록된 이벤트가 없습니다.</p>
        </div>
      )}

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-background py-4">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={selectedEvents.size === 0}
        >
          <Ban className="h-3.5 w-3.5" />
          선택 항목 무효화 ({selectedEvents.size})
        </Button>
        <Button size="sm" className="gap-2">
          <CheckCheck className="h-3.5 w-3.5" />
          전체 승인
        </Button>
      </div>
    </div>
  )
}
