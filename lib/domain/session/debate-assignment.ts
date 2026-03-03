import type { Student } from "@/lib/mock-data"
import { emptyAssignment, shuffle, type GroupAssignment, type GroupSlotAdjust, type RandomDraft, type SlotRole } from "./create-session"

type SlotConfig = {
  affirmativeSlots: number
  negativeSlots: number
  moderatorSlots: number
}

type NormalizeAssignmentsParams = {
  groupIds: string[]
  groupAssignments: Record<string, GroupAssignment>
  groupSlotAdjust: Record<string, GroupSlotAdjust>
  validStudentIds: Set<string>
  teacherGuided: "guided" | "unguided"
  slotConfig: SlotConfig
}

type DebateGroupPreview = {
  id: string
  affirmative: Student[]
  negative: Student[]
  moderators: Student[]
  moderator?: Student
}

type BuildPreviewParams = {
  groupIds: string[]
  groupAssignments: Record<string, GroupAssignment>
  groupSlotAdjust: Record<string, GroupSlotAdjust>
  studentMap: Map<string, Student>
  teacherGuided: "guided" | "unguided"
  teacherModerator: Student | null
  slotConfig: SlotConfig
}

type RandomLimitResult = {
  affirmative: number
  negative: number
  moderator: number
  unassigned: number
}

export function getGroupIds(selectedCount: number, groupCount: number) {
  const safeGroupCount = selectedCount > 0 ? Math.max(1, groupCount) : 0
  return Array.from({ length: safeGroupCount }, (_, idx) => `group-${idx + 1}`)
}

export function getRoleSlotCount(
  role: SlotRole,
  groupId: string,
  slotConfig: SlotConfig,
  groupSlotAdjust: Record<string, GroupSlotAdjust>
) {
  const adjust = groupSlotAdjust[groupId] ?? { affirmative: 0, negative: 0, moderator: 0 }
  const base = role === "affirmative" ? slotConfig.affirmativeSlots : role === "negative" ? slotConfig.negativeSlots : slotConfig.moderatorSlots
  return Math.max(0, base + adjust[role])
}

export function buildGroupAssignmentShape(
  groupId: string,
  slotConfig: SlotConfig,
  groupSlotAdjust: Record<string, GroupSlotAdjust>
) {
  return emptyAssignment(
    getRoleSlotCount("affirmative", groupId, slotConfig, groupSlotAdjust),
    getRoleSlotCount("negative", groupId, slotConfig, groupSlotAdjust),
    getRoleSlotCount("moderator", groupId, slotConfig, groupSlotAdjust)
  )
}

export function normalizeGroupAssignments({
  groupIds,
  groupAssignments,
  groupSlotAdjust,
  validStudentIds,
  teacherGuided,
  slotConfig,
}: NormalizeAssignmentsParams): Record<string, GroupAssignment> {
  const used = new Set<string>()
  const next: Record<string, GroupAssignment> = {}

  const sanitize = (id: string | null | undefined) => {
    if (!id) return null
    if (!validStudentIds.has(id)) return null
    if (used.has(id)) return null
    used.add(id)
    return id
  }

  groupIds.forEach((groupId) => {
    const target = buildGroupAssignmentShape(groupId, slotConfig, groupSlotAdjust)
    const source = groupAssignments[groupId]
    next[groupId] = {
      affirmative: target.affirmative.map((_, idx) => sanitize(source?.affirmative?.[idx])),
      negative: target.negative.map((_, idx) => sanitize(source?.negative?.[idx])),
      moderator: target.moderator.map((_, idx) =>
        teacherGuided === "guided" && groupId === "group-1" && idx === 0 ? null : sanitize(source?.moderator?.[idx])
      ),
    }
  })

  return next
}

export function clearStudentFromAssignments(
  source: Record<string, GroupAssignment>,
  studentId: string
): Record<string, GroupAssignment> {
  const next: Record<string, GroupAssignment> = {}
  Object.entries(source).forEach(([groupId, group]) => {
    next[groupId] = {
      affirmative: group.affirmative.map((id) => (id === studentId ? null : id)),
      negative: group.negative.map((id) => (id === studentId ? null : id)),
      moderator: group.moderator.map((id) => (id === studentId ? null : id)),
    }
  })
  return next
}

export function collectAssignedIds(
  groupIds: string[],
  groupAssignments: Record<string, GroupAssignment>,
  teacherGuided: "guided" | "unguided"
) {
  const ids = new Set<string>()
  groupIds.forEach((groupId) => {
    const group = groupAssignments[groupId]
    if (!group) return
    group.affirmative.forEach((id) => id && ids.add(id))
    group.negative.forEach((id) => id && ids.add(id))
    group.moderator.forEach((id, idx) => {
      if (teacherGuided === "guided" && groupId === "group-1" && idx === 0) return
      if (id) ids.add(id)
    })
  })
  return ids
}

export function computeSlotCapacity(groupIds: string[], groupAssignments: Record<string, GroupAssignment>) {
  return groupIds.reduce((sum, groupId) => {
    const group = groupAssignments[groupId]
    if (!group) return sum
    return sum + group.affirmative.length + group.negative.length + group.moderator.length
  }, 0)
}

