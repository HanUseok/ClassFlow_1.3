"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Pause, Play, Square } from "lucide-react"
import type { Session } from "@/lib/mock-data"
import { LiveDebateScreen } from "@/components/station/live-debate-screen"
import { QuickAddScreen } from "@/components/station/quick-add-screen"
import { PresentationView } from "@/components/session/presentation-view"
import { DebateGroupPanel } from "@/components/session/debate-group-panel"
import { DeskLayoutBoard } from "@/components/session/desk-layout-board"
import { StatusBadge, TypeBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { useMockSessions } from "@/hooks/use-mock-sessions"
import { useSessionFlow } from "@/hooks/use-session-flow"
import { listStudents } from "@/lib/application/roster-service"
import {
  buildDebateGroups,
  buildFreeModeImaginedLogs,
  buildReportPayload,
  collectUniqueMembers,
  mergeGroupMembers,
  reorderSpeakers,
  type DebateGroup,
  type PhaseKey,
} from "@/lib/domain/session"
import { getDebateStatusLabel, getPhaseLabel, getSpeakerBoundaryState } from "@/lib/domain/session/view-model"

export function SessionDetailPageContent() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { sessions, hydrated, setStatus, setDebateGroups } = useMockSessions()
  const session = sessions.find((item) => item.id === params.id)

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [endedByDebateClose, setEndedByDebateClose] = useState(false)
  const [viewMode, setViewMode] = useState<"progress" | "manage">("progress")
  const [placementCollapsed, setPlacementCollapsed] = useState(false)
  const [placementCollapsing, setPlacementCollapsing] = useState(false)
  const [autoDoneGroupCount, setAutoDoneGroupCount] = useState(0)
  const flow = useSessionFlow()

  const debateGroups = useMemo(() => {
    if (!session || session.type !== "Debate") return [] as DebateGroup[]
    const storedGroups = session.debate?.groups ?? []
    const configuredGroupCount = session.debate?.assignmentConfig?.groupCount ?? 0
    const targetCount = Math.max(1, configuredGroupCount, storedGroups.length || 0)
    const fallbackGroups = buildDebateGroups(session, targetCount)

    return Array.from({ length: targetCount }, (_, index) => {
      const found = storedGroups[index]
      if (found && (found.affirmative.length > 0 || found.negative.length > 0 || found.moderator)) {
        return found
      }
      return fallbackGroups[index]
    })
  }, [session])

  const isTeacherGuided = session?.type === "Debate" && session.debate?.teacherGuided === true
  const isDebatePending = session?.type === "Debate" && session.status === "Pending"
  const debateMode = session?.type === "Debate" ? session.debate?.mode ?? "Ordered" : "Ordered"

  useEffect(() => {
    if (!session || session.type !== "Debate") return
    setViewMode(session.debate?.teacherGuided === true && session.status === "Live" ? "progress" : "manage")
    debateGroups.forEach((group) => flow.resetGroup(group.id))
  }, [session?.id, session?.type, session?.status, session?.debate?.teacherGuided])

  useEffect(() => {
    setPlacementCollapsed(false)
    setPlacementCollapsing(false)
    setAutoDoneGroupCount(0)
  }, [session?.id, session?.status])

  const deskPlacementGroups = useMemo(() => {
    if (!isTeacherGuided) return debateGroups
    return debateGroups.slice(0, 1)
  }, [isTeacherGuided, debateGroups])

  const canStartWithDeskLayout = useMemo(() => {
    if (!session || session.type !== "Debate") return false
    return deskPlacementGroups.every((group) => group.affirmative.length > 0 && group.negative.length > 0)
  }, [session, deskPlacementGroups])

  const placementCandidates = useMemo(() => {
    if (!session || session.type !== "Debate") return []
    return listStudents().filter((student) => student.classId === session.classId)
  }, [session])

  const unassignedPlacementStudents = useMemo(() => {
    const assigned = new Set(
      deskPlacementGroups.flatMap((group) => [
        ...group.affirmative.map((student) => student.id),
        ...group.negative.map((student) => student.id),
        ...(group.moderator ? [group.moderator.id] : []),
      ])
    )
    return placementCandidates.filter((student) => !assigned.has(student.id))
  }, [deskPlacementGroups, placementCandidates])

  const placementSeatConfig = useMemo(() => {
    const cfg = session?.debate?.assignmentConfig
    if (!cfg) {
      return deskPlacementGroups.map((group) => ({
        affirmative: Math.max(1, group.affirmative.length),
        negative: Math.max(1, group.negative.length),
        moderator: Math.max(0, group.moderator ? 1 : 0),
      }))
    }

    const adjust = cfg.groupSlotAdjust ?? {}
    return deskPlacementGroups.map((group, index) => {
      const gid = `group-${index + 1}`
      const delta = adjust[gid] ?? { affirmative: 0, negative: 0, moderator: 0 }
      return {
        affirmative: Math.max(1, cfg.affirmativeSlots + delta.affirmative),
        negative: Math.max(1, cfg.negativeSlots + delta.negative),
        moderator: Math.max(0, cfg.moderatorSlots + delta.moderator),
      }
    })
  }, [session?.debate?.assignmentConfig, deskPlacementGroups])

  const placementStatus = useMemo(() => {
    const cfg = session?.debate?.assignmentConfig
    const adjust = cfg?.groupSlotAdjust ?? {}
    return debateGroups.map((group, index) => {
      const gid = `group-${index + 1}`
      const delta = adjust[gid] ?? { affirmative: 0, negative: 0, moderator: 0 }
      const requiredAff = Math.max(0, (cfg?.affirmativeSlots ?? 0) + delta.affirmative)
      const requiredNeg = Math.max(0, (cfg?.negativeSlots ?? 0) + delta.negative)
      const requiredMod = Math.max(0, (cfg?.moderatorSlots ?? 0) + delta.moderator)
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
  }, [session?.debate?.assignmentConfig, debateGroups])

  useEffect(() => {
    if (!placementCollapsed) return
    if (placementStatus.length === 0) {
      setAutoDoneGroupCount(0)
      return
    }
    setAutoDoneGroupCount(1)
    const timers: number[] = []
    for (let i = 1; i < placementStatus.length; i += 1) {
      const timer = window.setTimeout(() => {
        setAutoDoneGroupCount((prev) => Math.max(prev, i + 1))
      }, i * 550)
      timers.push(timer)
    }
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [placementCollapsed, placementStatus.length])

  const updateGroup = (groupIndex: number, updater: (group: DebateGroup) => DebateGroup) => {
    if (!session || session.type !== "Debate") return
    const next = [...debateGroups]

    next[groupIndex] = updater(next[groupIndex])
    setDebateGroups(session.id, next)
  }

  const buildGroupLayoutForReport = () =>
    JSON.stringify(
      debateGroups.map((group) => ({
        affirmative: group.affirmative.map((student) => student.name),
        negative: group.negative.map((student) => student.name),
      }))
    )

  const syncSpeakerIndexAfterReorder = (groupId: string, from: number, to: number) => {
    const current = flow.getGroupState(groupId).currentSpeakerIndex
    if (current === from) {
      flow.setGroupSpeakerIndex(groupId, to)
      return
    }
    if (current === to) {
      flow.setGroupSpeakerIndex(groupId, from)
    }
  }

  const finishDebateAndOpenReport = () => {
    if (!session) return
    const members = collectUniqueMembers(debateGroups)
    const logs = debateMode === "Free" ? buildFreeModeImaginedLogs(members) : []
    const groupLayout = buildGroupLayoutForReport()
    setEndedByDebateClose(true)
    setOpenGroups({})
    setStatus(session.id, "Ended")
    const reportPath = buildReportPayload({
      names: members.map((m) => m.name),
      round: 1,
      phase: debateMode === "Free" ? "자유토론" : "마무리",
      logs,
      sessionId: session.id,
      teacherGuided: isTeacherGuided,
      sessionTitle: session.title,
      sessionStatus: "Ended",
      groupCount: Math.max(1, debateGroups.length),
      groupLayout,
    })
    router.push(reportPath)
  }

  if (!hydrated) {
    return (
      <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
        세션 불러오는 중...
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-border p-6">
        <p className="text-sm text-muted-foreground">세션을 찾을 수 없습니다.</p>
        <Link href="/teacher/sessions" className="text-sm font-medium text-primary hover:underline">
          세션 목록으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link href="/teacher/sessions" className="w-fit text-sm text-muted-foreground transition-colors hover:text-foreground">
          <span className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            세션 목록으로 돌아가기
          </span>
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-foreground">{session.title}</h1>
            {session.topic && <p className="text-sm text-muted-foreground">{session.topic}</p>}
          </div>
	          {isTeacherGuided && session.status === "Live" ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-md border border-border p-1">
                  <Button size="sm" variant={viewMode === "progress" ? "default" : "ghost"} onClick={() => setViewMode("progress")}>
                    진행 화면
                  </Button>
                  <Button size="sm" variant={viewMode === "manage" ? "default" : "ghost"} onClick={() => setViewMode("manage")}>
                    관리 화면
                  </Button>
                </div>
                <TypeBadge type={session.type} />
                <StatusBadge status={session.status} />
              </div>
            ) : null}
	        </div>
	      </div>

	      {session.type === "Debate" ? (
	        isTeacherGuided && viewMode === "progress" ? (
          <div className="rounded-lg border border-border bg-card p-4">
            {(() => {
              const group = debateGroups[0]
              if (!group) {
                return <p className="text-sm text-muted-foreground">1조 데이터가 없습니다.</p>
              }

	              const teamMembers = mergeGroupMembers(group)
	              const groupState = flow.getGroupState(group.id)
	              const phase = groupState.phase
	              const currentIndexRaw = groupState.currentSpeakerIndex
	              const currentIndex = Math.min(currentIndexRaw, Math.max(0, teamMembers.length - 1))
	              const isRunning = groupState.isSpeechRunning
	              const isDebateFinished = flow.isDebateFinished(group.id, teamMembers.length, debateMode)
	              const { hasPrevSpeaker, hasNextSpeaker } = getSpeakerBoundaryState(phase, currentIndex, teamMembers.length)
              const isSessionEnded = session.status === "Ended"

              return (
                <div className="flex flex-col gap-3">
                  <LiveDebateScreen
                    round={1}
                    phase={phase}
                    durationSeconds={120}
                    isSpeechRunning={isRunning}
                    debateMode={debateMode}
                    teamMembers={teamMembers}
                    currentSpeakerIndex={currentIndex}
                    onEndDebate={() => {
                      finishDebateAndOpenReport()
                    }}
	                    onSelectSpeaker={(idx) => {
	                      flow.setGroupSpeakerIndex(group.id, idx)
	                    }}
	                    onPhaseChange={(next) => {
	                      flow.setGroupPhase(group.id, next as PhaseKey)
	                    }}
	                    onMoveOrderTo={(from, to) => {
	                      updateGroup(0, (prev) => reorderSpeakers(prev, from, to))
	                      syncSpeakerIndexAfterReorder(group.id, from, to)
	                    }}
	                  />
                  {viewMode === "progress" ? (
                    <QuickAddScreen
                      round={1}
                      phase={phase}
                      durationSeconds={120}
                      recordLimitPerRound={6}
                      debateMode={debateMode}
                      sessionId={session.id}
                      teacherGuided={isTeacherGuided}
                      sessionTitle={session.title}
                      sessionStatus={session.status}
                      groupCount={Math.max(1, debateGroups.length)}
                      groupLayout={buildGroupLayoutForReport()}
                      argumentCards={session.debate?.argumentCards}
                      teamMembers={teamMembers}
                      currentSpeaker={teamMembers[currentIndex]}
	                      onStartSpeech={() => {
	                        flow.setSpeechRunning(group.id, true)
	                        setEndedByDebateClose(false)
	                        if (session.status !== "Live") setStatus(session.id, "Live")
	                      }}
	                      onEndSpeech={() => {
	                        flow.handleEndSpeech(group.id, teamMembers.length, debateMode)
	                      }}
	                      debateFinished={isDebateFinished}
	                      compact
                    />
                  ) : (
                    <div className="mt-1 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                      {isSessionEnded ? (
                        <div className="flex w-full flex-wrap items-center justify-between gap-2">
                          <p className="text-sm text-muted-foreground">토론이 종료된 세션입니다. 관리 화면은 읽기 전용입니다.</p>
                          <Button asChild size="sm" variant="outline">
                            <Link href="/teacher/sessions">세션 목록으로</Link>
                          </Button>
                        </div>
                      ) : null}
                      {!isSessionEnded && session.status === "Pending" ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setEndedByDebateClose(false)
                            setStatus(session.id, "Live")
	                          }}
	                        >
	                          토론 시작
                        </Button>
                      ) : null}
                      {!isSessionEnded ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
	                        onClick={() => {
	                          const nextRunning = !isRunning
	                          flow.setSpeechRunning(group.id, nextRunning)
	                          if (nextRunning) {
	                            setEndedByDebateClose(false)
	                            if (session.status !== "Live") {
                              setStatus(session.id, "Live")
                            }
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
                      ) : null}
                      {!isSessionEnded && hasPrevSpeaker ? (
                        <Button
                          variant="outline"
                          size="sm"
	                          onClick={() => {
	                            flow.goPrev(group.id, teamMembers.length)
	                          }}
	                        >
                          이전 발언자
                        </Button>
                      ) : null}
                      {!isSessionEnded && hasNextSpeaker ? (
                        <Button
                          variant="outline"
                          size="sm"
	                          onClick={() => {
	                            flow.goNext(group.id, teamMembers.length)
	                          }}
	                        >
                          다음 발언자
                        </Button>
                      ) : null}
                      {!isSessionEnded ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-2"
                        onClick={() => {
	                          finishDebateAndOpenReport()
                        }}
                      >
                        <Square className="h-4 w-4" />
                        토론 종료
                      </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        ) : (
        <>
          {isDebatePending ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">세션 대기실</p>
                  <p className="text-xs text-muted-foreground">
                    {isTeacherGuided ? "1조 배치 완료 후 상태 카드로 전환됩니다." : "조배치 없이 세션 시작 대기 상태입니다."}
                  </p>
                </div>
                {isTeacherGuided && !placementCollapsed ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!canStartWithDeskLayout) return
                      setPlacementCollapsing(true)
                      window.setTimeout(() => {
                        setPlacementCollapsed(true)
                        setPlacementCollapsing(false)
                      }, 220)
                    }}
                    disabled={!canStartWithDeskLayout}
                  >
                    1조 배치 완료
                  </Button>
                ) : null}
              </div>
              {isTeacherGuided && !placementCollapsed ? (
                <div className={`transition-all duration-200 ${placementCollapsing ? "scale-[0.97] opacity-70" : "scale-100 opacity-100"}`}>
                  <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
                    <DeskLayoutBoard
                      groups={deskPlacementGroups}
                      poolStudents={unassignedPlacementStudents}
                      seatConfigByGroup={placementSeatConfig}
                      onChange={(nextGroups) => {
                        const merged = [...debateGroups]
                        if (nextGroups[0]) merged[0] = nextGroups[0]
                        setDebateGroups(session.id, merged)
                      }}
                    />
                    <div
                      className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-3"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        const rawDrop = event.dataTransfer.getData("application/json")
                        if (!rawDrop) return
                        try {
                          const parsed = JSON.parse(rawDrop) as { kind: "seat"; groupIndex: number; side: "affirmative" | "negative" | "moderator"; index: number }
                          if (parsed.kind !== "seat") return
                          const merged = [...debateGroups]
                          const target = merged[parsed.groupIndex]
                          if (!target) return
                          if (parsed.side === "affirmative") {
                            const nextAff = [...target.affirmative]
                            nextAff.splice(parsed.index, 1)
                            merged[parsed.groupIndex] = { ...target, affirmative: nextAff }
                          } else if (parsed.side === "negative") {
                            const nextNeg = [...target.negative]
                            nextNeg.splice(parsed.index, 1)
                            merged[parsed.groupIndex] = { ...target, negative: nextNeg }
                          } else if (parsed.side === "moderator" && parsed.index === 0) {
                            merged[parsed.groupIndex] = { ...target, moderator: undefined }
                          }
                          setDebateGroups(session.id, merged)
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
                                event.dataTransfer.setData(
                                  "application/json",
                                  JSON.stringify({ kind: "pool", studentId: student.id })
                                )
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
                    {(isTeacherGuided ? placementStatus : debateGroups.map((group, index) => ({
                      groupId: group.id,
                      label: `${index + 1}조`,
                      placedTotal: group.affirmative.length + group.negative.length + (group.moderator ? 1 : 0),
                      requiredTotal:
                        group.affirmative.length + group.negative.length + (group.moderator ? 1 : 0),
                      done: true,
                    }))).map((status, index) => {
                      const done = isTeacherGuided ? index < autoDoneGroupCount : true
                      return (
                        <div
                          key={status.groupId}
                          className={`flex min-h-[220px] flex-col justify-between rounded-lg px-3 py-2 ${
                            done ? "border border-emerald-200 bg-emerald-50" : "border border-border"
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{status.label} 배치 상태</p>
                            <p className="text-xs text-muted-foreground">{status.placedTotal}/{status.requiredTotal} 배치</p>
                          </div>
                          <p className={`text-xs font-semibold ${done ? "text-emerald-600" : "text-amber-600"}`}>
                            {done ? "완료" : "진행 중"}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/teacher/sessions/create?sessionId=${session.id}&type=debate`)}
                    >
                      세션 설정으로 가기
                    </Button>
                    <Button
                      size="sm"
                      disabled={
                        isTeacherGuided
                          ? autoDoneGroupCount < placementStatus.length || placementStatus.length === 0
                          : debateGroups.length === 0
                      }
                      onClick={() => {
                        setStatus(session.id, "Live")
                        setViewMode("progress")
                      }}
                    >
                      세션 시작
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}{isDebatePending ? null : (
	          <div className="grid gap-2 sm:grid-cols-2">
	            {debateGroups.map((group, groupIndex) => {
	              const firstSpeaker = group.affirmative[0]?.name ?? group.negative[0]?.name ?? "-"
	              const isOpen = Boolean(openGroups[group.id])
	              const teamMembers = mergeGroupMembers(group)
	              const groupState = flow.getGroupState(group.id)
	              const phase = groupState.phase
	              const currentIndexRaw = groupState.currentSpeakerIndex
	              const currentIndex = Math.min(currentIndexRaw, Math.max(0, teamMembers.length - 1))
	              const isRunning = groupState.isSpeechRunning
	              const { hasPrevSpeaker, hasNextSpeaker } = getSpeakerBoundaryState(phase, currentIndex, teamMembers.length)
	              const isDebateFinished = flow.isDebateFinished(group.id, teamMembers.length, debateMode)
	              const phaseLabel = getPhaseLabel(phase)
	              const statusLabel = getDebateStatusLabel({
	                endedByDebateClose,
	                sessionEnded: session.status === "Ended",
	                isRunning,
	              })

	              return (
	                <DebateGroupPanel
	                  key={group.id}
	                  group={group}
	                  groupIndex={groupIndex}
	                  isOpen={isOpen}
	                  phase={phase}
	                  phaseLabel={phaseLabel}
	                  statusLabel={statusLabel}
	                  isRunning={isRunning}
	                  isDebateFinished={isDebateFinished}
	                  hasPrevSpeaker={hasPrevSpeaker}
	                  hasNextSpeaker={hasNextSpeaker}
	                  firstSpeaker={firstSpeaker}
	                  teamMembers={teamMembers}
	                  currentIndex={currentIndex}
	                  debateMode={debateMode}
	                  session={session}
	                  isTeacherGuided={isTeacherGuided}
	                  viewMode={viewMode}
	                  isSessionEnded={session.status === "Ended"}
	                  groupCount={Math.max(1, debateGroups.length)}
	                  groupLayout={buildGroupLayoutForReport()}
	                  onToggleOpen={() => setOpenGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
	                  onEndDebate={finishDebateAndOpenReport}
	                  onSelectSpeaker={(idx) => flow.setGroupSpeakerIndex(group.id, idx)}
	                  onPhaseChange={(next) => flow.setGroupPhase(group.id, next as PhaseKey)}
	                  onMoveOrderTo={(from, to) => {
	                    updateGroup(groupIndex, (prev) => reorderSpeakers(prev, from, to))
	                    syncSpeakerIndexAfterReorder(group.id, from, to)
	                  }}
	                  onStartSpeech={() => {
	                    flow.setSpeechRunning(group.id, true)
	                    setEndedByDebateClose(false)
	                    if (session.status !== "Live") setStatus(session.id, "Live")
	                  }}
	                  onEndSpeech={() => flow.handleEndSpeech(group.id, teamMembers.length, debateMode)}
		                  onStartDebate={() => {
		                    setEndedByDebateClose(false)
		                    setStatus(session.id, "Live")
		                    if (isTeacherGuided) setViewMode("progress")
		                  }}
	                  onToggleRunning={() => {
	                    const nextRunning = !isRunning
	                    flow.setSpeechRunning(group.id, nextRunning)
	                    if (nextRunning) {
	                      setEndedByDebateClose(false)
	                      if (session.status !== "Live") setStatus(session.id, "Live")
	                    }
	                  }}
	                  onPrevSpeaker={() => flow.goPrev(group.id, teamMembers.length)}
	                  onNextSpeaker={() => flow.goNext(group.id, teamMembers.length)}
	                />
	              )
	            })}
	          </div>
          )}
        </>
        )
      ) : (
        <PresentationView
          session={session}
          onStart={() => setStatus(session.id, "Live")}
          onEnd={() => setStatus(session.id, "Ended")}
        />
      )}
    </div>
  )
}

