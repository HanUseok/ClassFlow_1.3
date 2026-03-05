import type { Session, Student } from "@/lib/mock-data"

export const PHASE = {
  OPENING: "Opening",
  REBUTTAL: "Rebuttal",
  REREBUTTAL: "Rerebuttal",
  FINAL_SUMMARY: "FinalSummary",
} as const

export type PhaseKey = (typeof PHASE)[keyof typeof PHASE]
export type DebateMode = "Ordered" | "Free"

export type DebateMember = {
  id: string
  name: string
  roleLabel: string
  team: "team1" | "team2"
}

export type SpeechProgressState = {
  phase: PhaseKey
  currentSpeakerIndex: number
  speakerCount: number
  debateMode: DebateMode
  finalSpeechCompleted: boolean
}

export type ReportLogItem = {
  phase: string
  speaker: string
  argumentCard: string
  argumentKeyword: string
  thinkingCard: string
  thinkingKeyword: string
}

export type ReportPayloadInput = {
  names: string[]
  round: number
  phase: string
  logs: ReportLogItem[]
  sessionId?: string
  teacherGuided?: boolean
  sessionTitle?: string
  sessionStatus?: "Pending" | "Live" | "Ended"
  groupCount?: number
  groupLayout?: string
}

export type DebateGroup = NonNullable<NonNullable<Session["debate"]>["groups"]>[number]

export const PHASE_ORDER: PhaseKey[] = [
  PHASE.OPENING,
  PHASE.REBUTTAL,
  PHASE.REREBUTTAL,
  PHASE.FINAL_SUMMARY,
]

export function createDebateFlowState(params?: Partial<SpeechProgressState>): SpeechProgressState {
  return {
    phase: PHASE.OPENING,
    currentSpeakerIndex: 0,
    speakerCount: 0,
    debateMode: "Ordered",
    finalSpeechCompleted: false,
    ...params,
  }
}

export function advanceDebateFlow(state: SpeechProgressState) {
  if (state.speakerCount <= 0) {
    return {
      ...state,
      finalSpeechCompleted: false,
      completed: false,
    }
  }

  if (state.debateMode === "Free") {
    return {
      ...state,
      finalSpeechCompleted: false,
      completed: false,
    }
  }

  const phaseIndex = PHASE_ORDER.indexOf(state.phase)
  const normalizedPhaseIndex = phaseIndex < 0 ? 0 : phaseIndex
  const isLastPhase = normalizedPhaseIndex === PHASE_ORDER.length - 1
  const isLastSpeaker = state.currentSpeakerIndex >= state.speakerCount - 1

  if (isLastPhase && isLastSpeaker) {
    return {
      ...state,
      finalSpeechCompleted: true,
      completed: true,
    }
  }

  if (!isLastSpeaker) {
    return {
      ...state,
      currentSpeakerIndex: state.currentSpeakerIndex + 1,
      finalSpeechCompleted: false,
      completed: false,
    }
  }

  return {
    ...state,
    phase: PHASE_ORDER[Math.min(PHASE_ORDER.length - 1, normalizedPhaseIndex + 1)],
    currentSpeakerIndex: 0,
    finalSpeechCompleted: false,
    completed: false,
  }
}

export const advancePhase = advanceDebateFlow

export function canEndDebate(state: SpeechProgressState) {
  if (state.speakerCount <= 0) return false
  if (state.debateMode === "Free") return true
  return state.finalSpeechCompleted
}

export function isStudentPlacedInGroup(group: DebateGroup | undefined, studentId: string) {
  if (!group || !studentId) return false
  return (
    group.affirmative.some((student) => student.id === studentId) ||
    group.negative.some((student) => student.id === studentId) ||
    group.moderator?.id === studentId
  )
}

export function getStationPlacementStatus(groups: DebateGroup[], seatConfig = { affirmative: 2, negative: 2, moderator: 1 }) {
  return groups.map((group, index) => {
    const requiredTotal = seatConfig.affirmative + seatConfig.negative + seatConfig.moderator
    const placedTotal = group.affirmative.length + group.negative.length + (group.moderator ? 1 : 0)
    return {
      groupId: group.id,
      label: `${index + 1}조`,
      placedTotal,
      requiredTotal,
      done: requiredTotal === 0 ? placedTotal > 0 : placedTotal >= requiredTotal,
    }
  })
}

