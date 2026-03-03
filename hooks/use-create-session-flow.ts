"use client"

import { useState } from "react"
import type { Student } from "@/lib/mock-data"
import type {
  ArgumentCard,
  DraftPool,
  GroupAssignment,
  GroupSlotAdjust,
  OrderedStageConfig,
  RandomDraft,
} from "@/lib/domain/session/create-session"

export function useCreateSessionFlow() {
  const [topic, setTopic] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [debateMode, setDebateMode] = useState<"Ordered" | "Free">("Ordered")
  const [teacherGuided, setTeacherGuided] = useState<"guided" | "unguided">("unguided")
  const [orderedStages, setOrderedStages] = useState<OrderedStageConfig[]>([
    { id: "opening", label: "입론", enabled: true, minutes: 2 },
    { id: "crossQuestion", label: "교차질문", enabled: true, minutes: 1 },
    { id: "rebuttal", label: "반론", enabled: true, minutes: 2 },
    { id: "surrebuttal", label: "재반론", enabled: true, minutes: 2 },
    { id: "closing", label: "마무리", enabled: true, minutes: 2 },
  ])

  const [groupCount, setGroupCount] = useState(2)
  const [affirmativeSlots, setAffirmativeSlots] = useState(2)
  const [negativeSlots, setNegativeSlots] = useState(2)
  const [moderatorSlots, setModeratorSlots] = useState(1)
  const [groupSlotAdjust, setGroupSlotAdjust] = useState<Record<string, GroupSlotAdjust>>({})

  const [groupAssignments, setGroupAssignments] = useState<Record<string, GroupAssignment>>({})
  const [dragStudentId, setDragStudentId] = useState<string | null>(null)
  const [randomDialogOpen, setRandomDialogOpen] = useState(false)
  const [randomDraft, setRandomDraft] = useState<RandomDraft>({
    unassigned: [],
    affirmative: [],
    negative: [],
    moderator: [],
  })
  const [randomDrag, setRandomDrag] = useState<{ id: string; from: DraftPool } | null>(null)
  const [debateStep, setDebateStep] = useState<"setup" | "cards" | "headcount" | "placement">("setup")
  const [argumentCards, setArgumentCards] = useState<ArgumentCard[]>([])
  const [isGeneratingCards, setIsGeneratingCards] = useState(false)

  const [presentationMinutesPerStudent, setPresentationMinutesPerStudent] = useState(5)
  const [presenterOrderIds, setPresenterOrderIds] = useState<string[]>([])
  const [recordingStudentIds, setRecordingStudentIds] = useState<Set<string>>(new Set())

  const teacherModeratorFromClass = (isDebate: boolean, selectedClass?: { id: string; name: string } | null): Student | null => {
    if (!isDebate || teacherGuided !== "guided" || !selectedClass) return null
    return {
      id: `teacher-${selectedClass.id}`,
      name: "선생님",
      classId: selectedClass.id,
      className: selectedClass.name,
    }
  }

  return {
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
    randomDialogOpen,
    setRandomDialogOpen,
    randomDraft,
    setRandomDraft,
    randomDrag,
    setRandomDrag,
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
  }
}
