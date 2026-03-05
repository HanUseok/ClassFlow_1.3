"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { WaitingScreen } from "@/components/station/waiting-screen"
import { LiveDebateScreen } from "@/components/station/live-debate-screen"
import { QuickAddScreen } from "@/components/station/quick-add-screen"
import { DeskLayoutBoard } from "@/components/session/desk-layout-board"
import { Button } from "@/components/ui/button"
import { useMockSessions } from "@/hooks/use-mock-sessions"
import { useSessionFlow } from "@/hooks/use-session-flow"
import { listStudents } from "@/lib/application/roster-service"
import { buildReportPayload, buildFreeModeImaginedLogs } from "@/lib/domain/session"
import type { Student } from "@/lib/mock-data"

type StationState = "landing" | "identity" | "group" | "waiting" | "live"
const PHASE_KEYS = ["Opening", "Rebuttal", "Rerebuttal", "FinalSummary"] as const
type PhaseKey = (typeof PHASE_KEYS)[number]
const STATION_FLOW_ID = "station-default-flow"
const STATION_GROUP_COUNT = 2

export default function StationPage() {
  const router = useRouter()
  const [state, setState] = useState<StationState>("landing")
  const [selectedStudentId, setSelectedStudentId] = useState<string>("")
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0)
  const [isAutoFilling, setIsAutoFilling] = useState(false)
  const [participantStartStatus, setParticipantStartStatus] = useState<"idle" | "requesting" | "ready" | "running">("idle")
  const [participantCompletedSpeeches, setParticipantCompletedSpeeches] = useState(0)
  const { sessions, hydrated, setStatus, setDebateGroups } = useMockSessions()
  const [orderedMembers, setOrderedMembers] = useState<{ id: string; name: string; roleLabel: string }[]>([])
  const [stationGroups, setStationGroups] = useState<NonNullable<NonNullable<NonNullable<(typeof sessions)[number]["debate"]>["groups"]>>>([])
  const autoFillTimersRef = useRef<number[]>([])
  const participantRequestTimerRef = useRef<number | null>(null)
  const participantReportRedirectedRef = useRef(false)
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
    const primaryGroup = stationGroups[selectedGroupIndex]
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
  }, [stationGroups, selectedGroupIndex])

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
    setSelectedGroupIndex((prev) => Math.max(0, Math.min(prev, groups.length - 1)))
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

  const selectedStudent = useMemo(
    () => placementCandidates.find((student) => student.id === selectedStudentId),
    [placementCandidates, selectedStudentId]
  )
  const selectedMemberIndex = useMemo(
    () => orderedMembers.findIndex((member) => member.id === selectedStudentId),
    [orderedMembers, selectedStudentId]
  )

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

  const currentPlacementGroupIndex = Math.min(selectedGroupIndex, Math.max(0, stationGroups.length - 1))
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

  const currentPlacementGroup = stationGroups[currentPlacementGroupIndex]
  const isCurrentUserModerator = Boolean(selectedStudentId && currentPlacementGroup?.moderator?.id === selectedStudentId)
  const isCurrentSpeakerSelf = Boolean(selectedStudentId && orderedMembers[currentSpeakerIndex]?.id === selectedStudentId)
  const participantSpeakerIndex =
    debateMode === "Free" && !isCurrentUserModerator && selectedMemberIndex >= 0 ? selectedMemberIndex : currentSpeakerIndex
  const isParticipantRecordingEnabled = useMemo(() => {
    const configured = activeDebate?.debate?.assignmentConfig?.recordingStudentIds
    if (!configured || configured.length === 0) return true
    return configured.includes(selectedStudentId)
  }, [activeDebate?.debate?.assignmentConfig?.recordingStudentIds, selectedStudentId])
  const isSelectedStudentPlacedInCurrentGroup = Boolean(
    selectedStudent &&
      currentPlacementGroup &&
      (currentPlacementGroup.affirmative.some((student) => student.id === selectedStudent.id) ||
        currentPlacementGroup.negative.some((student) => student.id === selectedStudent.id) ||
        currentPlacementGroup.moderator?.id === selectedStudent.id)
  )
  const selfPlacementPool = selectedStudent && !isSelectedStudentPlacedInCurrentGroup ? [selectedStudent] : []
  const isDebateFinished = flow.isDebateFinished(STATION_FLOW_ID, orderedMembers.length, debateMode)

  const goLiveFromWaiting = (groupsOverride?: typeof stationGroups) => {
    if (!activeDebate) return
    setDebateGroups(activeDebate.id, groupsOverride ?? stationGroups)
    setState("live")
  }

  useEffect(() => {
    setIsAutoFilling(false)
    setParticipantStartStatus("idle")
    setParticipantCompletedSpeeches(0)
    participantReportRedirectedRef.current = false
    autoFillTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    autoFillTimersRef.current = []
    if (participantRequestTimerRef.current) {
      window.clearTimeout(participantRequestTimerRef.current)
      participantRequestTimerRef.current = null
    }
  }, [activeDebate?.id])

  useEffect(() => {
    return () => {
      autoFillTimersRef.current.forEach((timer) => window.clearTimeout(timer))
      autoFillTimersRef.current = []
      if (participantRequestTimerRef.current) {
        window.clearTimeout(participantRequestTimerRef.current)
        participantRequestTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    setParticipantCompletedSpeeches(0)
  }, [selectedStudentId])

  useEffect(() => {
    if (isCurrentUserModerator) return
    if (!isSpeechRunning && participantStartStatus === "running") {
      setParticipantStartStatus("idle")
    }
  }, [isSpeechRunning, participantStartStatus, isCurrentUserModerator])

  useEffect(() => {
    if (state !== "live") return
    if (isCurrentUserModerator) return
    if (debateMode !== "Ordered") return
    if (isCurrentSpeakerSelf) return
    if (orderedMembers.length <= 0) return

    const timer = window.setTimeout(() => {
      flow.handleEndSpeech(STATION_FLOW_ID, orderedMembers.length, debateMode)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [state, isCurrentUserModerator, debateMode, isCurrentSpeakerSelf, orderedMembers.length, flow])

  useEffect(() => {
    if (state !== "live") return
    if (isCurrentUserModerator) return
    if (!activeDebate) return
    const orderedFinished = debateMode === "Ordered" && isDebateFinished
    const freeReachedLimit = debateMode === "Free" && participantCompletedSpeeches >= 3
    const shouldRedirect = activeDebate.status === "Ended" || orderedFinished || freeReachedLimit
    if (!shouldRedirect) return
    if (participantReportRedirectedRef.current) return

    if (orderedFinished && activeDebate.status !== "Ended") {
      setStatus(activeDebate.id, "Ended")
    }
    const participantName =
      selectedStudent?.name ||
      orderedMembers.find((member) => member.id === selectedStudentId)?.name ||
      "참여자"
    const reportPath = buildReportPayload({
      names: [participantName],
      round: 1,
      phase: debateMode === "Free" ? "자유토론" : "마무리",
      logs: [],
      sessionId: activeDebate.id,
      teacherGuided: activeDebate.debate?.teacherGuided ?? false,
      sessionTitle: `${activeDebate.title} - 개인 점검`,
      sessionStatus: "Ended",
      groupCount: 1,
      groupLayout: JSON.stringify([
        {
          affirmative: [],
          negative: [],
        },
      ]),
    })
    participantReportRedirectedRef.current = true
    router.push(`${reportPath}&source=station`)
  }, [state, isCurrentUserModerator, activeDebate, selectedStudent, orderedMembers, selectedStudentId, debateMode, isDebateFinished, participantCompletedSpeeches, router, setStatus])

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
              <p className="text-xs text-muted-foreground">
                {isAutoFilling ? "다른 좌석을 자동으로 배치 중입니다..." : `${currentPlacementGroupNumber}조에서 내 자리를 배치하세요.`}
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-3">
              <p className="mb-2 text-xs font-semibold text-amber-800">내 이름 카드</p>
              {selectedStudent ? (
                <button
                  key={selectedStudent.id}
                  type="button"
                  draggable={!isAutoFilling}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/json", JSON.stringify({ kind: "pool", studentId: selectedStudent.id }))
                  }}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs disabled:opacity-50"
                  disabled={isAutoFilling || isSelectedStudentPlacedInCurrentGroup}
                >
                  {selectedStudent.name}
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">이름 선택으로 돌아가서 학생을 선택하세요.</span>
              )}
            </div>

            <DeskLayoutBoard
              groups={deskPlacementGroups}
              poolStudents={selfPlacementPool}
              seatConfigByGroup={placementSeatConfig}
              startGroupNumber={currentPlacementGroupNumber}
              onChange={(nextGroups) => {
                if (isAutoFilling) return
                const merged = [...stationGroups]
                const nextGroup = nextGroups[0]
                if (!nextGroup) return

                const wasPlaced = Boolean(
                  selectedStudent &&
                    currentPlacementGroup &&
                    (currentPlacementGroup.affirmative.some((student) => student.id === selectedStudent.id) ||
                      currentPlacementGroup.negative.some((student) => student.id === selectedStudent.id) ||
                      currentPlacementGroup.moderator?.id === selectedStudent.id)
                )

                const nowPlaced = Boolean(
                  selectedStudent &&
                    (nextGroup.affirmative.some((student) => student.id === selectedStudent.id) ||
                      nextGroup.negative.some((student) => student.id === selectedStudent.id) ||
                      nextGroup.moderator?.id === selectedStudent.id)
                )

                merged[currentPlacementGroupIndex] = nextGroup
                setStationGroups(merged)

                if (!wasPlaced && nowPlaced) {
                  const seatCfg = placementSeatConfig[0] ?? { affirmative: 2, negative: 2, moderator: 1 }
                  const assignedIds = new Set(
                    merged.flatMap((group, index) =>
                      index === currentPlacementGroupIndex
                        ? []
                        : [
                            ...group.affirmative.map((student) => student.id),
                            ...group.negative.map((student) => student.id),
                            ...(group.moderator ? [group.moderator.id] : []),
                          ]
                    )
                  )
                  const currentIds = new Set([
                    ...nextGroup.affirmative.map((student) => student.id),
                    ...nextGroup.negative.map((student) => student.id),
                    ...(nextGroup.moderator ? [nextGroup.moderator.id] : []),
                  ])
                  const autoFillCandidates = placementCandidates.filter(
                    (student) => !assignedIds.has(student.id) && !currentIds.has(student.id)
                  )

                  const steps: Array<{ side: "affirmative" | "negative" | "moderator"; student: Student }> = []
                  let cursor = 0
                  const pick = () => {
                    const picked = autoFillCandidates[cursor]
                    cursor += 1
                    return picked
                  }
                  for (let i = nextGroup.affirmative.length; i < seatCfg.affirmative; i += 1) {
                    const picked = pick()
                    if (!picked) break
                    steps.push({ side: "affirmative", student: picked })
                  }
                  for (let i = nextGroup.negative.length; i < seatCfg.negative; i += 1) {
                    const picked = pick()
                    if (!picked) break
                    steps.push({ side: "negative", student: picked })
                  }
                  if (seatCfg.moderator > 0 && !nextGroup.moderator) {
                    const picked = pick()
                    if (picked) steps.push({ side: "moderator", student: picked })
                  }

                  if (steps.length === 0) {
                    goLiveFromWaiting(merged)
                    return
                  }

                  setIsAutoFilling(true)
                  const intervalMs = 900
                  const finalMerged = [...merged]
                  const finalGroup = { ...nextGroup, affirmative: [...nextGroup.affirmative], negative: [...nextGroup.negative] }

                  autoFillTimersRef.current.forEach((timer) => window.clearTimeout(timer))
                  autoFillTimersRef.current = []

                  steps.forEach((step, stepIndex) => {
                    const timer = window.setTimeout(() => {
                      setStationGroups((prev) => {
                        const next = [...prev]
                        const target = next[currentPlacementGroupIndex]
                        if (!target) return prev
                        if (step.side === "affirmative") {
                          next[currentPlacementGroupIndex] = { ...target, affirmative: [...target.affirmative, step.student] }
                        } else if (step.side === "negative") {
                          next[currentPlacementGroupIndex] = { ...target, negative: [...target.negative, step.student] }
                        } else {
                          next[currentPlacementGroupIndex] = { ...target, moderator: step.student }
                        }
                        return next
                      })
                    }, (stepIndex + 1) * intervalMs)
                    autoFillTimersRef.current.push(timer)

                    if (step.side === "affirmative") finalGroup.affirmative.push(step.student)
                    else if (step.side === "negative") finalGroup.negative.push(step.student)
                    else finalGroup.moderator = step.student
                  })

                  finalMerged[currentPlacementGroupIndex] = finalGroup
                  const completeTimer = window.setTimeout(() => {
                    setIsAutoFilling(false)
                    goLiveFromWaiting(finalMerged)
                  }, (steps.length + 1) * intervalMs)
                  autoFillTimersRef.current.push(completeTimer)
                }
              }}
            />
          </div>
        </div>
      ) : null}

      {state === "landing" && (
        <WaitingScreen
          onJoin={() => setState("identity")}
          sessionInfo={{
            topic: activeDebate.topic ?? "No topic",
            teacherName: "Teacher",
            createdAt: `${activeDebate.date}T09:00:00`,
            memberCount: orderedMembers.length,
            hasSpeakingOrder: orderedMembers.length > 0,
          }}
        />
      )}

      {state === "identity" ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">이름 선택</p>
          <p className="mt-1 text-xs text-muted-foreground">입장할 학생 이름을 선택하세요.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {placementCandidates.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => setSelectedStudentId(student.id)}
                className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                  selectedStudentId === student.id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-foreground hover:bg-accent"
                }`}
              >
                {student.name}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setState("landing")}>
              이전
            </Button>
            <Button disabled={!selectedStudentId} onClick={() => setState("group")}>
              다음
            </Button>
          </div>
        </div>
      ) : null}

      {state === "group" ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">조 선택</p>
          <p className="mt-1 text-xs text-muted-foreground">조 배치 상태를 보고 참가할 조를 선택하세요.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {placementStatus.map((status, index) => (
              <button
                key={status.groupId}
                type="button"
                onClick={() => {
                  setSelectedGroupIndex(index)
                  setState("waiting")
                }}
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  index === currentPlacementGroupIndex ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-accent"
                }`}
              >
                <p className="text-sm font-medium text-foreground">{status.label}</p>
                <p className="text-xs text-muted-foreground">
                  {status.placedTotal}/{status.requiredTotal} 배치
                </p>
                <p className={`mt-1 text-xs font-semibold ${status.done ? "text-emerald-600" : "text-amber-600"}`}>
                  {status.done ? "완료" : "진행 중"}
                </p>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setState("identity")}>
              이전
            </Button>
          </div>
        </div>
      ) : null}

      {state === "live" && (
        <div className="flex flex-col gap-4">
          <LiveDebateScreen
            round={1}
            phase={currentPhase}
            durationSeconds={120}
            isSpeechRunning={isSpeechRunning}
            debateMode={debateMode}
            teamMembers={orderedMembers}
            currentSpeakerIndex={participantSpeakerIndex}
            onEndDebate={handleEndDebate}
            onMoveOrderTo={moveOrderTo}
            onSelectSpeaker={handleSelectSpeaker}
            onPhaseChange={handlePhaseChange}
            interactionDisabled={!isCurrentUserModerator}
          />
          <QuickAddScreen
            round={1}
            phase={currentPhase}
            durationSeconds={120}
            recordLimitPerRound={6}
            debateMode={debateMode}
            teamMembers={orderedMembers}
            currentSpeaker={orderedMembers[participantSpeakerIndex]}
            onStartSpeech={() => {
              if (isCurrentUserModerator) {
                flow.setSpeechRunning(STATION_FLOW_ID, true)
                return
              }
              if (debateMode === "Ordered") {
                if (!isCurrentSpeakerSelf) return
                flow.setSpeechRunning(STATION_FLOW_ID, true)
                setParticipantStartStatus("running")
                return
              }
              if (participantStartStatus === "idle") {
                if (selectedMemberIndex >= 0) {
                  flow.setGroupSpeakerIndex(STATION_FLOW_ID, selectedMemberIndex)
                }
                setParticipantStartStatus("requesting")
                participantRequestTimerRef.current = window.setTimeout(() => {
                  setParticipantStartStatus("ready")
                  participantRequestTimerRef.current = null
                }, 3000)
                return
              }

              if (participantStartStatus === "ready") {
                if (selectedMemberIndex >= 0) {
                  flow.setGroupSpeakerIndex(STATION_FLOW_ID, selectedMemberIndex)
                }
                flow.setSpeechRunning(STATION_FLOW_ID, true)
                setParticipantStartStatus("running")
              }
            }}
            onEndSpeech={() => {
              if (isCurrentUserModerator) {
                flow.handleEndSpeech(STATION_FLOW_ID, orderedMembers.length, debateMode)
                return
              }
              if (participantStartStatus !== "running") return
              if (debateMode === "Free") {
                flow.setSpeechRunning(STATION_FLOW_ID, false)
                setParticipantStartStatus("idle")
                setParticipantCompletedSpeeches((prev) => prev + 1)
                return
              }
              flow.handleEndSpeech(STATION_FLOW_ID, orderedMembers.length, debateMode)
              setParticipantStartStatus("idle")
            }}
            debateFinished={isDebateFinished}
            compact
            startOnlyMode={!isCurrentUserModerator}
            speechRunning={isCurrentUserModerator ? isSpeechRunning : participantStartStatus === "running"}
            startOnlyStatus={isCurrentUserModerator ? "idle" : participantStartStatus}
            participantCanStart={isCurrentUserModerator ? true : debateMode === "Free" ? true : isCurrentSpeakerSelf}
            participantUseRequestFlow={!isCurrentUserModerator && debateMode === "Free"}
            participantRecordingEnabled={isParticipantRecordingEnabled}
            showCards={!isCurrentUserModerator && !isParticipantRecordingEnabled}
          />
        </div>
      )}
    </div>
  )
}

