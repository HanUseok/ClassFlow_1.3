import { describe, expect, it } from "vitest"
import { advancePhase, buildReportPayload, canEndDebate } from "../../lib/domain/session"

describe("session domain", () => {
  it("advances to next speaker in ordered mode", () => {
    const next = advancePhase({
      phase: "Opening",
      currentSpeakerIndex: 0,
      speakerCount: 3,
      debateMode: "Ordered",
      finalSpeechCompleted: false,
    })

    expect(next.phase).toBe("Opening")
    expect(next.currentSpeakerIndex).toBe(1)
    expect(next.completed).toBe(false)
  })

  it("marks completion at final phase and final speaker", () => {
    const next = advancePhase({
      phase: "FinalSummary",
      currentSpeakerIndex: 1,
      speakerCount: 2,
      debateMode: "Ordered",
      finalSpeechCompleted: false,
    })

    expect(next.finalSpeechCompleted).toBe(true)
    expect(next.completed).toBe(true)
    expect(canEndDebate(next)).toBe(true)
  })

  it("builds report payload path with encoded params", () => {
    const path = buildReportPayload({
      names: ["Kim", "Lee"],
      round: 1,
      phase: "마무리",
      logs: [
        {
          phase: "마무리",
          speaker: "Kim",
          argumentCard: "A1",
          argumentKeyword: "key",
          thinkingCard: "T1",
          thinkingKeyword: "think",
        },
      ],
      sessionId: "sess-1",
      teacherGuided: true,
      sessionTitle: "Demo",
      sessionStatus: "Ended",
      groupCount: 2,
    })

    expect(path.startsWith("/station/report?")).toBe(true)
    expect(path).toContain("sessionId=sess-1")
    expect(path).toContain("teacherGuided=1")
    expect(path).toContain("groupCount=2")
  })
})
