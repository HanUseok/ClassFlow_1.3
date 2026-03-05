"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { WaitingScreen } from "@/components/station/waiting-screen"
import { LiveDebateScreen } from "@/components/station/live-debate-screen"
import { QuickAddScreen } from "@/components/station/quick-add-screen"
import { DeskLayoutBoard } from "@/components/session/desk-layout-board"
import { Button } from "@/components/ui/button"
import { useMockSessions } from "@/hooks/use-mock-sessions"
import { useSessionFlow } from "@/hooks/use-session-flow"
import { useStationEntryFlow } from "@/hooks/station/use-station-entry-flow"
import { useStationPlacementFlow } from "@/hooks/station/use-station-placement-flow"
import { useParticipantSpeechFlow } from "@/hooks/station/use-participant-speech-flow"
import { completeStationDebate } from "@/lib/application/session-service"
import { listStudents } from "@/lib/application/roster-service"
import type { Session } from "@/lib/mock-data"

const PHASE_KEYS = ["Opening", "Rebuttal", "Rerebuttal", "FinalSummary"] as const
type PhaseKey = (typeof PHASE_KEYS)[number]
const STATION_FLOW_ID = "station-default-flow"
const STATION_GROUP_COUNT = 2
type StationGroup = NonNullable<NonNullable<NonNullable<Session["debate"]>["groups"]>>[number]

