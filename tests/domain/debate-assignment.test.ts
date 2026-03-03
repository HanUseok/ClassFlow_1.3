import { describe, expect, it } from "vitest"
import {
  applyRandomDraftToAssignments,
  buildCampShuffleDraft,
  collectAssignedIds,
  computeSlotCapacity,
  getGroupIds,
  normalizeGroupAssignments,
} from "../../lib/domain/session/debate-assignment"

describe("debate assignment domain", () => {
  it("builds group ids from selected count and group count", () => {
    expect(getGroupIds(0, 2)).toEqual([])
    expect(getGroupIds(5, 1)).toEqual(["group-1"])
    expect(getGroupIds(5, 3)).toEqual(["group-1", "group-2", "group-3"])
  })

  it("normalizes assignments with dedupe and invalid id cleanup", () => {
    const next = normalizeGroupAssignments({
      groupIds: ["group-1", "group-2"],
      groupAssignments: {
        "group-1": {
          affirmative: ["s1", "s2"],
          negative: ["s3"],
          moderator: ["s4"],
        },
        "group-2": {
          affirmative: ["s2"],
          negative: ["s5"],
          moderator: ["s6"],
        },
      },
      groupSlotAdjust: {},
      validStudentIds: new Set(["s1", "s2", "s3", "s4", "s5"]),
      teacherGuided: "guided",
      slotConfig: {
        affirmativeSlots: 2,
        negativeSlots: 1,
        moderatorSlots: 1,
      },
    })

    expect(next["group-1"].affirmative).toEqual(["s1", "s2"])
    expect(next["group-2"].affirmative).toEqual([null, null])
    expect(next["group-2"].moderator).toEqual([null])
  })

  it("applies random draft across groups and computes capacity", () => {
    const assignments = applyRandomDraftToAssignments({
      groupIds: ["group-1", "group-2"],
      groupSlotAdjust: {},
      slotConfig: {
        affirmativeSlots: 1,
        negativeSlots: 1,
        moderatorSlots: 1,
      },
      teacherGuided: "guided",
      randomDraft: {
        unassigned: [],
        affirmative: ["s1", "s2"],
        negative: ["s3", "s4"],
        moderator: ["s5"],
      },
    })

    const ids = collectAssignedIds(["group-1", "group-2"], assignments, "guided")
    expect(ids.size).toBe(5)
    expect(computeSlotCapacity(["group-1", "group-2"], assignments)).toBe(6)
  })

  it("creates camp shuffle draft constrained by role caps", () => {
    const draft = buildCampShuffleDraft(
      ["s1", "s2", "s3", "s4", "s5", "s6"],
      { affirmative: 2, negative: 2, moderator: 2, unassigned: 6 },
      1
    )

    expect(draft.moderator.length).toBe(1)
    expect(draft.affirmative.length).toBeLessThanOrEqual(2)
    expect(draft.negative.length).toBeLessThanOrEqual(2)
    expect(draft.unassigned.length + draft.affirmative.length + draft.negative.length + draft.moderator.length).toBe(6)
  })
})
