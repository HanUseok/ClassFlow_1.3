"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { WaitingScreen } from "@/components/station/waiting-screen"
import { LiveDebateScreen } from "@/components/station/live-debate-screen"
import { QuickAddScreen } from "@/components/station/quick-add-screen"
import { DeskLayoutBoard } from "@/components/session/desk-layout-board"
import { useMockSessions } from "@/hooks/use-mock-sessions"
import { useSessionFlow } from "@/hooks/use-session-flow"
import { listStudents } from "@/lib/application/roster-service"
import { buildReportPayload, buildFreeModeImaginedLogs } from "@/lib/domain/session"

type StationState = "landing" | "waiting" | "live"
const PHASE_KEYS = ["Opening", "Rebuttal", "Rerebuttal", "FinalSummary"] as const
type PhaseKey = (typeof PHASE_KEYS)[number]
const STATION_FLOW_ID = "station-default-flow"
const STATION_GROUP_COUNT = 2
const STATION_TARGET_GROUP_INDEX = 1

export default function StationPage() {
  const router = useRouter()
  const [state, setState] = useState<StationState>("landing")
  const [placementCollapsed, setPlacementCollapsed] = useState(false)
  const [placementCollapsing, setPlacementCollapsing] = useState(false)
  const { sessions, hydrated, setStatus, setDebateGroups } = useMockSessions()
  const [orderedMembers, setOrderedMembers] = useState<{ id: string; name: string; roleLabel: string }[]>([])
  const [stationGroups, setStationGroups] = useState<NonNullable<NonNullable<NonNullable<(typeof sessions)[number]["debate"]>["groups"]>>>([])
  const flow = useSessionFlow()

  const activeDebate = useMemo(() => {
    const debateSessions = sessions.filter((session) => session.type === "Debate")
    if (debateSessions.length === 0) return undefined

    const pending = debateSessions.find((session) => session.status === "Pending")
    if (pending) return pending

    const live = debateSessions.find((session) => session.status === "Live")
    if (live) return live

    return [...debateSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  }, [sessions])

  const teamMembers = useMemo(() => {
    const primaryGroup = stationGroups[STATION_TARGET_GROUP_INDEX]
    const affirmative = primaryGroup?.affirmative ?? []
    const negative = primaryGroup?.negative ?? []
    const maxLength = Math.max(affirmative.length, negative.length)
    const merged: { id: string; name: string; roleLabel: string }[] = []

    for (let i = 0; i < maxLength; i += 1) {
      const a = affirmative[i]
      if (a) merged.push({ id: a.id, name: a.name, roleLabel: `찬성 ${i + 1}` })
      const n = negative[i]
      if (n) merged.push({ id: n.id, name: n.name, roleLabel: `반대 ${i + 1}` })
    }
    return merged
  }, [stationGroups])

  useEffect(() => {
    if (!activeDebate || activeDebate.type !== "Debate") {
      setStationGroups([])
      return
    }

    const storedGroups = activeDebate.debate?.groups ?? []
    const groups = Array.from({ length: STATION_GROUP_COUNT }, (_, index) => ({
      id: storedGroups[index]?.id ?? `group-${index + 1}`,
      affirmative: [],
      negative: [],
      moderator: undefined,
    }))
    setStationGroups(groups)
  }, [activeDebate?.id])

  useEffect(() => {
    setOrderedMembers(teamMembers)
    flow.resetGroup(STATION_FLOW_ID)
  }, [activeDebate?.id, teamMembers])

  const groupState = flow.getGroupState(STATION_FLOW_ID)
  const currentPhase: PhaseKey = groupState.phase
  const currentSpeakerIndex = groupState.currentSpeakerIndex
  const isSpeechRunning = groupState.isSpeechRunning
  const debateMode = activeDebate?.debate?.mode ?? "Ordered"
  // Station 대기실에서는 진행 방식과 무관하게 조배치(테이블 배치) 플로우를 항상 사용.
  const requiresDeskPlacement = true

  const placementCandidates = useMemo(() => {
    if (!activeDebate) return []
    const roster = listStudents().filter((student) => student.classId === activeDebate.classId)
    const selectedIds = activeDebate.debate?.assignmentConfig?.selectedStudentIds ?? []
    if (selectedIds.length > 0) {
      const selectedSet = new Set(selectedIds)
      return roster.filter((student) => selectedSet.has(student.id))
    }

    const fallbackIds = new Set<string>([
      ...(activeDebate.teams?.team1 ?? []).map((student) => student.id),
      ...(activeDebate.teams?.team2 ?? []).map((student) => student.id),
      ...(activeDebate.debate?.groups ?? []).flatMap((group) => [
        ...group.affirmative.map((student) => student.id),
        ...group.negative.map((student) => student.id),
        ...(group.moderator ? [group.moderator.id] : []),
      ]),
    ])
    if (fallbackIds.size > 0) {
      return roster.filter((student) => fallbackIds.has(student.id))
    }
    return roster
  }, [activeDebate])

  const unassignedPlacementStudents = useMemo(() => {
    const assigned = new Set(
      stationGroups.flatMap((group) => [
        ...group.affirmative.map((student) => student.id),
        ...group.negative.map((student) => student.id),
        ...(group.moderator ? [group.moderator.id] : []),
      ])
    )
    return placementCandidates.filter((student) => !assigned.has(student.id))
  }, [stationGroups, placementCandidates])

  const placementStatus = useMemo(() => {
    if (!activeDebate || activeDebate.type !== "Debate") return []
    return stationGroups.map((group, index) => {
      const requiredAff = 2
      const requiredNeg = 2
      const requiredMod = 1
      const requiredTotal = requiredAff + requiredNeg + requiredMod
      const placedTotal = group.affirmative.length + group.negative.length + (group.moderator ? 1 : 0)
      return {
        groupId: group.id,
        label: `${index + 1}조`,
        placedTotal,
        requiredTotal,
        done: requiredTotal === 0 ? placedTotal > 0 : placedTotal >= requiredTotal,
      }
    })
  }, [activeDebate, stationGroups])

  const currentPlacementGroupIndex = Math.min(STATION_TARGET_GROUP_INDEX, Math.max(0, stationGroups.length - 1))
  const currentPlacementGroupNumber = currentPlacementGroupIndex + 1

  const deskPlacementGroups = useMemo(() => {
    if (!requiresDeskPlacement) return stationGroups
    const current = stationGroups[currentPlacementGroupIndex]
    return current ? [current] : []
  }, [requiresDeskPlacement, stationGroups, currentPlacementGroupIndex])

  const placementSeatConfig = useMemo(() => {
    return deskPlacementGroups.map(() => ({
      affirmative: 2,
      negative: 2,
      moderator: 1,
    }))
  }, [deskPlacementGroups])

  const canStartFromDesk = deskPlacementGroups.every((group) => group.affirmative.length >= 1 && group.negative.length >= 1 && Boolean(group.moderator))
  const isDebateFinished = flow.isDebateFinished(STATION_FLOW_ID, orderedMembers.length, debateMode)

  const goLiveFromWaiting = () => {
    if (!activeDebate) return
    setDebateGroups(activeDebate.id, stationGroups)
    setState("live")
  }

  useEffect(() => {
    setPlacementCollapsed(false)
    setPlacementCollapsing(false)
  }, [activeDebate?.id])

  useEffect(() => {
    if (!activeDebate) return
    if (state !== "waiting") return
    if (!placementCollapsed) return
    const autoTimer = window.setTimeout(() => goLiveFromWaiting(), 5000)
    return () => window.clearTimeout(autoTimer)
  }, [placementCollapsed, activeDebate?.id, state])

  const moveOrderTo = (from: number, to: number) => {
    setOrderedMembers((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev
      const next = [...prev]
      const [picked] = next.splice(from, 1)
      next.splice(to, 0, picked)
      return next
    })
  }

  const handlePhaseChange = (nextPhase: string) => {
    const nextIndex = PHASE_KEYS.indexOf(nextPhase as PhaseKey)
    if (nextIndex < 0) return
    flow.setGroupPhase(STATION_FLOW_ID, PHASE_KEYS[nextIndex])
  }

  const handleSelectSpeaker = (index: number) => {
    if (index < 0 || index >= orderedMembers.length) return
    flow.setGroupSpeakerIndex(STATION_FLOW_ID, index)
  }

  const handleEndDebate = () => {
    if (!activeDebate) return
    flow.setSpeechRunning(STATION_FLOW_ID, false)
    setStatus(activeDebate.id, "Ended")

    const logs = debateMode === "Free" ? buildFreeModeImaginedLogs(orderedMembers) : []
    const reportPath = buildReportPayload({
      names: orderedMembers.map((member) => member.name),
      round: 1,
      phase: debateMode === "Free" ? "자유토론" : "마무리",
      logs,
      sessionId: activeDebate.id,
      teacherGuided: activeDebate.debate?.teacherGuided ?? false,
      sessionTitle: activeDebate.title,
      sessionStatus: "Ended",
      groupCount: 1,
      groupLayout: JSON.stringify([
        {
          affirmative: (activeDebate.teams?.team1 ?? []).map((student) => student.name),
          negative: (activeDebate.teams?.team2 ?? []).map((student) => student.name),
        },
      ]),
    })
    router.push(`${reportPath}&source=station`)
  }

  if (!hydrated) {
    return (
      <div className="w-full max-w-6xl rounded-lg border border-border p-6 text-sm text-muted-foreground">
        스테이션 불러오는 중...
      </div>
    )
  }

  if (!activeDebate) {
    return (
      <div className="w-full max-w-6xl rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        진행 가능한 토론 세션이 없습니다. Teacher에서 먼저 생성해 주세요.
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl">
      {state === "waiting" ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">세션 대기실</p>
              <p className="text-xs text-muted-foreground">{requiresDeskPlacement ? `${currentPlacementGroupNumber}조 배치 완료 후 다음 단계로 전환됩니다.` : "조배치 없이 5초 후 자동으로 시작됩니다."}</p>
            </div>
            {requiresDeskPlacement && !placementCollapsed ? (
              <button
                type="button"
                onClick={() => {
                  if (!canStartFromDesk) return
                  setPlacementCollapsing(true)
                  window.setTimeout(() => {
                    setPlacementCollapsed(true)
                    setPlacementCollapsing(false)
                  }, 220)
                }}
                disabled={!canStartFromDesk}
                className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                {currentPlacementGroupNumber}조 배치 완료
              </button>
            ) : null}
          </div>

          {requiresDeskPlacement && !placementCollapsed ? (
            <div
              className={`origin-right transition-all duration-200 ${
                placementCollapsing ? "translate-x-8 scale-[0.92] opacity-70" : "translate-x-0 scale-100 opacity-100"
              }`}
            >
              <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
                <DeskLayoutBoard
                  groups={deskPlacementGroups}
                  poolStudents={unassignedPlacementStudents}
                  seatConfigByGroup={placementSeatConfig}
                  startGroupNumber={currentPlacementGroupNumber}
                  onChange={(nextGroups) => {
                    const merged = [...stationGroups]
                    if (nextGroups[0]) merged[currentPlacementGroupIndex] = nextGroups[0]
                    setStationGroups(merged)
                  }}
                />
                <div
                  className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-3"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    const raw = event.dataTransfer.getData("application/json")
                    if (!raw) return
                    try {
                      const parsed = JSON.parse(raw) as { kind: "seat"; groupIndex: number; side: "affirmative" | "negative" | "moderator"; index: number }
                      if (parsed.kind !== "seat") return
                      const merged = [...stationGroups]
                      const targetIndex = currentPlacementGroupIndex
                      const target = merged[targetIndex]
                      if (!target) return
                      if (parsed.side === "affirmative") {
                        const nextAff = [...target.affirmative]
                        nextAff.splice(parsed.index, 1)
                        merged[targetIndex] = { ...target, affirmative: nextAff }
                      } else if (parsed.side === "negative") {
                        const nextNeg = [...target.negative]
                        nextNeg.splice(parsed.index, 1)
                        merged[targetIndex] = { ...target, negative: nextNeg }
                      } else if (parsed.side === "moderator" && parsed.index === 0) {
                        merged[targetIndex] = { ...target, moderator: undefined }
                      }
                      setStationGroups(merged)
                    } catch {
                      // ignore malformed payload
                    }
                  }}
                >
                  <p className="mb-2 text-sm font-semibold text-amber-800">미배치 인원 ({unassignedPlacementStudents.length}명)</p>
                  <div className="flex flex-wrap gap-2">
                    {unassignedPlacementStudents.length > 0 ? (
                      unassignedPlacementStudents.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData("application/json", JSON.stringify({ kind: "pool", studentId: student.id }))
                          }}
                          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs"
                        >
                          {student.name}
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">미배치 인원이 없습니다.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {placementStatus.map((status, index) => {
                  const done = placementCollapsed ? true : index === 0 ? true : status.done
                  const displayPlaced = index === 0 ? status.requiredTotal : status.placedTotal
                  return (
                    <div
                      key={status.groupId}
                      className={`origin-right flex min-h-[220px] flex-col justify-between rounded-lg px-3 py-2 transition-all duration-300 ${
                        done ? "border border-emerald-200 bg-emerald-50" : "border border-border"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{status.label} 배치 상태</p>
                        <p className="text-xs text-muted-foreground">
                          {displayPlaced}/{status.requiredTotal} 배치
                        </p>
                      </div>
                      <p className={`text-xs font-semibold ${done ? "text-emerald-600" : "text-amber-600"}`}>
                        {done ? "완료" : "진행 중"}
                      </p>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">5초 후 자동으로 진행 화면으로 이동합니다.</p>
            </div>
          )}
        </div>
      ) : null}

      {state === "landing" && (
        <WaitingScreen
          onJoin={() => setState("waiting")}
          sessionInfo={{
            topic: activeDebate.topic ?? "No topic",
            teacherName: "Teacher",
            createdAt: `${activeDebate.date}T09:00:00`,
            memberCount: orderedMembers.length,
            hasSpeakingOrder: orderedMembers.length > 0,
          }}
        />
      )}

      {state === "live" && (
        <div className="flex flex-col gap-4">
          <LiveDebateScreen
            round={1}
            phase={currentPhase}
            durationSeconds={120}
            isSpeechRunning={isSpeechRunning}
            debateMode={debateMode}
            teamMembers={orderedMembers}
            currentSpeakerIndex={currentSpeakerIndex}
            onEndDebate={handleEndDebate}
            onMoveOrderTo={moveOrderTo}
            onSelectSpeaker={handleSelectSpeaker}
            onPhaseChange={handlePhaseChange}
          />
          <QuickAddScreen
            round={1}
            phase={currentPhase}
            durationSeconds={120}
            recordLimitPerRound={6}
            debateMode={debateMode}
            teamMembers={orderedMembers}
            currentSpeaker={orderedMembers[currentSpeakerIndex]}
            onStartSpeech={() => {
              flow.setSpeechRunning(STATION_FLOW_ID, true)
            }}
            onEndSpeech={() => flow.handleEndSpeech(STATION_FLOW_ID, orderedMembers.length, debateMode)}
            debateFinished={isDebateFinished}
            compact
          />
        </div>
      )}
    </div>
  )
}

