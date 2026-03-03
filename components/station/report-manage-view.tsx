"use client"

import { useMemo, useState } from "react"
import { Pause, Play, Square } from "lucide-react"
import { Button } from "@/components/ui/button"

type PhaseKey = "입론" | "반론" | "재반론" | "마무리"
const PHASE_ORDER: PhaseKey[] = ["입론", "반론", "재반론", "마무리"]

type GroupState = {
  id: string
  affirmative: string[]
  negative: string[]
}

type Member = {
  roleLabel: string
  name: string
}

function splitIntoGroups(
  speakers: string[],
  desiredGroupCount?: number,
  presetGroups?: Array<{ affirmative?: string[]; negative?: string[] }>
) {
  if (presetGroups && presetGroups.length > 0) {
    return presetGroups
      .map((group, idx) => ({
        id: `group-${idx + 1}`,
        affirmative: (group.affirmative ?? []).map((name) => name.trim()).filter(Boolean),
        negative: (group.negative ?? []).map((name) => name.trim()).filter(Boolean),
      }))
      .filter((group) => group.affirmative.length > 0 || group.negative.length > 0)
  }

  const affirmative: string[] = []
  const negative: string[] = []
  const unlabeled: string[] = []

  speakers.forEach((raw) => {
    const speaker = raw.trim()
    if (!speaker) return
    const match = speaker.match(/^(찬성|반대)\s*(\d+)?\s*(.+)$/)
    if (!match) {
      unlabeled.push(speaker)
      return
    }
    const team = match[1]
    const name = match[3]?.trim() || speaker
    if (team === "찬성") affirmative.push(name)
    if (team === "반대") negative.push(name)
  })

  // If role labels are missing, assign speakers alternately to preserve usable rows.
  if (affirmative.length === 0 && negative.length === 0 && unlabeled.length > 0) {
    unlabeled.forEach((name, idx) => {
      if (idx % 2 === 0) affirmative.push(name)
      else negative.push(name)
    })
  }

  const inferredCount = Math.max(1, affirmative.length, negative.length)
  const groupCount = Math.max(1, desiredGroupCount ?? inferredCount)
  const groups = Array.from({ length: groupCount }, (_, idx) => ({
    id: `group-${idx + 1}`,
    affirmative: [] as string[],
    negative: [] as string[],
  }))

  affirmative.forEach((name, idx) => {
    groups[idx % groupCount].affirmative.push(name)
  })
  negative.forEach((name, idx) => {
    groups[idx % groupCount].negative.push(name)
  })

  // Avoid rendering trailing empty groups.
  return groups.filter((group) => group.affirmative.length > 0 || group.negative.length > 0)
}

function mergeGroupMembers(group: GroupState): Member[] {
  const maxLength = Math.max(group.affirmative.length, group.negative.length)
  const merged: Member[] = []
  for (let i = 0; i < maxLength; i += 1) {
    const a = group.affirmative[i]
    if (a) merged.push({ roleLabel: `찬성 ${i + 1}`, name: a })
    const n = group.negative[i]
    if (n) merged.push({ roleLabel: `반대 ${i + 1}`, name: n })
  }
  return merged
}

