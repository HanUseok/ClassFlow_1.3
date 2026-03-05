"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { GripVertical } from "lucide-react"

interface LiveDebateScreenProps {
  round: number
  phase: string
  durationSeconds: number
  isSpeechRunning: boolean
  debateMode?: "Ordered" | "Free"
  teamMembers: { id: string; name: string; roleLabel?: string }[]
  currentSpeakerIndex: number
  onMoveOrderTo: (from: number, to: number) => void
  onSelectSpeaker?: (index: number) => void
  onPhaseChange?: (phase: string) => void
  onEndDebate?: () => void
  interactionDisabled?: boolean
}

const PHASE_TABS = [
  { key: "Opening", label: "\uC785\uB860" },
  { key: "Rebuttal", label: "\uBC18\uB860" },
  { key: "Rerebuttal", label: "\uC7AC\uBC18\uB860" },
  { key: "FinalSummary", label: "\uB9C8\uBB34\uB9AC" },
] as const

const PHASE_LABELS: Record<string, string> = Object.fromEntries(PHASE_TABS.map((p) => [p.key, p.label]))

export function LiveDebateScreen({
  round,
  phase,
  durationSeconds,
  isSpeechRunning,
  debateMode = "Ordered",
  teamMembers,
  currentSpeakerIndex,
  onMoveOrderTo,
  onSelectSpeaker,
  onPhaseChange,
  onEndDebate,
  interactionDisabled = false,
}: LiveDebateScreenProps) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds)
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null)

  useEffect(() => {
    setTimeLeft(durationSeconds)
  }, [durationSeconds, currentSpeakerIndex, phase])

  useEffect(() => {
    if (!isSpeechRunning || timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000)
    return () => clearInterval(timer)
  }, [isSpeechRunning, timeLeft])

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }, [])

  const teamBuckets = useMemo(() => {
    const mapped = teamMembers.map((member, index) => ({ member, index }))
    return {
      affirmative: mapped.filter(({ member }) => (member.roleLabel ?? "").includes("찬성")),
      negative: mapped.filter(({ member }) => (member.roleLabel ?? "").includes("반대")),
    }
  }, [teamMembers])

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-border bg-card p-3">
        {debateMode === "Free" ? (
          interactionDisabled ? null : (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">찬성</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {teamBuckets.affirmative.map(({ member, index }) => {
                    const active = index === currentSpeakerIndex
                    const base = active ? "border-emerald-500 bg-emerald-100 text-emerald-800" : "border-border bg-background text-foreground"
                    return (
                      <button key={member.id} type="button" onClick={() => onSelectSpeaker?.(index)} className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition hover:bg-accent ${base}`}>
                        {member.name}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">반대</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {teamBuckets.negative.map(({ member, index }) => {
                    const active = index === currentSpeakerIndex
                    const base = active ? "border-emerald-500 bg-emerald-100 text-emerald-800" : "border-border bg-background text-foreground"
                    return (
                      <button key={member.id} type="button" onClick={() => onSelectSpeaker?.(index)} className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition hover:bg-accent ${base}`}>
                        {member.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        ) : (
          <>
            <div className="mb-2">
              <p className="text-xs text-muted-foreground">{"\uD1A0\uB860 \uD750\uB984"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PHASE_TABS.map((tab) => {
                  const style =
                    tab.key === phase
                      ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                      : "border-border bg-background text-muted-foreground"

                  if (interactionDisabled) {
                    return (
                      <div key={tab.key} className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${style}`}>
                        {tab.label}
                      </div>
                    )
                  }

                  return (
                    <button key={tab.key} type="button" onClick={() => onPhaseChange?.(tab.key)} className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition hover:bg-accent ${style}`}>
                      {tab.label}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs font-medium text-foreground">{"\uD604\uC7AC \uB2E8\uACC4"}: {PHASE_LABELS[phase] ?? phase}</p>
            </div>

            <p className="text-xs text-muted-foreground">{interactionDisabled ? "\uBC1C\uC5B8 \uC21C\uC11C (\uC9C4\uD589 \uC0C1\uD0DC)" : "\uBC1C\uC5B8 \uC21C\uC11C (\uB4DC\uB798\uADF8\uB85C \uC870\uC815)"}</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {teamMembers.map((member, index) => {
                if (interactionDisabled) {
                  const statusTone =
                    index === currentSpeakerIndex
                      ? "border-emerald-500 bg-emerald-100"
                      : index < currentSpeakerIndex
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-border bg-background"
                  const statusText = index < currentSpeakerIndex ? "\uC644\uB8CC" : index === currentSpeakerIndex ? "\uC9C4\uD589\uC911" : "\uB300\uAE30"
                  return (
                    <div key={member.id} className={`flex min-w-[170px] items-center rounded-lg border px-3 py-2 ${statusTone}`}>
                      <div className="min-w-0">
                        <p className="truncate text-xs text-muted-foreground">
                          {index + 1}. {statusText}
                        </p>
                        <p className="truncate text-sm font-medium text-card-foreground">
                          {member.roleLabel ? `${member.roleLabel} ${member.name}` : member.name}
                        </p>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={member.id}
                    draggable
                    onDragStart={() => setDragFromIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragFromIndex === null) return
                      onMoveOrderTo(dragFromIndex, index)
                      setDragFromIndex(null)
                    }}
                    onDragEnd={() => setDragFromIndex(null)}
                    onClick={() => onSelectSpeaker?.(index)}
                    className={`flex min-w-[170px] cursor-grab items-center gap-2 rounded-lg border px-3 py-2 ${
                      index === currentSpeakerIndex ? "border-primary bg-primary/10" : "border-border bg-background"
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-xs text-muted-foreground">{index + 1}</p>
                      <p className="truncate text-sm font-medium text-card-foreground">
                        {member.roleLabel ? `${member.roleLabel} ${member.name}` : member.name}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {debateMode === "Free" ? "\uC790\uC720 \uD1A0\uB860" : PHASE_LABELS[phase] ?? phase}
        </p>
        <p className="mt-1 text-lg font-semibold text-card-foreground">
          {teamMembers[currentSpeakerIndex]
            ? `${teamMembers[currentSpeakerIndex].roleLabel ?? ""} ${teamMembers[currentSpeakerIndex].name}`.trim()
            : "-"}
        </p>
      </div>

      {debateMode === "Free" ? (
        interactionDisabled ? null : (
          <button type="button" onClick={() => onEndDebate?.()} className="w-full rounded-md bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700">
            {"\uD1A0\uB860 \uC885\uB8CC"}
          </button>
        )
      ) : (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">{"\uB77C\uC6B4\uB4DC"}</p>
            <p className="text-lg font-bold text-foreground">{round}</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">{"\uB2E8\uACC4"}</p>
            <p className="text-lg font-bold text-foreground">{PHASE_LABELS[phase] ?? phase}</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">{"\uD0C0\uC774\uBA38"}</p>
            <p className={`text-lg font-bold tabular-nums ${timeLeft <= 30 ? "text-destructive" : "text-foreground"}`}>
              {formatTime(timeLeft)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
