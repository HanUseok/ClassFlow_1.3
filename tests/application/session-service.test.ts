import { afterEach, describe, expect, it } from "vitest"
import type { Session } from "../../lib/mock-data"
import type { SessionRepository } from "../../lib/application/ports/session-repository"
import {
  configureSessionRepository,
  createDebateSession,
  finishDebateSession,
  startDebateSession,
} from "../../lib/application/session-service"

function createMemoryRepository(): SessionRepository {
  let sessions: Session[] = []

  return {
    list: () => sessions,
    getById: (sessionId) => sessions.find((session) => session.id === sessionId) ?? null,
    create: (input) => {
      const session: Session = {
        id: `sess-${sessions.length + 1}`,
        status: "Pending",
        date: "2026-02-28",
        ...input,
      }
      sessions = [session, ...sessions]
      return session
    },
    updateStatus: (sessionId, status) => {
      let updated: Session | null = null
      sessions = sessions.map((session) => {
        if (session.id !== sessionId) return session
        updated = { ...session, status }
        return updated
      })
      return updated
    },
    updateTeams: () => null,
    updateDebateGroups: () => null,
    update: () => null,
    replaceFromInput: (sessionId, input) => {
      let updated: Session | null = null
      sessions = sessions.map((session) => {
        if (session.id !== sessionId) return session
        updated = {
          ...session,
          type: input.type,
          classId: input.classId,
          className: input.className,
          title: input.title,
          topic: input.topic,
          teams: input.teams,
          debate: input.debate,
          presentation: input.presentation,
        }
        return updated
      })
      return updated
    },
    remove: () => false,
    removeAll: () => {
      sessions = []
    },
    subscribe: () => () => {},
  }
}

const defaultRepo = createMemoryRepository()

afterEach(() => {
  configureSessionRepository(defaultRepo)
})

describe("session service use cases", () => {
  it("creates and starts debate session", () => {
    const repo = createMemoryRepository()
    configureSessionRepository(repo)

    const created = createDebateSession({
      title: "Debate",
      classId: "class-1",
      className: "1학년 3반",
      topic: "Topic",
    })

    const started = startDebateSession(created.id)
    expect(created.type).toBe("Debate")
    expect(started?.status).toBe("Live")
  })

  it("finishes debate and builds report path", () => {
    const repo = createMemoryRepository()
    configureSessionRepository(repo)

    const created = createDebateSession({
      title: "Debate",
      classId: "class-1",
      className: "1학년 3반",
      topic: "Topic",
    })

    const result = finishDebateSession(created.id, {
      names: ["Kim"],
      round: 1,
      phase: "마무리",
      logs: [],
      sessionId: created.id,
    })

    expect(result.session?.status).toBe("Ended")
    expect(result.reportPath).toContain("/station/report?")
    expect(result.reportPath).toContain(`sessionId=${created.id}`)
  })
})