export function ReportManageView({
  phaseLabel,
  speakers,
  desiredGroupCount,
  presetGroups,
}: {
  phaseLabel: string
  speakers: string[]
  desiredGroupCount?: number
  presetGroups?: Array<{ affirmative?: string[]; negative?: string[] }>
}) {
  const groups = useMemo(() => splitIntoGroups(speakers, desiredGroupCount, presetGroups), [speakers, desiredGroupCount, presetGroups])
  const initialPhase: PhaseKey = PHASE_ORDER.includes(phaseLabel as PhaseKey) ? (phaseLabel as PhaseKey) : "입론"
  const [groupPhases, setGroupPhases] = useState<Record<string, PhaseKey>>(
    Object.fromEntries(groups.map((g) => [g.id, initialPhase]))
  )
  const [groupSpeakerIndex, setGroupSpeakerIndex] = useState<Record<string, number>>(Object.fromEntries(groups.map((g) => [g.id, 0])))
  const [groupSpeechRunning, setGroupSpeechRunning] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map((g) => [g.id, false]))
  )
  const [groupEnded, setGroupEnded] = useState<Record<string, boolean>>(Object.fromEntries(groups.map((g) => [g.id, true])))
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(Object.fromEntries(groups.map((g) => [g.id, false])))

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {groups.map((group, index) => {
          const teamMembers = mergeGroupMembers(group)
          const phase = groupPhases[group.id] ?? initialPhase
          const currentIndexRaw = groupSpeakerIndex[group.id] ?? 0
          const currentIndex = Math.min(currentIndexRaw, Math.max(0, teamMembers.length - 1))
          const phaseIndex = PHASE_ORDER.indexOf(phase)
          const isRunning = groupSpeechRunning[group.id] ?? false
          const isOpen = openGroups[group.id] ?? true
          const isEnded = groupEnded[group.id] ?? true
          const firstSpeaker = group.affirmative[0] ?? group.negative[0] ?? "-"

          const isFirstBoundary = phase === "입론" && currentIndex === 0
          const isLastBoundary = teamMembers.length > 0 && phase === "마무리" && currentIndex === teamMembers.length - 1
          const hasPrevSpeaker = teamMembers.length > 0 && !isFirstBoundary
          const hasNextSpeaker = teamMembers.length > 0 && !isLastBoundary
          const currentSpeakerLabel = teamMembers[currentIndex]
            ? `${teamMembers[currentIndex].roleLabel} ${teamMembers[currentIndex].name}`
            : "-"

          return (
            <div key={group.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-semibold text-card-foreground">{index + 1}조</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-card-foreground">{phase}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-card-foreground">{firstSpeaker}</span>
                <span className="text-muted-foreground">·</span>
                <span className={`font-medium ${isEnded ? "text-rose-600" : isRunning ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {isEnded ? "토론 종료" : isRunning ? "발언중" : "완료"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setOpenGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-card-foreground hover:bg-accent"
              >
                {isOpen ? `${index + 1}조 조정 닫기` : `${index + 1}조 조정 열기`}
              </button>

              {isOpen ? (
                <div className="mt-4 border-t border-border pt-4">
                  <h2 className="mb-3 text-sm font-medium text-card-foreground">{index + 1}조 상세 조정</h2>

                  <div className="rounded-lg border border-border p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">찬성</p>
                        <p className="mt-1 text-xl font-semibold text-foreground">{group.affirmative[0] ?? "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">반대</p>
                        <p className="mt-1 text-xl font-semibold text-foreground">{group.negative[0] ?? "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-border p-4 text-center">
                    <p className="text-sm text-muted-foreground">자유토론</p>
                    <p className="mt-2 text-4xl font-bold text-foreground">{currentSpeakerLabel}</p>
                  </div>

                  <Button
                    size="sm"
                    variant="destructive"
                    className="mt-4 w-full"
                    onClick={() => {
                      setGroupEnded((prev) => ({ ...prev, [group.id]: true }))
                      setGroupSpeechRunning((prev) => ({ ...prev, [group.id]: false }))
                    }}
                  >
                    토론 종료
                  </Button>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        const nextRunning = !isRunning
                        setGroupSpeechRunning((prev) => ({ ...prev, [group.id]: nextRunning }))
                        if (nextRunning) {
                          setGroupEnded((prev) => ({ ...prev, [group.id]: false }))
                        }
                      }}
                    >
                      {isRunning ? (
                        <>
                          <Pause className="h-4 w-4" />
                          일시정지
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          재개
                        </>
                      )}
                    </Button>
                    {hasPrevSpeaker ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (currentIndex > 0) {
                            setGroupSpeakerIndex((prev) => ({ ...prev, [group.id]: currentIndex - 1 }))
                            return
                          }
                          if (phaseIndex > 0) {
                            const prevPhase = PHASE_ORDER[phaseIndex - 1]
                            setGroupPhases((prev) => ({ ...prev, [group.id]: prevPhase }))
                            setGroupSpeakerIndex((prev) => ({ ...prev, [group.id]: Math.max(0, teamMembers.length - 1) }))
                          }
                        }}
                      >
                        이전 발언자
                      </Button>
                    ) : null}
                    {hasNextSpeaker ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (currentIndex < teamMembers.length - 1) {
                            setGroupSpeakerIndex((prev) => ({ ...prev, [group.id]: currentIndex + 1 }))
                            return
                          }
                          if (phaseIndex >= 0 && phaseIndex < PHASE_ORDER.length - 1) {
                            const nextPhase = PHASE_ORDER[phaseIndex + 1]
                            setGroupPhases((prev) => ({ ...prev, [group.id]: nextPhase }))
                            setGroupSpeakerIndex((prev) => ({ ...prev, [group.id]: 0 }))
                          }
                        }}
                      >
                        다음 발언자
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-2"
                      onClick={() => {
                        setGroupEnded((prev) => ({ ...prev, [group.id]: true }))
                        setGroupSpeechRunning((prev) => ({ ...prev, [group.id]: false }))
                      }}
                    >
                      <Square className="h-4 w-4" />
                      토론 종료
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