export function buildDebateGroups(session: Session, targetCount: number): DebateGroup[] {
  const count = Math.max(1, targetCount)
  const team1 = session.teams?.team1 ?? []
  const team2 = session.teams?.team2 ?? []
  const moderators = session.debate?.moderators ?? []

  const groups: DebateGroup[] = Array.from({ length: count }, (_, index) => ({
    id: `group-${index + 1}`,
    affirmative: [],
    negative: [],
    moderator: moderators[index],
  }))

  team1.forEach((student, index) => {
    groups[index % count].affirmative.push(student)
  })
  team2.forEach((student, index) => {
    groups[index % count].negative.push(student)
  })

  return groups
}

export function mergeGroupMembers(group: DebateGroup): DebateMember[] {
  const maxLength = Math.max(group.affirmative.length, group.negative.length)
  const merged: DebateMember[] = []

  for (let i = 0; i < maxLength; i += 1) {
    const a = group.affirmative[i]
    if (a) merged.push({ id: a.id, name: a.name, roleLabel: `찬성 ${i + 1}`, team: "team1" })
    const n = group.negative[i]
    if (n) merged.push({ id: n.id, name: n.name, roleLabel: `반대 ${i + 1}`, team: "team2" })
  }

  return merged
}

export function reorderSpeakers(group: DebateGroup, from: number, to: number): DebateGroup {
  const merged = mergeGroupMembers(group)
  if (from === to || from < 0 || to < 0 || from >= merged.length || to >= merged.length) return group

  const reordered = [...merged]
  const [picked] = reordered.splice(from, 1)
  reordered.splice(to, 0, picked)

  const affMap = new Map(group.affirmative.map((student) => [student.id, student]))
  const negMap = new Map(group.negative.map((student) => [student.id, student]))
  const nextAffirmative: Student[] = []
  const nextNegative: Student[] = []

  reordered.forEach((member) => {
    if (member.team === "team1") {
      const found = affMap.get(member.id)
      if (found) nextAffirmative.push(found)
      return
    }
    const found = negMap.get(member.id)
    if (found) nextNegative.push(found)
  })

  return {
    ...group,
    affirmative: nextAffirmative,
    negative: nextNegative,
  }
}

export function buildFreeModeImaginedLogs(members: { id: string; name: string; roleLabel: string }[]): ReportLogItem[] {
  const argumentCards = [
    "1) 뇌 발달/중독 메커니즘",
    "2) 학습권/집중력 저하",
    "3) 수면권/건강권",
    "4) 자기결정권/자율성",
    "5) 실효성/우회 가능성",
    "6) 규제보다 미디어 교육",
  ]
  const thinkingCards = ["적용", "인과 설명", "비교", "한계 지적", "반례 제시", "전제 분석", "자료 보완", "입장 수정"]
  const phases: PhaseKey[] = [PHASE.OPENING, PHASE.REBUTTAL, PHASE.REREBUTTAL, PHASE.FINAL_SUMMARY]

  return members.map((member, idx) => {
    const argumentCard = argumentCards[idx % argumentCards.length]
    const thinkingCard = thinkingCards[idx % thinkingCards.length]
    return {
      phase: phases[idx % phases.length],
      speaker: `${member.roleLabel} ${member.name}`.trim(),
      argumentCard,
      argumentKeyword: `${argumentCard} 근거를 자유토론 맥락에서 확장`,
      thinkingCard,
      thinkingKeyword: `${thinkingCard} 중심으로 상대 주장과 쟁점을 조정`,
    }
  })
}

export function buildReportPayload(input: ReportPayloadInput) {
  const params = new URLSearchParams({
    names: input.names.join("|"),
    round: String(input.round),
    phase: input.phase,
    logs: JSON.stringify(input.logs),
  })

  if (input.sessionId) params.set("sessionId", input.sessionId)
  if (input.teacherGuided !== undefined) params.set("teacherGuided", input.teacherGuided ? "1" : "0")
  if (input.sessionTitle) params.set("sessionTitle", input.sessionTitle)
  if (input.sessionStatus) params.set("sessionStatus", input.sessionStatus)
  if (input.groupCount && input.groupCount > 0) params.set("groupCount", String(input.groupCount))
  if (input.groupLayout) params.set("groupLayout", input.groupLayout)

  return `/station/report?${params.toString()}`
}

export function collectUniqueMembers(groups: DebateGroup[]) {
  const allMembers = groups.flatMap((group) => mergeGroupMembers(group))
  const seen = new Set<string>()

  return allMembers.filter((member) => {
    if (seen.has(member.id)) return false
    seen.add(member.id)
    return true
  })
}
