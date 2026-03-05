import { sessions as seedSessions, type Session, type SessionStatus, type SessionType, type Student } from "@/lib/mock-data"

const STORAGE_KEY = "classflow.mock.sessions.v1"
const STORE_EVENT = "classflow:sessions:changed"

type TeamGroup = { team1: Student[]; team2: Student[] }
type PresentationConfig = {
  presenters: {
    student: Student
    recordingEnabled: boolean
  }[]
  secondsPerPresenter: number
}
type DebateConfig = {
  argumentCards?: {
    id: string
    title: string
    claim: string
    evidenceHint?: string
    side?: "affirmative" | "negative" | "neutral"
    enabled: boolean
  }[]
  mode?: "Ordered" | "Free"
  teacherGuided?: boolean
  orderedFlow?: {
    stages: {
      id: "opening" | "crossQuestion" | "rebuttal" | "surrebuttal" | "closing"
      label: string
      enabled: boolean
      minutes: number
    }[]
  }
  membersPerGroup: 4 | 6
  moderators: Student[]
  groups: {
    id: string
    affirmative: Student[]
    negative: Student[]
    moderator?: Student
  }[]
  assignmentConfig?: {
    groupCount: number
    affirmativeSlots: number
    negativeSlots: number
    moderatorSlots: number
    selectedStudentIds?: string[]
    recordingStudentIds?: string[]
    groupAssignments?: Record<
      string,
      {
        affirmative: (string | null)[]
        negative: (string | null)[]
        moderator: (string | null)[]
      }
    >
    groupSlotAdjust?: Record<
      string,
      {
        affirmative: number
        negative: number
        moderator: number
      }
    >
  }
}
type DebateGroups = DebateConfig["groups"]

export type CreateSessionInput = {
  type: SessionType
  topic?: string
  classId: string
  className: string
  title: string
  date?: string
  teams?: TeamGroup
  debate?: DebateConfig
  presentation?: PresentationConfig
}

export type UpdateSessionInput = {
  title?: string
  topic?: string
}

function cloneSeedSessions() {
  return seedSessions.map((session) => ({ ...session }))
}

function normalizeSessions(value: unknown): Session[] {
  if (!Array.isArray(value)) return cloneSeedSessions()
  const parsed = value as Session[]
  if (parsed.length === 0) return cloneSeedSessions()
  return parsed
}

export function readSessions(): Session[] {
  if (typeof window === "undefined") return cloneSeedSessions()

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const initial = cloneSeedSessions()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  }

  try {
    return normalizeSessions(JSON.parse(raw))
  } catch {
    const fallback = cloneSeedSessions()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    return fallback
  }
}

function writeSessions(next: Session[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(STORE_EVENT))
}

function nowDateString() {
  return new Date().toISOString().slice(0, 10)
}

export function createSession(input: CreateSessionInput): Session {
  const nextSession: Session = {
    id: `sess-${Date.now()}`,
    type: input.type,
    status: "Pending",
    classId: input.classId,
    className: input.className,
    title: input.title,
    topic: input.topic?.trim() ? input.topic.trim() : undefined,
    date: input.date ?? nowDateString(),
    teams: input.teams,
    debate: input.debate,
    presentation: input.presentation,
  }

  const current = readSessions()
  const next = [nextSession, ...current]
  writeSessions(next)
  return nextSession
}

export function updateSessionStatus(sessionId: string, status: SessionStatus): Session | null {
  const current = readSessions()
  let updated: Session | null = null

  const next = current.map((session) => {
    if (session.id !== sessionId) return session
    updated = { ...session, status }
    return updated
  })

  if (!updated) return null
  writeSessions(next)
  return updated
}

export function updateSessionTeams(sessionId: string, teams: TeamGroup): Session | null {
  const current = readSessions()
  let updated: Session | null = null

  const next = current.map((session) => {
    if (session.id !== sessionId) return session
    updated = { ...session, teams }
    return updated
  })

  if (!updated) return null
  writeSessions(next)
  return updated
}

export function updateSessionDebateGroups(sessionId: string, groups: DebateGroups): Session | null {
  const current = readSessions()
  let updated: Session | null = null

  const next = current.map((session) => {
    if (session.id !== sessionId) return session
    updated = {
      ...session,
      debate: session.debate
        ? { ...session.debate, groups }
        : {
            membersPerGroup: 4,
            moderators: [],
            groups,
          },
    }
    return updated
  })

  if (!updated) return null
  writeSessions(next)
  return updated
}

export function getSessionById(sessionId: string): Session | null {
  return readSessions().find((session) => session.id === sessionId) ?? null
}

export function updateSession(sessionId: string, input: UpdateSessionInput): Session | null {
  const current = readSessions()
  let updated: Session | null = null

  const next = current.map((session) => {
    if (session.id !== sessionId) return session
    updated = {
      ...session,
      title: input.title !== undefined ? input.title : session.title,
      topic:
        input.topic !== undefined
          ? input.topic.trim()
            ? input.topic.trim()
            : undefined
          : session.topic,
    }
    return updated
  })

  if (!updated) return null
  writeSessions(next)
  return updated
}

export function replaceSessionFromInput(sessionId: string, input: CreateSessionInput): Session | null {
  const current = readSessions()
  let updated: Session | null = null

  const next = current.map((session) => {
    if (session.id !== sessionId) return session
    updated = {
      ...session,
      type: input.type,
      classId: input.classId,
      className: input.className,
      title: input.title,
      topic: input.topic?.trim() ? input.topic.trim() : undefined,
      teams: input.teams,
      debate: input.debate,
      presentation: input.presentation,
    }
    return updated
  })

  if (!updated) return null
  writeSessions(next)
  return updated
}

export function deleteSession(sessionId: string): boolean {
  const current = readSessions()
  const next = current.filter((session) => session.id !== sessionId)
  if (next.length === current.length) return false
  writeSessions(next)
  return true
}

export function deleteAllSessions(): void {
  writeSessions([])
}

export function subscribeSessions(listener: () => void) {
  if (typeof window === "undefined") return () => {}

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener()
  }

  window.addEventListener(STORE_EVENT, listener)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(STORE_EVENT, listener)
    window.removeEventListener("storage", onStorage)
  }
}
