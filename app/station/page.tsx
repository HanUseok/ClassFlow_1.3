"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { WaitingScreen } from "@/components/station/waiting-screen"
import { LiveDebateScreen } from "@/components/station/live-debate-screen"
import { QuickAddScreen } from "@/components/station/quick-add-screen"
import { DeskLayoutBoard } from "@/components/session/desk-layout-board"
import { Button } from "@/components/ui/button"
import { useMockSessions } from "@/hooks/use-mock-sessions"
import { useStationEntryFlow } from "@/hooks/station/use-station-entry-flow"
import { useStationPlacementFlow } from "@/hooks/station/use-station-placement-flow"
import { useParticipantSpeechFlow } from "@/hooks/station/use-participant-speech-flow"
import { completeStationDebate } from "@/lib/application/session-service"
import { advanceDebateFlow, canEndDebate } from "@/lib/domain/session"
import { listStudents } from "@/lib/application/roster-service"
import type { Session } from "@/lib/mock-data"

const PHASE_KEYS = ["Opening", "Rebuttal", "Rerebuttal", "FinalSummary"] as const
type PhaseKey = (typeof PHASE_KEYS)[number]
const STATION_GROUP_COUNT = 2
type StationGroup = NonNullable<NonNullable<NonNullable<Session["debate"]>["groups"]>>[number]

function sameOrderedMembers(
  left: { id: string; name: string; roleLabel: string }[],
  right: { id: string; name: string; roleLabel: string }[]
) {
  if (left.length !== right.length) return false
  return left.every(
    (member, index) =>
      member.id === right[index]?.id &&
      member.name === right[index]?.name &&
      member.roleLabel === right[index]?.roleLabel
  )
}

