"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { Student } from "@/lib/mock-data"
import { listClasses } from "@/lib/application/roster-service"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Minus, Plus } from "lucide-react"
import { useMockSessions } from "@/hooks/use-mock-sessions"
import { useCreateSessionFlow } from "@/hooks/use-create-session-flow"
import { useDebateCards } from "@/hooks/use-debate-cards"
import { useDebateAssignment } from "@/hooks/use-debate-assignment"
import { buildCreateSessionInput } from "@/lib/application/session-input-builder"
import { DebateRosterStep } from "@/components/session/create-session/debate-roster-step"
import { DebateCardsStep } from "@/components/session/create-session/debate-cards-step"
import { PresentationConfigStep } from "@/components/session/create-session/presentation-config-step"

function CreateSessionContent() {
  const classes = listClasses()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { create, overwrite, getById } = useMockSessions()
  const flow = useCreateSessionFlow()

  const editingSessionId = searchParams.get("sessionId")
  const editingSession = editingSessionId ? getById(editingSessionId) : null
  const sessionType =
    editingSession?.type ?? (searchParams.get("type") === "presentation" ? "Presentation" : "Debate")
  const isEditMode = Boolean(editingSessionId && editingSession)
  const isDebate = sessionType === "Debate"
  const {
    topic,
    setTopic,
    selectedClassId,
    setSelectedClassId,
    selectedStudentIds,
    setSelectedStudentIds,
    debateMode,
    setDebateMode,
    teacherGuided,
    setTeacherGuided,
    orderedStages,
    setOrderedStages,
    groupCount,
    setGroupCount,
    affirmativeSlots,
    setAffirmativeSlots,
    negativeSlots,
    setNegativeSlots,
    moderatorSlots,
    setModeratorSlots,
    groupSlotAdjust,
    setGroupSlotAdjust,
    groupAssignments,
    setGroupAssignments,
    dragStudentId,
    setDragStudentId,
    debateStep,
    setDebateStep,
    argumentCards,
    setArgumentCards,
    isGeneratingCards,
    setIsGeneratingCards,
    presentationMinutesPerStudent,
    setPresentationMinutesPerStudent,
    presenterOrderIds,
    setPresenterOrderIds,
    recordingStudentIds,
    setRecordingStudentIds,
    teacherModeratorFromClass,
  } = flow
  const hydratedEditRef = useRef<string | null>(null)

  const selectedClass = useMemo(() => classes.find((c) => c.id === selectedClassId), [selectedClassId])
  const selectedStudents = useMemo(
    () => (selectedClass?.students ?? []).filter((student) => selectedStudentIds.has(student.id)),
    [selectedClass, selectedStudentIds]
  )
  const studentMap = useMemo(
    () => new Map((selectedClass?.students ?? []).map((student) => [student.id, student])),
    [selectedClass]
  )
  const teacherModerator = useMemo<Student | null>(
    () => teacherModeratorFromClass(isDebate, selectedClass),
    [isDebate, selectedClass, teacherModeratorFromClass]
  )

  useEffect(() => {
    if (!editingSessionId || !editingSession) return
    if (hydratedEditRef.current === editingSessionId) return

    const classInfo = classes.find((c) => c.id === editingSession.classId)
    const classStudentIds = new Set((classInfo?.students ?? []).map((student) => student.id))
    setTopic(editingSession.topic ?? "")
    setSelectedClassId(editingSession.classId)

    if (editingSession.type === "Debate") {
      const groups = editingSession.debate?.groups ?? []
      const assignmentConfig = editingSession.debate?.assignmentConfig
      const affStudents = groups.flatMap((group) => group.affirmative)
      const negStudents = groups.flatMap((group) => group.negative)
      const modStudents = groups.map((group) => group.moderator).filter((s): s is Student => Boolean(s))
      const fallbackTeamStudents = [...(editingSession.teams?.team1 ?? []), ...(editingSession.teams?.team2 ?? [])]
      const selectedIdsFromConfig = new Set(
        (assignmentConfig?.selectedStudentIds ?? []).filter((id) => classStudentIds.has(id))
      )
      const participantIds = new Set(
        (affStudents.length + negStudents.length + modStudents.length > 0
          ? [...affStudents, ...negStudents, ...modStudents]
          : fallbackTeamStudents
        )
          .map((student) => student.id)
          .filter((id) => classStudentIds.has(id))
      )

      const resolvedSelectedIds = selectedIdsFromConfig.size > 0 ? selectedIdsFromConfig : participantIds
      setSelectedStudentIds(resolvedSelectedIds)
      const recordingIdsFromConfig = new Set(
        (assignmentConfig?.recordingStudentIds ?? []).filter((id) => classStudentIds.has(id))
      )
      setRecordingStudentIds(recordingIdsFromConfig.size > 0 ? recordingIdsFromConfig : new Set(resolvedSelectedIds))
      setDebateMode(editingSession.debate?.mode ?? "Ordered")
      setTeacherGuided(editingSession.debate?.teacherGuided ? "guided" : "unguided")

      if (editingSession.debate?.orderedFlow?.stages?.length) {
        setOrderedStages(editingSession.debate.orderedFlow.stages)
      }

      const nextGroupCount = Math.max(1, assignmentConfig?.groupCount ?? groups.length ?? 1)
      setGroupCount(nextGroupCount)
      const affBase = Math.max(0, assignmentConfig?.affirmativeSlots ?? Math.max(0, ...groups.map((group) => group.affirmative.length), 0))
      const negBase = Math.max(0, assignmentConfig?.negativeSlots ?? Math.max(0, ...groups.map((group) => group.negative.length), 0))
      const modBase = Math.max(0, assignmentConfig?.moderatorSlots ?? Math.max(0, ...groups.map((group) => (group.moderator ? 1 : 0)), 0))
      setAffirmativeSlots(affBase)
      setNegativeSlots(negBase)
      setModeratorSlots(modBase)
      setGroupSlotAdjust(assignmentConfig?.groupSlotAdjust ?? {})

      if (assignmentConfig?.groupAssignments) {
        setGroupAssignments(assignmentConfig.groupAssignments)
      } else {
        const nextAssignments: Record<string, { affirmative: (string | null)[]; negative: (string | null)[]; moderator: (string | null)[] }> = {}
        for (let i = 0; i < nextGroupCount; i += 1) {
          const gid = `group-${i + 1}`
          const group = groups[i]
          nextAssignments[gid] = {
            affirmative: Array.from({ length: affBase }, (_, idx) => group?.affirmative[idx]?.id ?? null),
            negative: Array.from({ length: negBase }, (_, idx) => group?.negative[idx]?.id ?? null),
            moderator: Array.from({ length: modBase }, (_, idx) => (idx === 0 ? group?.moderator?.id ?? null : null)),
          }
        }
        setGroupAssignments(nextAssignments)
      }
      setArgumentCards(
        (editingSession.debate?.argumentCards ?? []).map((card, idx) => ({
          id: card.id || `arg-${idx + 1}`,
          title: card.title ?? "",
          claim: card.claim ?? "",
          evidenceHint: card.evidenceHint,
          side: card.side ?? "neutral",
          enabled: card.enabled ?? true,
        }))
      )
      setDebateStep("setup")
    } else {
      const presenters = editingSession.presentation?.presenters ?? []
      const presenterIds = presenters.map((presenter) => presenter.student.id).filter((id) => classStudentIds.has(id))
      setSelectedStudentIds(new Set(presenterIds))
      setPresenterOrderIds(presenterIds)
      setRecordingStudentIds(
        new Set(
          presenters
            .filter((presenter) => presenter.recordingEnabled)
            .map((presenter) => presenter.student.id)
            .filter((id) => classStudentIds.has(id))
        )
      )
      setPresentationMinutesPerStudent(Math.max(1, Math.floor((editingSession.presentation?.secondsPerPresenter ?? 300) / 60)))
    }

    hydratedEditRef.current = editingSessionId
  }, [
    editingSessionId,
    editingSession,
    classes,
    setTopic,
    setSelectedClassId,
    setSelectedStudentIds,
    setDebateMode,
    setTeacherGuided,
    setOrderedStages,
    setGroupCount,
    setAffirmativeSlots,
    setNegativeSlots,
    setModeratorSlots,
    setGroupSlotAdjust,
    setGroupAssignments,
    setArgumentCards,
    setDebateStep,
    setPresenterOrderIds,
    setRecordingStudentIds,
    setPresentationMinutesPerStudent,
  ])

  useEffect(() => {
    if (affirmativeSlots < 0) setAffirmativeSlots(0)
    if (negativeSlots < 0) setNegativeSlots(0)
    if (moderatorSlots < 0) setModeratorSlots(0)
  }, [affirmativeSlots, negativeSlots, moderatorSlots])

  const {
    selectedCount,
    slotCapacity,
    debateGroupsPreview,
    affirmativeStudents,
    negativeStudents,
    moderatorStudents,
  } = useDebateAssignment({
    isDebate,
    selectedStudents,
    studentMap,
    teacherGuided,
    teacherModerator,
    groupCount,
    setGroupCount,
    affirmativeSlots,
    negativeSlots,
    moderatorSlots,
    groupSlotAdjust,
    setGroupSlotAdjust,
    groupAssignments,
    setGroupAssignments,
    dragStudentId,
    setDragStudentId,
    randomDialogOpen: flow.randomDialogOpen,
    setRandomDialogOpen: flow.setRandomDialogOpen,
    randomDraft: flow.randomDraft,
    setRandomDraft: flow.setRandomDraft,
    randomDrag: flow.randomDrag,
    setRandomDrag: flow.setRandomDrag,
  })

  const handleClassChange = useCallback((classId: string) => {
    setSelectedClassId(classId)
    const cls = classes.find((c) => c.id === classId)
    if (!cls) {
      setSelectedStudentIds(new Set())
      setPresenterOrderIds([])
      setRecordingStudentIds(new Set())
      setGroupAssignments({})
      setGroupSlotAdjust({})
      return
    }
    const ids = cls.students.map((s) => s.id)
    setSelectedStudentIds(new Set(ids))
    setPresenterOrderIds(ids)
    setRecordingStudentIds(new Set(ids))
    setGroupAssignments({})
    setGroupSlotAdjust({})
    setGroupCount(2)
    if (isDebate) setDebateStep("headcount")
  }, [
    classes,
    isDebate,
    setDebateStep,
    setGroupAssignments,
    setGroupCount,
    setGroupSlotAdjust,
    setPresenterOrderIds,
    setRecordingStudentIds,
    setSelectedClassId,
    setSelectedStudentIds,
  ])

  const toggleStudent = useCallback((studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })

    setPresenterOrderIds((prev) => {
      const exists = prev.includes(studentId)
      if (exists) return prev.filter((id) => id !== studentId)
      return [...prev, studentId]
    })

    setRecordingStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }, [])

  const selectedPresentationPresenters = useMemo(() => {
    return presenterOrderIds
      .map((id) => studentMap.get(id))
      .filter((student): student is Student => student !== undefined)
      .filter((student) => selectedStudentIds.has(student.id))
      .map((student) => ({
        student,
        recordingEnabled: recordingStudentIds.has(student.id),
      }))
  }, [presenterOrderIds, studentMap, selectedStudentIds, recordingStudentIds])

  const toggleRecordingStudent = (studentId: string) => {
    setRecordingStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const movePresenterOrder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= presenterOrderIds.length || to >= presenterOrderIds.length) return
    const next = [...presenterOrderIds]
    const [picked] = next.splice(from, 1)
    next.splice(to, 0, picked)
    setPresenterOrderIds(next)
  }

  const presentationReady = !isDebate && selectedCount > 0 && presentationMinutesPerStudent > 0
  const canGoHeadcount = Boolean(selectedClass && selectedStudentIds.size > 0)
  const hasAnyNonRecordingStudent = useMemo(
    () => Array.from(selectedStudentIds).some((id) => !recordingStudentIds.has(id)),
    [selectedStudentIds, recordingStudentIds]
  )
  const shouldUseCardsStep = isDebate && hasAnyNonRecordingStudent
  const canGoCards = canGoHeadcount && shouldUseCardsStep
  const hasEnoughSlots = slotCapacity >= selectedCount
  const orderedFlowValid =
    debateMode !== "Ordered" ||
    orderedStages.some((stage) => stage.enabled && Number.isFinite(stage.minutes) && stage.minutes > 0)
  const { cardsReady, openCardsStep } = useDebateCards({
    isDebate,
    debateStep,
    topic,
    argumentCards,
    setArgumentCards,
    setIsGeneratingCards,
    setDebateStep,
  })
  useEffect(() => {
    if (!isDebate) return
    if (shouldUseCardsStep) return
    if (debateStep === "cards") setDebateStep("headcount")
  }, [isDebate, shouldUseCardsStep, debateStep, setDebateStep])

  const cardsReadyForCreate = shouldUseCardsStep ? cardsReady : true
  const canCreate = Boolean(
    selectedClassId &&
      (isDebate ? orderedFlowValid && cardsReadyForCreate && hasEnoughSlots : presentationReady)
  )

  const buildCreateInput = (): Parameters<typeof create>[0] | null => {
    if (!selectedClass || !canCreate) return null
    return buildCreateSessionInput({
      sessionType,
      topic,
      selectedClass: { id: selectedClass.id, name: selectedClass.name },
      debateMode,
      teacherGuided,
      orderedStages,
      groupCount,
      affirmativeSlots,
      negativeSlots,
      moderatorSlots,
      selectedStudentIds,
      recordingStudentIds,
      groupAssignments,
      affirmativeStudents,
      negativeStudents,
      moderatorStudents,
      groupSlotAdjust,
      debateGroupsPreview,
      argumentCards,
      selectedPresentationPresenters,
      presentationMinutesPerStudent,
    })
  }

  const handleCreateSession = () => {
    const input = buildCreateInput()
    if (!input) return

    if (editingSessionId) {
      const updated = overwrite(editingSessionId, input)
      if (!updated) return
      router.push(`/teacher/sessions/${updated.id}`)
      return
    }

    const created = create(input)
    router.push(`/teacher/sessions/${created.id}`)
  }

  const handleSaveAndExit = () => {
    const input = buildCreateInput()
    if (!input) return

    if (editingSessionId) overwrite(editingSessionId, input)
    else create(input)
    router.push("/teacher/sessions")
  }

  return (
    <div className="mx-auto max-w-5xl">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="mb-6 text-xl font-semibold text-foreground">
        {isEditMode ? "세션 수정" : `Create ${isDebate ? "Debate" : "Presentation"} Session`}
      </h1>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="topic">주제</Label>
          <Input
            id="topic"
            placeholder={isDebate ? "토론 주제를 입력하세요" : "발표 주제를 입력하세요"}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        {isDebate ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={debateStep === "setup" ? "default" : "outline"}
              onClick={() => setDebateStep("setup")}
            >
              1. 세션 설정
            </Button>
            <Button
              type="button"
              size="sm"
              variant={debateStep === "headcount" ? "default" : "outline"}
              onClick={() => setDebateStep("headcount")}
            >
              2. 인원 설정
            </Button>
            {shouldUseCardsStep ? (
              <Button
                type="button"
                size="sm"
                variant={debateStep === "cards" ? "default" : "outline"}
                onClick={() => openCardsStep(false)}
                disabled={!canGoCards}
              >
                3. 논거카드 검수
              </Button>
            ) : null}
          </div>
        ) : null}

        <DebateRosterStep
          isDebate={isDebate}
          debateStep={debateStep}
          debateMode={debateMode}
          teacherGuided={teacherGuided}
          orderedStages={orderedStages}
          orderedFlowValid={orderedFlowValid}
          onDebateModeChange={setDebateMode}
          onTeacherGuidedChange={setTeacherGuided}
          onStageToggle={(stageId) =>
            setOrderedStages((prev) => prev.map((item) => (item.id === stageId ? { ...item, enabled: !item.enabled } : item)))
          }
          onStageMinutesChange={(stageId, minutes) =>
            setOrderedStages((prev) => prev.map((item) => (item.id === stageId ? { ...item, minutes } : item)))
          }
          onGoHeadcount={() => setDebateStep("headcount")}
        />

        {(isDebate ? debateStep === "headcount" : true) ? (
          <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
            <div className="flex flex-col gap-2">
              <Label>학급</Label>
              <Select value={selectedClassId} onValueChange={handleClassChange}>
                <SelectTrigger>
                  <SelectValue placeholder="학급 선택" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClass ? (
              <div className="flex flex-col gap-2">
                <Label>명단 ({selectedStudentIds.size}명 선택)</Label>
                <div className="divide-y divide-border rounded-lg border border-border">
                  {selectedClass.students.map((student) => {
                    const isSelected = selectedStudentIds.has(student.id)
                    return (
                      <div key={student.id} className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50">
                        <label className="flex cursor-pointer items-center gap-3">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleStudent(student.id)} />
                          <span className="text-sm text-foreground">{student.name}</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                          <Checkbox
                            checked={recordingStudentIds.has(student.id)}
                            disabled={!isSelected}
                            onCheckedChange={() => toggleRecordingStudent(student.id)}
                          />
                          녹음
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {isDebate ? (
              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded-md border border-border p-2">
                  <p className="mb-1 text-xs text-muted-foreground">조 수</p>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => setGroupCount((v) => Math.max(1, v - 1))}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input type="number" min={1} value={groupCount} onChange={(e) => setGroupCount(Math.max(1, Number(e.target.value) || 1))} className="h-7 text-center" />
                    <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => setGroupCount((v) => v + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border border-border p-2">
                  <p className="mb-1 text-xs text-muted-foreground">찬반 슬롯/조</p>
                  <Input
                    type="number"
                    min={0}
                    value={Math.max(affirmativeSlots, negativeSlots)}
                    onChange={(e) => {
                      const next = Math.max(0, Number(e.target.value) || 0)
                      setAffirmativeSlots(next)
                      setNegativeSlots(next)
                    }}
                    className="h-7 text-center"
                  />
                </div>

                <div className="rounded-md border border-border p-2">
                  <p className="mb-1 text-xs text-muted-foreground">진행자 슬롯/조</p>
                  <Input type="number" min={0} value={moderatorSlots} onChange={(e) => setModeratorSlots(Math.max(0, Number(e.target.value) || 0))} className="h-7 text-center" />
                </div>
              </div>
            ) : null}

            {isDebate ? (
              <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                총 슬롯 {slotCapacity}칸 / 선택 학생 {selectedCount}명
              </div>
            ) : null}

            {isDebate && !hasEnoughSlots && selectedCount > 0 ? (
              <p className="text-xs text-destructive">선택 학생을 모두 배치하려면 슬롯 수를 늘려야 합니다.</p>
            ) : null}

            {isDebate && shouldUseCardsStep ? (
              <div className="flex justify-end">
                <Button type="button" onClick={() => openCardsStep(false)} disabled={!canGoCards}>
                  논거카드 검수로 이동
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {shouldUseCardsStep ? (
          <DebateCardsStep
            isDebate={isDebate}
            debateStep={debateStep}
            isGeneratingCards={isGeneratingCards}
            cardsReady={cardsReady}
            argumentCards={argumentCards}
            onOpenCardsStep={openCardsStep}
            onSetArgumentCards={setArgumentCards}
          />
        ) : null}

        <PresentationConfigStep
          isDebate={isDebate}
          hasSelectedClass={Boolean(selectedClass)}
          selectedStudentCount={selectedStudentIds.size}
          presentationMinutesPerStudent={presentationMinutesPerStudent}
          selectedPresentationPresenters={selectedPresentationPresenters}
          onMinutesChange={setPresentationMinutesPerStudent}
          onToggleRecordingStudent={toggleRecordingStudent}
          onMovePresenterOrder={movePresenterOrder}
        />

        {(!isDebate || debateStep === "cards" || (isDebate && !shouldUseCardsStep && debateStep === "headcount")) && (
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <Button size="lg" variant="outline" disabled={!canCreate} onClick={handleSaveAndExit}>
              저장
            </Button>
            <Button size="lg" disabled={!canCreate} onClick={handleCreateSession}>
              세션 실행
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function CreateSessionPageContent() {
  return <CreateSessionContent />
}
