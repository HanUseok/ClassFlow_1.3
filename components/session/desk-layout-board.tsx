"use client"

import type { Session, Student } from "@/lib/mock-data"

type DebateGroup = NonNullable<NonNullable<Session["debate"]>["groups"]>[number]
type Side = "affirmative" | "negative" | "moderator"

type SeatDragPayload = {
  kind: "seat"
  groupIndex: number
  side: Side
  index: number
}

type PoolDragPayload = {
  kind: "pool"
  studentId: string
}

type SeatConfig = {
  affirmative: number
  negative: number
  moderator: number
}

type DeskLayoutBoardProps = {
  groups: DebateGroup[]
  poolStudents?: Student[]
  seatConfigByGroup?: SeatConfig[]
  startGroupNumber?: number
  onChange: (groups: DebateGroup[]) => void
}

function getSeatStudent(group: DebateGroup, side: Side, index: number) {
  if (side === "affirmative") return group.affirmative[index] ?? null
  if (side === "negative") return group.negative[index] ?? null
  return index === 0 ? group.moderator ?? null : null
}

function clearStudentEverywhere(groups: DebateGroup[], studentId: string) {
  return groups.map((group) => ({
    ...group,
    affirmative: group.affirmative.filter((student) => student.id !== studentId),
    negative: group.negative.filter((student) => student.id !== studentId),
    moderator: group.moderator?.id === studentId ? undefined : group.moderator,
  }))
}

function placeStudent(group: DebateGroup, side: Side, index: number, student: Student | null): DebateGroup {
  if (side === "affirmative") {
    const next = [...group.affirmative]
    while (next.length <= index) next.push(undefined as unknown as Student)
    if (student) next[index] = student
    else if (index >= 0 && index < next.length) next.splice(index, 1)
    return { ...group, affirmative: next.filter(Boolean) }
  }

  if (side === "negative") {
    const next = [...group.negative]
    while (next.length <= index) next.push(undefined as unknown as Student)
    if (student) next[index] = student
    else if (index >= 0 && index < next.length) next.splice(index, 1)
    return { ...group, negative: next.filter(Boolean) }
  }

  return {
    ...group,
    moderator: index === 0 ? student ?? undefined : group.moderator,
  }
}

export function DeskLayoutBoard({ groups, poolStudents = [], seatConfigByGroup, startGroupNumber = 1, onChange }: DeskLayoutBoardProps) {
  const poolMap = new Map(poolStudents.map((student) => [student.id, student]))

  const handleSeatDrop = (raw: string, to: { groupIndex: number; side: Side; index: number }) => {
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as SeatDragPayload | PoolDragPayload
      const next = [...groups]

      if (parsed.kind === "pool") {
        const fromPool = poolMap.get(parsed.studentId)
        if (!fromPool) return

        const cleared = clearStudentEverywhere(next, fromPool.id)
        const targetGroup = cleared[to.groupIndex]
        if (!targetGroup) return
        cleared[to.groupIndex] = placeStudent(targetGroup, to.side, to.index, fromPool)
        onChange(cleared)
        return
      }

      const from = parsed
      const sourceGroup = next[from.groupIndex]
      const targetGroup = next[to.groupIndex]
      if (!sourceGroup || !targetGroup) return

      const sourceStudent = getSeatStudent(sourceGroup, from.side, from.index)
      const targetStudent = getSeatStudent(targetGroup, to.side, to.index)
      if (!sourceStudent) return

      next[from.groupIndex] = placeStudent(sourceGroup, from.side, from.index, targetStudent)
      next[to.groupIndex] = placeStudent(targetGroup, to.side, to.index, sourceStudent)
      onChange(next)
    } catch {
      // ignore malformed payload
    }
  }

  return (
    <div className="grid gap-3">
      {groups.map((group, groupIndex) => {
        const config = seatConfigByGroup?.[groupIndex] ?? {
          affirmative: Math.max(1, group.affirmative.length),
          negative: Math.max(1, group.negative.length),
          moderator: 1,
        }

        const renderSeat = (side: Side, index: number, seatClassName?: string) => {
          const student = getSeatStudent(group, side, index)
          return (
            <div
              key={`${group.id}-${side}-${index}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleSeatDrop(event.dataTransfer.getData("application/json"), { groupIndex, side, index })}
              className={`w-28 min-h-12 rounded-xl border border-dashed border-border bg-muted/30 px-2 py-2 ${seatClassName ?? ""}`}
            >
              {student ? (
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    const payload: SeatDragPayload = { kind: "seat", groupIndex, side, index }
                    event.dataTransfer.setData("application/json", JSON.stringify(payload))
                  }}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1 text-center text-xs"
                >
                  {student.name}
                </button>
              ) : (
                <p className="pt-1 text-center text-[11px] text-muted-foreground">빈 좌석</p>
              )}
            </div>
          )
        }

        return (
          <div key={group.id} className="rounded-xl border border-border bg-card p-3">
            <p className="mb-2 text-sm font-semibold text-foreground">{startGroupNumber + groupIndex}조 배치도</p>

            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="mb-2 text-[11px] text-muted-foreground">반대측 책상</p>
              <div className={`grid gap-3 ${config.moderator > 0 ? "md:grid-cols-[3fr_1.4fr]" : "grid-cols-1"}`}>
                <div className="flex flex-wrap justify-center gap-3">
                  {Array.from({ length: Math.max(1, config.negative) }, (_, index) => renderSeat("negative", index))}
                </div>
                {config.moderator > 0 ? (
                  <div aria-hidden className="hidden rounded-xl border border-transparent bg-transparent md:block" />
                ) : null}
              </div>

              <div className={`my-4 grid gap-3 ${config.moderator > 0 ? "md:grid-cols-[3fr_1.4fr]" : "grid-cols-1"}`}>
                <div className="rounded-2xl border border-border bg-background px-2 py-10 text-center text-xs text-muted-foreground min-h-[124px] flex items-center justify-center">
                  토론 테이블
                </div>
                {config.moderator > 0 ? (
                  <div className="min-h-[124px]">
                    <div className="flex flex-wrap justify-center gap-3">
                      {Array.from({ length: Math.max(1, config.moderator) }, (_, index) =>
                        renderSeat("moderator", index, "min-h-[124px] flex items-center justify-center"),
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <p className="mb-2 text-[11px] text-muted-foreground">찬성측 책상</p>
              <div className={`grid gap-3 ${config.moderator > 0 ? "md:grid-cols-[3fr_1.4fr]" : "grid-cols-1"}`}>
                <div className="flex flex-wrap justify-center gap-3">
                  {Array.from({ length: Math.max(1, config.affirmative) }, (_, index) => renderSeat("affirmative", index))}
                </div>
                {config.moderator > 0 ? (
                  <div aria-hidden className="hidden rounded-xl border border-transparent bg-transparent md:block" />
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
