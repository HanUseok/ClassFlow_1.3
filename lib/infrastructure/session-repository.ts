import type { SessionRepository } from "@/lib/application/ports/session-repository"
import {
  createSession,
  deleteAllSessions,
  deleteSession,
  getSessionById,
  readSessions,
  replaceSessionFromInput,
  subscribeSessions,
  updateSession,
  updateSessionDebateGroups,
  updateSessionStatus,
  updateSessionTeams,
} from "@/lib/mock-session-store"

export const localSessionRepository: SessionRepository = {
  list: readSessions,
  getById: getSessionById,
  create: createSession,
  updateStatus: updateSessionStatus,
  updateTeams: updateSessionTeams,
  updateDebateGroups: updateSessionDebateGroups,
  update: updateSession,
  replaceFromInput: replaceSessionFromInput,
  remove: deleteSession,
  removeAll: deleteAllSessions,
  subscribe: subscribeSessions,
}
