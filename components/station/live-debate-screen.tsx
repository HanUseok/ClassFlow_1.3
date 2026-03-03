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
}

const PHASE_TABS = [
  { key: "Opening", label: "입론" },
  { key: "Rebuttal", label: "반론" },
  { key: "Rerebuttal", label: "재반론" },
  { key: "FinalSummary", label: "마무리" },
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
}: LiveDebateScreenProps) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds)
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null)

  useEffect(() => {
    setTimeLeft(durationSeconds)
  }, [durationSeconds, currentSpeakerIndex, phase])

  useEffect(() => {
    if (!isSpeechRunning || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)
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
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">찬성</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {teamBuckets.affirmative.map(({ member, index }) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onSelectSpeaker?.(index)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                      index === currentSpeakerIndex
                        ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                        : "border-border bg-background text-foreground hover:bg-accent"
                    }`}
                  >
                    {member.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">반대</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {teamBuckets.negative.map(({ member, index }) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onSelectSpeaker?.(index)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                      index === currentSpeakerIndex
                        ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                        : "border-border bg-background text-foreground hover:bg-accent"
                    }`}
                  >
                    {member.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-2">
              <p className="text-xs text-muted-foreground">토론 흐름</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PHASE_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onPhaseChange?.(tab.key)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                      phase === tab.key
                        ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs font-medium text-foreground">현재 순서: {PHASE_LABELS[phase] ?? phase}</p>
            </div>

            <p className="text-xs text-muted-foreground">발언 순서 (드래그로 조정)</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {teamMembers.map((member, index) => (
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
              ))}
            </div>
          </>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {debateMode === "Free" ? "자유토론" : PHASE_LABELS[phase] ?? phase}
        </p>
        <p className="mt-1 text-lg font-semibold text-card-foreground">
          {teamMembers[currentSpeakerIndex]
            ? `${teamMembers[currentSpeakerIndex].roleLabel ?? ""} ${teamMembers[currentSpeakerIndex].name}`.trim()
            : "-"}
        </p>
      </div>

      {debateMode === "Free" ? (
        <button
          type="button"
          onClick={() => onEndDebate?.()}
          className="w-full rounded-md bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
        >
          토론 종료
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">라운드</p>
            <p className="text-lg font-bold text-foreground">{round}</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">단계</p>
            <p className="text-lg font-bold text-foreground">{PHASE_LABELS[phase] ?? phase}</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">타이머</p>
            <p className={`text-lg font-bold tabular-nums ${timeLeft <= 30 ? "text-destructive" : "text-foreground"}`}>
              {formatTime(timeLeft)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
