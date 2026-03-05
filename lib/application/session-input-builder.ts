import type { Student } from "@/lib/mock-data"
import type { ArgumentCard, GroupAssignment, GroupSlotAdjust, OrderedStageConfig } from "@/lib/domain/session/create-session"
import type { CreateSessionInput } from "@/lib/mock-session-store"

type SelectedClassInfo = {
  id: string
  name: string
}

type PresentationPresenter = {
  student: Student
  recordingEnabled: boolean
}

type DebateGroupPreview = {
  id: string
  affirmative: Student[]
  negative: Student[]
  moderator?: Student
}

type BuildSessionInputParams = {
  sessionType: "Debate" | "Presentation"
  topic: string
  selectedClass: SelectedClassInfo
  debateMode: "Ordered" | "Free"
  teacherGuided: "guided" | "unguided"
  orderedStages: OrderedStageConfig[]
  groupCount: number
  affirmativeSlots: number
  negativeSlots: number
  moderatorSlots: number
  selectedStudentIds: Set<string>
  recordingStudentIds: Set<string>
  groupAssignments: Record<string, GroupAssignment>
  affirmativeStudents: Student[]
  negativeStudents: Student[]
  moderatorStudents: Student[]
  groupSlotAdjust: Record<string, GroupSlotAdjust>
  debateGroupsPreview: DebateGroupPreview[]
  argumentCards: ArgumentCard[]
  selectedPresentationPresenters: PresentationPresenter[]
  presentationMinutesPerStudent: number
}

export function buildCreateSessionInput(params: BuildSessionInputParams): CreateSessionInput {
  const isDebate = params.sessionType === "Debate"
  const normalizedTopic = params.topic.trim()
  const title = normalizedTopic || (isDebate ? "토론 세션" : "발표 세션")
  const membersPerGroup = params.affirmativeSlots + params.negativeSlots <= 4 ? 4 : 6

  return {
    type: params.sessionType,
    title,
    topic: params.topic,
    classId: params.selectedClass.id,
    className: params.selectedClass.name,
    teams: isDebate
      ? {
          team1: params.affirmativeStudents,
          team2: params.negativeStudents,
        }
      : undefined,
    debate: isDebate
      ? {
          mode: params.debateMode,
          teacherGuided: params.teacherGuided === "guided",
          orderedFlow:
            params.debateMode === "Ordered"
              ? {
                  stages: params.orderedStages.map((stage) => ({
                    ...stage,
                    minutes: Math.max(1, Math.floor(stage.minutes || 1)),
                  })),
                }
              : undefined,
          membersPerGroup,
          moderators: params.moderatorStudents,
          groups: params.debateGroupsPreview.map((group) => ({
            id: group.id,
            affirmative: group.affirmative,
            negative: group.negative,
            moderator: group.moderator,
          })),
          assignmentConfig: {
            groupCount: Math.max(1, params.groupCount),
            affirmativeSlots: Math.max(0, params.affirmativeSlots),
            negativeSlots: Math.max(0, params.negativeSlots),
            moderatorSlots: Math.max(0, params.moderatorSlots ?? 0),
            selectedStudentIds: Array.from(params.selectedStudentIds),
            recordingStudentIds: Array.from(params.recordingStudentIds),
            groupAssignments: params.groupAssignments,
            groupSlotAdjust: params.groupSlotAdjust,
          },
          argumentCards: params.argumentCards.map((card) => ({
            id: card.id,
            title: card.title.trim(),
            claim: card.claim.trim(),
            evidenceHint: card.evidenceHint,
            side: card.side,
            enabled: card.enabled,
          })),
        }
      : undefined,
    presentation: isDebate
      ? undefined
      : {
          presenters: params.selectedPresentationPresenters,
          secondsPerPresenter: params.presentationMinutesPerStudent * 60,
        },
  }
}

export const buildSessionInput = buildCreateSessionInput
