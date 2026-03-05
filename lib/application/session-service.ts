import type { Session, SessionStatus } from "@/lib/mock-data"
import {
  buildReportPayload,
  buildFreeModeImaginedLogs,
  type DebateMode,
  type DebateGroup,
  type ReportLogItem,
  type ReportPayloadInput,
} from "@/lib/domain/session"
import { localSessionRepository } from "@/lib/infrastructure/session-repository"
import type { SessionRepository } from "@/lib/application/ports/session-repository"
import type { CreateSessionInput, UpdateSessionInput } from "@/lib/mock-session-store"

export type { CreateSessionInput, UpdateSessionInput }
export type ParticipantStartStatus = "idle" | "requesting" | "ready" | "running"

let repository: SessionRepository = localSessionRepository

export function configureSessionRepository(nextRepository: SessionRepository) {
  repository = nextRepository
}

export function listSessions() {
  return repository.list()
}

export function getSession(sessionId: string) {
  return repository.getById(sessionId)
}

export function createSession(input: CreateSessionInput) {
  return repository.create(input)
}

export function createDebateSession(input: Omit<CreateSessionInput, "type">) {
  return repository.create({ ...input, type: "Debate" })
}

export function createPresentationSession(input: Omit<CreateSessionInput, "type">) {
  return repository.create({ ...input, type: "Presentation" })
}

export function startSession(sessionId: string) {
  return repository.updateStatus(sessionId, "Live")
}

export function endSession(sessionId: string) {
  return repository.updateStatus(sessionId, "Ended")
}

export function startDebateSession(sessionId: string) {
  return startSession(sessionId)
}

export function finishDebateSession(sessionId: string, reportInput?: ReportPayloadInput) {
  const session = repository.updateStatus(sessionId, "Ended")
  return {
    session,
    reportPath: reportInput ? buildSessionReportPath(reportInput) : null,
  }
}

export function setSessionStatus(sessionId: string, status: SessionStatus) {
  return repository.updateStatus(sessionId, status)
}

export function updateSessionBasics(sessionId: string, input: UpdateSessionInput) {
  return repository.update(sessionId, input)
}

export function overwriteSessionFromInput(sessionId: string, input: CreateSessionInput) {
  return repository.replaceFromInput(sessionId, input)
}

export function assignGroups(sessionId: string, groups: DebateGroup[]) {
  return repository.updateDebateGroups(sessionId, groups)
}

export function assignTeams(sessionId: string, teams: NonNullable<Session["teams"]>) {
  return repository.updateTeams(sessionId, teams)
}

export function deleteSession(sessionId: string) {
  return repository.remove(sessionId)
}

export function deleteAllSessions() {
  repository.removeAll()
}

export function subscribeSessionChanges(listener: () => void) {
  return repository.subscribe(listener)
}

export function saveSpeech(history: ReportLogItem[], log: ReportLogItem, limit: number) {
  const next = [...history, log]
  if (limit <= 0) return next
  return next.slice(-limit)
}

export function buildSessionReportPath(input: ReportPayloadInput) {
  return buildReportPayload(input)
}

export function startParticipantSpeech(params: {
  debateMode: DebateMode
  status: ParticipantStartStatus
  isCurrentSpeakerSelf: boolean
  requestDelayMs?: number
}) {
  const { debateMode, status, isCurrentSpeakerSelf, requestDelayMs = 3000 } = params

  if (debateMode === "Ordered") {
    if (!isCurrentSpeakerSelf) {
      return { nextStatus: status, shouldStartSpeech: false, shouldRequest: false, requestDelayMs }
    }
    return { nextStatus: "running" as const, shouldStartSpeech: true, shouldRequest: false, requestDelayMs }
  }

  if (status === "idle") {
    return { nextStatus: "requesting" as const, shouldStartSpeech: false, shouldRequest: true, requestDelayMs }
  }

  if (status === "ready") {
    return { nextStatus: "running" as const, shouldStartSpeech: true, shouldRequest: false, requestDelayMs }
  }

  return { nextStatus: status, shouldStartSpeech: false, shouldRequest: false, requestDelayMs }
}

export function finishParticipantSpeech(params: {
  debateMode: DebateMode
  status: ParticipantStartStatus
  completedSpeeches: number
}) {
  const { debateMode, status, completedSpeeches } = params
  if (status !== "running") {
    return { nextStatus: status, shouldAdvanceOrderedFlow: false, completedSpeeches }
  }

  if (debateMode === "Free") {
    return {
      nextStatus: "idle" as const,
      shouldAdvanceOrderedFlow: false,
      completedSpeeches: completedSpeeches + 1,
    }
  }

  return {
    nextStatus: "idle" as const,
    shouldAdvanceOrderedFlow: true,
    completedSpeeches,
  }
}

export function completeStationDebate(params: {
  sessionId: string
  debateMode: DebateMode
  memberNames: string[]
  memberLabels?: string[]
  sessionTitle: string
  teacherGuided: boolean
  groupLayout: { affirmative: string[]; negative: string[] }[]
  round?: number
  personal?: boolean
  markSessionEnded?: boolean
}) {
  const {
    sessionId,
    debateMode,
    memberNames,
    memberLabels,
    sessionTitle,
    teacherGuided,
    groupLayout,
    round = 1,
    personal = false,
    markSessionEnded = true,
  } = params

  const session = markSessionEnded ? repository.updateStatus(sessionId, "Ended") : repository.getById(sessionId)
  const logs =
    debateMode === "Free" && !personal
      ? buildFreeModeImaginedLogs(
          (memberLabels ?? memberNames).map((value, index) => ({
            id: `m-${index + 1}`,
            name: memberNames[index] ?? value,
            roleLabel: memberLabels?.[index] ?? "",
          }))
        )
      : []

  const reportPath = buildSessionReportPath({
    names: memberNames,
    round,
    phase: debateMode === "Free" ? "자유토론" : "마무리",
    logs,
    sessionId,
    teacherGuided,
    sessionTitle,
    sessionStatus: "Ended",
    groupCount: groupLayout.length,
    groupLayout: JSON.stringify(groupLayout),
  })

  return { session, reportPath }
}