export function buildDebateGroupsPreview({
  groupIds,
  groupAssignments,
  groupSlotAdjust,
  studentMap,
  teacherGuided,
  teacherModerator,
  slotConfig,
}: BuildPreviewParams): DebateGroupPreview[] {
  return groupIds.map((groupId, idx) => {
    const assignment = groupAssignments[groupId] ?? buildGroupAssignmentShape(groupId, slotConfig, groupSlotAdjust)
    const affirmative = assignment.affirmative.map((id) => (id ? studentMap.get(id) : undefined)).filter((s): s is Student => Boolean(s))
    const negative = assignment.negative.map((id) => (id ? studentMap.get(id) : undefined)).filter((s): s is Student => Boolean(s))
    const mappedModerators = assignment.moderator
      .map((id) => (id ? studentMap.get(id) : undefined))
      .filter((s): s is Student => Boolean(s))
    const moderators = teacherGuided === "guided" && teacherModerator && groupId === "group-1" ? [teacherModerator, ...mappedModerators] : mappedModerators

    return {
      id: `group-${idx + 1}`,
      affirmative,
      negative,
      moderators,
      moderator: moderators[0],
    }
  })
}

export function getRandomLimits(
  groupIds: string[],
  groupSlotAdjust: Record<string, GroupSlotAdjust>,
  slotConfig: SlotConfig,
  selectedStudentCount: number
): RandomLimitResult {
  const totals = groupIds.reduce(
    (acc, groupId) => {
      acc.affirmative += getRoleSlotCount("affirmative", groupId, slotConfig, groupSlotAdjust)
      acc.negative += getRoleSlotCount("negative", groupId, slotConfig, groupSlotAdjust)
      acc.moderator += getRoleSlotCount("moderator", groupId, slotConfig, groupSlotAdjust)
      return acc
    },
    { affirmative: 0, negative: 0, moderator: 0 }
  )

  return { ...totals, unassigned: selectedStudentCount }
}

export function getFixedModeratorCount(
  teacherGuided: "guided" | "unguided",
  groupIds: string[],
  groupSlotAdjust: Record<string, GroupSlotAdjust>,
  moderatorSlots: number
) {
  if (teacherGuided !== "guided") return 0
  if (!groupIds.includes("group-1")) return 0
  const adjust = groupSlotAdjust["group-1"] ?? { affirmative: 0, negative: 0, moderator: 0 }
  const group1ModeratorSlots = Math.max(1, Math.max(0, moderatorSlots + adjust.moderator))
  return group1ModeratorSlots > 0 ? 1 : 0
}

export function buildCampShuffleDraft(
  selectedStudentIds: string[],
  randomLimits: RandomLimitResult,
  randomStudentModeratorCap: number
): RandomDraft {
  const shuffled = shuffle(selectedStudentIds)

  const moderatorCount = Math.min(randomStudentModeratorCap, shuffled.length)
  const moderator = shuffled.slice(0, moderatorCount)
  const remaining = shuffled.slice(moderatorCount)

  const desiredAff = Math.ceil(remaining.length / 2)
  let affCount = Math.min(randomLimits.affirmative, desiredAff)
  let negCount = Math.min(randomLimits.negative, remaining.length - affCount)

  if (affCount + negCount < remaining.length) {
    const left = remaining.length - (affCount + negCount)
    const addAff = Math.min(left, randomLimits.affirmative - affCount)
    affCount += addAff
    const addNeg = Math.min(left - addAff, randomLimits.negative - negCount)
    negCount += addNeg
  }

  const affirmative = remaining.slice(0, affCount)
  const negative = remaining.slice(affCount, affCount + negCount)
  const unassigned = remaining.slice(affCount + negCount)

  return { unassigned, affirmative, negative, moderator }
}

export function applyRandomDraftToAssignments(params: {
  groupIds: string[]
  groupSlotAdjust: Record<string, GroupSlotAdjust>
  slotConfig: SlotConfig
  teacherGuided: "guided" | "unguided"
  randomDraft: RandomDraft
}) {
  const next: Record<string, GroupAssignment> = {}

  params.groupIds.forEach((groupId) => {
    next[groupId] = buildGroupAssignmentShape(groupId, params.slotConfig, params.groupSlotAdjust)
  })

  const distributeByRole = (role: SlotRole, ids: string[]) => {
    if (params.groupIds.length === 0 || ids.length === 0) return

    const availableIndexesByGroup = params.groupIds.map((groupId) => {
      const slots = next[groupId][role]
      const all = slots.map((_, idx) => idx)
      if (role === "moderator" && params.teacherGuided === "guided" && groupId === "group-1") {
        return all.filter((idx) => idx !== 0)
      }
      return all
    })
    const filled = params.groupIds.map(() => 0)
    let cursor = 0

    ids.forEach((id) => {
      for (let step = 0; step < params.groupIds.length; step += 1) {
        const groupIndex = (cursor + step) % params.groupIds.length
        const groupId = params.groupIds[groupIndex]
        const slots = next[groupId][role]
        const availableIndexes = availableIndexesByGroup[groupIndex]
        if (filled[groupIndex] < availableIndexes.length) {
          const slotIndex = availableIndexes[filled[groupIndex]]
          slots[slotIndex] = id
          filled[groupIndex] += 1
          cursor = (groupIndex + 1) % params.groupIds.length
          return
        }
      }
    })
  }

  distributeByRole("affirmative", params.randomDraft.affirmative)
  distributeByRole("negative", params.randomDraft.negative)
  distributeByRole("moderator", params.randomDraft.moderator)

  return next
}
