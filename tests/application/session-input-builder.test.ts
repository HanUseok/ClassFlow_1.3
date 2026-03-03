import { describe, expect, it } from "vitest"
import { buildCreateSessionInput } from "../../lib/application/session-input-builder"

const student = (id: string, name: string) => ({
  id,
  name,
  classId: "class-1",
  className: "1학년 3반",
})

describe("buildCreateSessionInput", () => {
  it("builds debate session payload with normalized ordered minutes", () => {
    const input = buildCreateSessionInput({
      sessionType: "Debate",
      topic: "AI should replace homework",
      selectedClass: { id: "class-1", name: "1학년 3반" },
      debateMode: "Ordered",
      teacherGuided: "guided",
      orderedStages: [
        { id: "opening", label: "입론", enabled: true, minutes: 0 },
        { id: "closing", label: "마무리", enabled: true, minutes: 2 },
      ],
      groupCount: 1,
      affirmativeSlots: 2,
      negativeSlots: 2,
      moderatorSlots: 1,
      selectedStudentIds: new Set(["s1", "s2", "m1"]),
      groupAssignments: {
        "group-1": { affirmative: ["s1", null], negative: ["s2", null], moderator: ["m1"] },
      },
      affirmativeStudents: [student("s1", "Kim")],
      negativeStudents: [student("s2", "Lee")],
      moderatorStudents: [student("m1", "Teacher")],
      groupSlotAdjust: {},
      debateGroupsPreview: [
        {
          id: "group-1",
          affirmative: [student("s1", "Kim")],
          negative: [student("s2", "Lee")],
          moderator: student("m1", "Teacher"),
        },
      ],
      argumentCards: [
        {
          id: "a1",
          title: " card ",
          claim: " claim ",
          side: "affirmative",
          enabled: true,
        },
      ],
      selectedPresentationPresenters: [],
      presentationMinutesPerStudent: 5,
    })

    expect(input.type).toBe("Debate")
    expect(input.debate?.membersPerGroup).toBe(4)
    expect(input.debate?.orderedFlow?.stages[0].minutes).toBe(1)
    expect(input.debate?.argumentCards?.[0].title).toBe("card")
    expect(input.teams?.team1[0].id).toBe("s1")
    expect(input.debate?.assignmentConfig?.groupAssignments?.["group-1"]?.affirmative).toEqual(["s1", null])
  })

  it("builds presentation payload with presenter seconds", () => {
    const input = buildCreateSessionInput({
      sessionType: "Presentation",
      topic: "",
      selectedClass: { id: "class-1", name: "1학년 3반" },
      debateMode: "Free",
      teacherGuided: "unguided",
      orderedStages: [],
      groupCount: 0,
      affirmativeSlots: 0,
      negativeSlots: 0,
      moderatorSlots: 0,
      selectedStudentIds: new Set(["s1"]),
      groupAssignments: {},
      affirmativeStudents: [],
      negativeStudents: [],
      moderatorStudents: [],
      groupSlotAdjust: {},
      debateGroupsPreview: [],
      argumentCards: [],
      selectedPresentationPresenters: [{ student: student("s1", "Kim"), recordingEnabled: true }],
      presentationMinutesPerStudent: 3,
    })

    expect(input.type).toBe("Presentation")
    expect(input.presentation?.secondsPerPresenter).toBe(180)
    expect(input.presentation?.presenters.length).toBe(1)
    expect(input.debate).toBeUndefined()
  })
})
