import type { Session, SessionStatus } from "@/lib/mock-data"
import type { CreateSessionInput, UpdateSessionInput } from "@/lib/mock-session-store"

export type SessionRepository = {
  list: () => Session[]
  getById: (sessionId: string) => Session | null
  create: (input: CreateSessionInput) => Session
  updateStatus: (sessionId: string, status: SessionStatus) => Session | null
  updateTeams: (sessionId: string, teams: NonNullable<Session["teams"]>) => Session | null
  updateDebateGroups: (
    sessionId: string,
    groups: NonNullable<NonNullable<Session["debate"]>["groups"]>
  ) => Session | null
  update: (sessionId: string, input: UpdateSessionInput) => Session | null
  replaceFromInput: (sessionId: string, input: CreateSessionInput) => Session | null
  remove: (sessionId: string) => boolean
  removeAll: () => void
  subscribe: (listener: () => void) => () => void
}
