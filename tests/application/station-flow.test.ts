import { afterEach, describe, expect, it } from "vitest"
import type { Session } from "../../lib/mock-data"
import type { SessionRepository } from "../../lib/application/ports/session-repository"
import {
  completeStationDebate,
  configureSessionRepository,
  finishParticipantSpeech,
  startParticipantSpeech,
} from "../../lib/application/session-service"

function createMemoryRepository(): SessionRepository {
  let sessions: Session[] = [
    {
      id: "sess-1",
      type: "Debate",
      status: "Live",
      title: "Demo",
      date: "2026-03-01",
      classId: "class-1",
      className: "1학년 3반",
      debate: {
        membersPerGroup: 4,
        moderators: [],
        groups: [],
      },
    },
  ]

  return {
    list: () => sessions,
    getById: (sessionId) => sessions.find((session) => session.id === sessionId) ?? null,
    create: () => sessions[0],
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
    replaceFromInput: () => null,
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

describe("station flow service", () => {
  it("handles participant start transitions", () => {
    const request = startParticipantSpeech({
      debateMode: "Free",
      status: "idle",
      isCurrentSpeakerSelf: true,
    })
    expect(request.nextStatus).toBe("requesting")
    expect(request.shouldRequest).toBe(true)

    const running = startParticipantSpeech({
      debateMode: "Ordered",
      status: "idle",
      isCurrentSpeakerSelf: true,
    })
    expect(running.nextStatus).toBe("running")
    expect(running.shouldStartSpeech).toBe(true)
  })

  it("handles participant finish transitions", () => {
    const free = finishParticipantSpeech({
      debateMode: "Free",
      status: "running",
      completedSpeeches: 2,
    })
    expect(free.nextStatus).toBe("idle")
    expect(free.completedSpeeches).toBe(3)

    const ordered = finishParticipantSpeech({
      debateMode: "Ordered",
      status: "running",
      completedSpeeches: 1,
    })
    expect(ordered.shouldAdvanceOrderedFlow).toBe(true)
    expect(ordered.nextStatus).toBe("idle")
  })

  it("completes station debate and returns report path", () => {
    const repo = createMemoryRepository()
    configureSessionRepository(repo)

    const result = completeStationDebate({
      sessionId: "sess-1",
      debateMode: "Ordered",
      memberNames: ["Kim", "Lee"],
      sessionTitle: "Demo",
      teacherGuided: false,
      groupLayout: [{ affirmative: ["Kim"], negative: ["Lee"] }],
    })

    expect(result.session?.status).toBe("Ended")
    expect(result.reportPath).toContain("/station/report?")
    expect(result.reportPath).toContain("sessionId=sess-1")
  })
})