export default function StationPage() {
  const router = useRouter()
  const flow = useSessionFlow()
  const participantFlow = useParticipantSpeechFlow()
  const entryFlow = useStationEntryFlow()
  const participantReportRedirectedRef = useRef(false)

  const { sessions, hydrated, setStatus, setDebateGroups } = useMockSessions()
  const [orderedMembers, setOrderedMembers] = useState<{ id: string; name: string; roleLabel: string }[]>([])

  const activeDebate = useMemo(() => {
    const debateSessions = sessions.filter((session) => session.type === "Debate")
    if (debateSessions.length === 0) return undefined

    const pending = debateSessions.find((session) => session.status === "Pending")
    if (pending) return pending

    const live = debateSessions.find((session) => session.status === "Live")
    if (live) return live

    return [...debateSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
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
    () => placementCandidates.find((student) => student.id === entryFlow.selectedStudentId),
    [placementCandidates, entryFlow.selectedStudentId]
  )

  const goLiveFromWaiting = useCallback(
    (groups: StationGroup[]) => {
      if (!activeDebate) return
      setDebateGroups(activeDebate.id, groups)
      entryFlow.goLive()
    },
    [activeDebate, entryFlow, setDebateGroups]
  )

  const placementFlow = useStationPlacementFlow({
    activeDebate,
    selectedGroupIndex: entryFlow.selectedGroupIndex,
    setSelectedGroupIndex: entryFlow.setSelectedGroupIndex,
    selectedStudent,
    placementCandidates,
    groupCount: STATION_GROUP_COUNT,
    onPlacementComplete: goLiveFromWaiting,
  })

  const teamMembers = useMemo(() => {
    const primaryGroup = placementFlow.stationGroups[entryFlow.selectedGroupIndex]
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
  }, [placementFlow.stationGroups, entryFlow.selectedGroupIndex])

  useEffect(() => {
    setOrderedMembers(teamMembers)
    flow.resetGroup(STATION_FLOW_ID)
  }, [activeDebate?.id, flow, teamMembers])

  const groupState = flow.getGroupState(STATION_FLOW_ID)
  const currentPhase: PhaseKey = groupState.phase
  const currentSpeakerIndex = groupState.currentSpeakerIndex
  const isSpeechRunning = groupState.isSpeechRunning
  const debateMode = activeDebate?.debate?.mode ?? "Ordered"

  const selectedMemberIndex = useMemo(
    () => orderedMembers.findIndex((member) => member.id === entryFlow.selectedStudentId),
    [orderedMembers, entryFlow.selectedStudentId]
  )

  const isCurrentUserModerator = Boolean(
    entryFlow.selectedStudentId &&
      placementFlow.currentPlacementGroup?.moderator?.id === entryFlow.selectedStudentId
  )

  const isCurrentSpeakerSelf = Boolean(
    entryFlow.selectedStudentId && orderedMembers[currentSpeakerIndex]?.id === entryFlow.selectedStudentId
  )

  const participantSpeakerIndex =
    debateMode === "Free" && !isCurrentUserModerator && selectedMemberIndex >= 0
      ? selectedMemberIndex
      : currentSpeakerIndex

  const isParticipantRecordingEnabled = useMemo(() => {
    const configured = activeDebate?.debate?.assignmentConfig?.recordingStudentIds
    if (!configured || configured.length === 0) return true
    return configured.includes(entryFlow.selectedStudentId)
  }, [activeDebate?.debate?.assignmentConfig?.recordingStudentIds, entryFlow.selectedStudentId])

  const isDebateFinished = flow.isDebateFinished(STATION_FLOW_ID, orderedMembers.length, debateMode)

  useEffect(() => {
    participantFlow.resetForSession()
    participantReportRedirectedRef.current = false
  }, [activeDebate?.id, participantFlow])

  useEffect(() => {
    participantFlow.resetForStudent()
  }, [entryFlow.selectedStudentId, participantFlow])

  useEffect(() => {
    participantFlow.syncWithSpeechRunning(isSpeechRunning, isCurrentUserModerator)
  }, [isSpeechRunning, isCurrentUserModerator, participantFlow])

  useEffect(() => {
    if (entryFlow.state !== "live") return
    if (isCurrentUserModerator) return
    if (debateMode !== "Ordered") return
    if (isCurrentSpeakerSelf) return
    if (orderedMembers.length <= 0) return

    const timer = window.setTimeout(() => {
      flow.handleEndSpeech(STATION_FLOW_ID, orderedMembers.length, debateMode)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [
    debateMode,
    entryFlow.state,
    flow,
    isCurrentSpeakerSelf,
    isCurrentUserModerator,
    orderedMembers.length,
  ])

  useEffect(() => {
    if (entryFlow.state !== "live") return
    if (isCurrentUserModerator) return
    if (!activeDebate) return

    const orderedFinished = debateMode === "Ordered" && isDebateFinished
    const freeReachedLimit = debateMode === "Free" && participantFlow.completedSpeeches >= 3
    const shouldRedirect = activeDebate.status === "Ended" || orderedFinished || freeReachedLimit
    if (!shouldRedirect || participantReportRedirectedRef.current) return

    if (orderedFinished && activeDebate.status !== "Ended") {
      setStatus(activeDebate.id, "Ended")
    }

    const participantName =
      selectedStudent?.name ||
      orderedMembers.find((member) => member.id === entryFlow.selectedStudentId)?.name ||
      "참여자"

    const { reportPath } = completeStationDebate({
      sessionId: activeDebate.id,
      debateMode,
      memberNames: [participantName],
      sessionTitle: `${activeDebate.title} - 개인 점검`,
      teacherGuided: activeDebate.debate?.teacherGuided ?? false,
      groupLayout: [{ affirmative: [], negative: [] }],
      personal: true,
      markSessionEnded: orderedFinished,
    })

    participantReportRedirectedRef.current = true
    router.push(`${reportPath}&source=station`)
  }, [
    activeDebate,
    debateMode,
    entryFlow.selectedStudentId,
    entryFlow.state,
    isCurrentUserModerator,
    isDebateFinished,
    orderedMembers,
    participantFlow.completedSpeeches,
    router,
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
    flow.setGroupPhase(STATION_FLOW_ID, PHASE_KEYS[nextIndex])
  }

  const handleSelectSpeaker = (index: number) => {
    if (index < 0 || index >= orderedMembers.length) return
    flow.setGroupSpeakerIndex(STATION_FLOW_ID, index)
  }

  const handleEndDebate = () => {
    if (!activeDebate) return

    flow.setSpeechRunning(STATION_FLOW_ID, false)
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
      {entryFlow.state === "waiting" ? (
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

      {entryFlow.state === "landing" && (
        <WaitingScreen
          onJoin={entryFlow.goIdentity}
          sessionInfo={{
            topic: activeDebate.topic ?? "No topic",
            teacherName: "Teacher",
            createdAt: `${activeDebate.date}T09:00:00`,
            memberCount: orderedMembers.length,
            hasSpeakingOrder: orderedMembers.length > 0,
          }}
        />
      )}

      {entryFlow.state === "identity" ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">이름 선택</p>
          <p className="mt-1 text-xs text-muted-foreground">입장할 학생 이름을 선택하세요.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {placementCandidates.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => entryFlow.setSelectedStudentId(student.id)}
                className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                  entryFlow.selectedStudentId === student.id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-foreground hover:bg-accent"
                }`}
              >
                {student.name}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={entryFlow.goLanding}>
              이전
            </Button>
            <Button disabled={!entryFlow.selectedStudentId} onClick={entryFlow.goGroup}>
              다음
            </Button>
          </div>
        </div>
      ) : null}

      {entryFlow.state === "group" ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">조 선택</p>
          <p className="mt-1 text-xs text-muted-foreground">조 배치 상태를 보고 참가할 조를 선택하세요.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {placementFlow.placementStatus.map((status, index) => (
              <button
                key={status.groupId}
                type="button"
                onClick={() => entryFlow.selectGroupAndWait(index)}
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
            <Button variant="outline" onClick={entryFlow.goIdentity}>
              이전
            </Button>
          </div>
        </div>
      ) : null}

      {entryFlow.state === "live" && (
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

              participantFlow.requestOrStartSpeech({
                debateMode,
                isCurrentSpeakerSelf,
                selectedMemberIndex,
                setSpeakerIndex: (index) => flow.setGroupSpeakerIndex(STATION_FLOW_ID, index),
                setSpeechRunning: (running) => flow.setSpeechRunning(STATION_FLOW_ID, running),
              })
            }}
            onEndSpeech={() => {
              if (isCurrentUserModerator) {
                flow.handleEndSpeech(STATION_FLOW_ID, orderedMembers.length, debateMode)
                return
              }

              participantFlow.endSpeech({
                debateMode,
                setSpeechRunning: (running) => flow.setSpeechRunning(STATION_FLOW_ID, running),
                onOrderedEnd: () => flow.handleEndSpeech(STATION_FLOW_ID, orderedMembers.length, debateMode),
              })
            }}
            debateFinished={isDebateFinished}
            compact
            startOnlyMode={!isCurrentUserModerator}
            speechRunning={isCurrentUserModerator ? isSpeechRunning : participantFlow.status === "running"}
            startOnlyStatus={isCurrentUserModerator ? "idle" : participantFlow.status}
            participantCanStart={
              isCurrentUserModerator ? true : debateMode === "Free" ? true : isCurrentSpeakerSelf
            }
            participantUseRequestFlow={!isCurrentUserModerator && debateMode === "Free"}
            participantRecordingEnabled={isParticipantRecordingEnabled}
            showCards={!isCurrentUserModerator && !isParticipantRecordingEnabled}
          />
        </div>
      )}
    </div>
  )
}