export default function StationPage() {
  const router = useRouter()
  const participantFlow = useParticipantSpeechFlow()
  const {
    status: participantStatus,
    completedSpeeches,
    resetForSession,
    resetForStudent,
    syncWithSpeechRunning,
    requestOrStartSpeech,
    endSpeech,
  } = participantFlow
  const entryFlow = useStationEntryFlow()
  const {
    state: entryState,
    selectedStudentId,
    setSelectedStudentId,
    selectedGroupIndex,
    setSelectedGroupIndex,
    goLanding,
    goIdentity,
    goGroup,
    goLive,
    selectGroupAndWait,
  } = entryFlow
  const participantReportRedirectedRef = useRef(false)

  const { sessions, hydrated, setStatus, setDebateGroups } = useMockSessions()
  const [orderedMembers, setOrderedMembers] = useState<{ id: string; name: string; roleLabel: string }[]>([])
  const [currentPhase, setCurrentPhase] = useState<PhaseKey>("Opening")
  const [currentSpeakerIndex, setCurrentSpeakerIndex] = useState(0)
  const [isSpeechRunning, setIsSpeechRunning] = useState(false)
  const [finalSpeechCompleted, setFinalSpeechCompleted] = useState(false)
  const [freeSpeechType, setFreeSpeechType] = useState<"질문" | "반박" | "동의" | null>(null)

  const activeDebate = useMemo(() => {
    const debateSessions = sessions.filter(
      (session) => session.type === "Debate" && (session.status === "Pending" || session.status === "Live")
    )
    if (debateSessions.length === 0) return undefined

    const pending = debateSessions.find((session) => session.status === "Pending")
    if (pending) return pending

    const live = debateSessions.find((session) => session.status === "Live")
    if (live) return live

    return undefined
  }, [sessions])

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

  const goLiveFromWaiting = useCallback(
    (groups: StationGroup[]) => {
      if (!activeDebate) return
      setDebateGroups(activeDebate.id, groups)
      if (activeDebate.status !== "Live") {
        setStatus(activeDebate.id, "Live")
      }
      goLive()
    },
    [activeDebate, goLive, setDebateGroups, setStatus]
  )

  const placementFlow = useStationPlacementFlow({
    activeDebate,
    selectedGroupIndex,
    setSelectedGroupIndex,
    selectedStudent,
    placementCandidates,
    groupCount: STATION_GROUP_COUNT,
    onPlacementComplete: goLiveFromWaiting,
  })

  const teamMembers = useMemo(() => {
    const primaryGroup = placementFlow.stationGroups[selectedGroupIndex]
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
  }, [placementFlow.stationGroups, selectedGroupIndex])

  useEffect(() => {
    setOrderedMembers((prev) => (sameOrderedMembers(prev, teamMembers) ? prev : teamMembers))
  }, [teamMembers])

  useEffect(() => {
    setCurrentPhase("Opening")
    setCurrentSpeakerIndex(0)
    setIsSpeechRunning(false)
    setFinalSpeechCompleted(false)
    setFreeSpeechType(null)
  }, [activeDebate?.id, selectedGroupIndex])

  const debateMode = activeDebate?.debate?.mode ?? "Ordered"

  const selectedMemberIndex = useMemo(
    () => orderedMembers.findIndex((member) => member.id === entryFlow.selectedStudentId),
    [orderedMembers, selectedStudentId]
  )

  const isCurrentUserModerator = Boolean(
    selectedStudentId && placementFlow.currentPlacementGroup?.moderator?.id === selectedStudentId
  )

  const isCurrentSpeakerSelf = Boolean(
    selectedStudentId && orderedMembers[currentSpeakerIndex]?.id === selectedStudentId
  )

  const participantSpeakerIndex =
    debateMode === "Free" && !isCurrentUserModerator && selectedMemberIndex >= 0
      ? selectedMemberIndex
      : currentSpeakerIndex

  const isParticipantRecordingEnabled = useMemo(() => {
    const configured = activeDebate?.debate?.assignmentConfig?.recordingStudentIds
    if (!configured || configured.length === 0) return true
    return configured.includes(selectedStudentId)
  }, [activeDebate?.debate?.assignmentConfig?.recordingStudentIds, selectedStudentId])

  const isDebateFinished = canEndDebate({
    phase: currentPhase,
    currentSpeakerIndex,
    speakerCount: orderedMembers.length,
    debateMode,
    finalSpeechCompleted,
  }) && !isSpeechRunning

  useEffect(() => {
    resetForSession()
    participantReportRedirectedRef.current = false
  }, [activeDebate?.id, resetForSession])

  useEffect(() => {
    resetForStudent()
  }, [selectedStudentId, resetForStudent])

  useEffect(() => {
    syncWithSpeechRunning(isSpeechRunning, isCurrentUserModerator)
  }, [isSpeechRunning, isCurrentUserModerator, syncWithSpeechRunning])

  useEffect(() => {
    if (entryState !== "live") return
    if (isCurrentUserModerator) return
    if (debateMode !== "Ordered") return
    if (isCurrentSpeakerSelf) return
    if (orderedMembers.length <= 0) return

    const timer = window.setTimeout(() => {
      const nextState = advanceDebateFlow({
        phase: currentPhase,
        currentSpeakerIndex,
        speakerCount: orderedMembers.length,
        debateMode,
        finalSpeechCompleted,
      })
      setCurrentPhase(nextState.phase)
      setCurrentSpeakerIndex(nextState.currentSpeakerIndex)
      setIsSpeechRunning(false)
      setFinalSpeechCompleted(nextState.finalSpeechCompleted)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [
    currentPhase,
    currentSpeakerIndex,
    debateMode,
    entryState,
    finalSpeechCompleted,
    isCurrentSpeakerSelf,
    isCurrentUserModerator,
    orderedMembers.length,
  ])

  useEffect(() => {
    if (entryState !== "live") return
    if (isCurrentUserModerator) return
    if (!activeDebate) return

    const orderedFinished = debateMode === "Ordered" && isDebateFinished
    const freeReachedLimit = debateMode === "Free" && completedSpeeches >= 3
    const shouldRedirect = activeDebate.status === "Ended" || orderedFinished || freeReachedLimit
    if (!shouldRedirect || participantReportRedirectedRef.current) return

    if (orderedFinished && activeDebate.status !== "Ended") {
      setStatus(activeDebate.id, "Ended")
    }

    const participantName =
      selectedStudent?.name ||
      orderedMembers.find((member) => member.id === selectedStudentId)?.name ||
      "참여자"
    const reportMemberNames =
      debateMode === "Ordered" && orderedMembers.length > 0
        ? orderedMembers.map((member) => member.name)
        : [participantName]
    const reportMemberLabels =
      debateMode === "Ordered" && orderedMembers.length > 0
        ? orderedMembers.map((member) => member.roleLabel)
        : undefined
    const reportGroupLayout =
      debateMode === "Ordered" && placementFlow.currentPlacementGroup
        ? [
            {
              affirmative: placementFlow.currentPlacementGroup.affirmative.map((student) => student.name),
              negative: placementFlow.currentPlacementGroup.negative.map((student) => student.name),
            },
          ]
        : [{ affirmative: [], negative: [] }]

    const { reportPath } = completeStationDebate({
      sessionId: activeDebate.id,
      debateMode,
      memberNames: reportMemberNames,
      memberLabels: reportMemberLabels,
      sessionTitle: `${activeDebate.title} - 개인 점검`,
      teacherGuided: activeDebate.debate?.teacherGuided ?? false,
      groupLayout: reportGroupLayout,
      personal: debateMode !== "Ordered",
      markSessionEnded: orderedFinished,
    })

    participantReportRedirectedRef.current = true
    router.push(`${reportPath}&source=station`)
  }, [
    activeDebate,
    completedSpeeches,
    debateMode,
    entryState,
    isCurrentUserModerator,
    isDebateFinished,
    orderedMembers,
    placementFlow.currentPlacementGroup,
    router,
    selectedStudentId,
    selectedStudent,
    setStatus,
  ])

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
    setCurrentPhase(PHASE_KEYS[nextIndex])
    setCurrentSpeakerIndex(0)
    setIsSpeechRunning(false)
    setFinalSpeechCompleted(false)
  }

  const handleSelectSpeaker = (index: number) => {
    if (index < 0 || index >= orderedMembers.length) return
    setCurrentSpeakerIndex(index)
    setIsSpeechRunning(false)
    setFinalSpeechCompleted(false)
  }

  const handleEndDebate = () => {
    if (!activeDebate) return

    setIsSpeechRunning(false)
    const { reportPath } = completeStationDebate({
      sessionId: activeDebate.id,
      debateMode,
      memberNames: orderedMembers.map((member) => member.name),
      memberLabels: orderedMembers.map((member) => member.roleLabel),
      sessionTitle: activeDebate.title,
      teacherGuided: activeDebate.debate?.teacherGuided ?? false,
      groupLayout: [
        {
          affirmative: (activeDebate.teams?.team1 ?? []).map((student) => student.name),
          negative: (activeDebate.teams?.team2 ?? []).map((student) => student.name),
        },
      ],
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
      {entryState === "waiting" ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">세션 대기실</p>
              <p className="text-xs text-muted-foreground">
                {placementFlow.isAutoFilling
                  ? "다른 좌석을 자동으로 배치 중입니다..."
                  : `${placementFlow.currentPlacementGroupNumber}조에서 내 자리를 배치하세요.`}
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
                  draggable={!placementFlow.isAutoFilling}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(
                      "application/json",
                      JSON.stringify({ kind: "pool", studentId: selectedStudent.id })
                    )
                  }}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs disabled:opacity-50"
                  disabled={
                    placementFlow.isAutoFilling || placementFlow.isSelectedStudentPlacedInCurrentGroup
                  }
                >
                  {selectedStudent.name}
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">이름 선택으로 돌아가서 학생을 선택하세요.</span>
              )}
            </div>

            <DeskLayoutBoard
              groups={placementFlow.deskPlacementGroups}
              poolStudents={placementFlow.selfPlacementPool}
              seatConfigByGroup={placementFlow.placementSeatConfig}
              startGroupNumber={placementFlow.currentPlacementGroupNumber}
              onChange={placementFlow.handleDeskLayoutChange}
            />
          </div>
        </div>
      ) : null}

      {entryState === "landing" && (
        <WaitingScreen
          onJoin={goIdentity}
          sessionInfo={{
            topic: activeDebate.topic ?? "No topic",
            teacherName: "Teacher",
            createdAt: `${activeDebate.date}T09:00:00`,
            memberCount: orderedMembers.length,
            hasSpeakingOrder: orderedMembers.length > 0,
          }}
        />
      )}

      {entryState === "identity" ? (
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
            <Button variant="outline" onClick={goLanding}>
              이전
            </Button>
            <Button disabled={!selectedStudentId} onClick={goGroup}>
              다음
            </Button>
          </div>
        </div>
      ) : null}

      {entryState === "group" ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">조 선택</p>
          <p className="mt-1 text-xs text-muted-foreground">조 배치 상태를 보고 참가할 조를 선택하세요.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {placementFlow.placementStatus.map((status, index) => (
              <button
                key={status.groupId}
                type="button"
                onClick={() => selectGroupAndWait(index)}
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  index === placementFlow.currentPlacementGroupIndex
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                <p className="text-sm font-medium text-foreground">{status.label}</p>
                <p className="text-xs text-muted-foreground">
                  {status.placedTotal}/{status.requiredTotal} 배치
                </p>
                <p
                  className={`mt-1 text-xs font-semibold ${
                    status.done ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {status.done ? "완료" : "진행 중"}
                </p>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={goIdentity}>
              이전
            </Button>
          </div>
        </div>
      ) : null}

      {entryState === "live" && (
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
            freeSpeechType={debateMode === "Free" ? freeSpeechType : null}
            onFreeSpeechTypeChange={debateMode === "Free" ? setFreeSpeechType : undefined}
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
                setIsSpeechRunning(true)
                return
              }

              requestOrStartSpeech({
                debateMode,
                isCurrentSpeakerSelf,
                selectedMemberIndex,
                setSpeakerIndex: (index) => {
                  setCurrentSpeakerIndex(index)
                  setFinalSpeechCompleted(false)
                },
                setSpeechRunning: (running) => setIsSpeechRunning(running),
              })
            }}
            onEndSpeech={() => {
              if (isCurrentUserModerator) {
                const nextState = advanceDebateFlow({
                  phase: currentPhase,
                  currentSpeakerIndex,
                  speakerCount: orderedMembers.length,
                  debateMode,
                  finalSpeechCompleted,
                })
                setCurrentPhase(nextState.phase)
                setCurrentSpeakerIndex(nextState.currentSpeakerIndex)
                setIsSpeechRunning(false)
                setFinalSpeechCompleted(nextState.finalSpeechCompleted)
                return
              }

              endSpeech({
                debateMode,
                setSpeechRunning: (running) => setIsSpeechRunning(running),
                onOrderedEnd: () => {
                  const nextState = advanceDebateFlow({
                    phase: currentPhase,
                    currentSpeakerIndex,
                    speakerCount: orderedMembers.length,
                    debateMode,
                    finalSpeechCompleted,
                  })
                  setCurrentPhase(nextState.phase)
                  setCurrentSpeakerIndex(nextState.currentSpeakerIndex)
                  setIsSpeechRunning(false)
                  setFinalSpeechCompleted(nextState.finalSpeechCompleted)
                },
              })
            }}
            debateFinished={isDebateFinished}
            compact
            startOnlyMode={!isCurrentUserModerator}
            speechRunning={isCurrentUserModerator ? isSpeechRunning : participantStatus === "running"}
            startOnlyStatus={isCurrentUserModerator ? "idle" : participantStatus}
            participantCanStart={
              isCurrentUserModerator ? true : debateMode === "Free" ? true : isCurrentSpeakerSelf
            }
            participantUseRequestFlow={!isCurrentUserModerator && debateMode === "Free"}
            participantRecordingEnabled={isParticipantRecordingEnabled}
            showCards={!isCurrentUserModerator && !isParticipantRecordingEnabled}
            speechType={debateMode === "Free" ? freeSpeechType : null}
            onSpeechTypeChange={debateMode === "Free" ? setFreeSpeechType : undefined}
          />
        </div>
      )}
    </div>
  )
}

