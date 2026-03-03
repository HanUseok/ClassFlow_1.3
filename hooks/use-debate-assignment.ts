"use client"

import { useCallback, useEffect, useMemo } from "react"
import type { Student } from "@/lib/mock-data"
import { shuffle, type DraftPool, type GroupAssignment, type GroupSlotAdjust, type RandomDraft, type SlotRole } from "@/lib/domain/session/create-session"
import {
  applyRandomDraftToAssignments,
  buildCampShuffleDraft,
  buildDebateGroupsPreview,
  buildGroupAssignmentShape,
  clearStudentFromAssignments,
  collectAssignedIds,
  computeSlotCapacity,
  getFixedModeratorCount,
  getGroupIds,
  getRandomLimits,
  getRoleSlotCount,
  normalizeGroupAssignments,
} from "@/lib/domain/session/debate-assignment"

type UseDebateAssignmentParams = {
  isDebate: boolean
  selectedStudents: Student[]
  studentMap: Map<string, Student>
  teacherGuided: "guided" | "unguided"
  teacherModerator: Student | null
  groupCount: number
  setGroupCount: (updater: number | ((prev: number) => number)) => void
  affirmativeSlots: number
  negativeSlots: number
  moderatorSlots: number
  groupSlotAdjust: Record<string, GroupSlotAdjust>
  setGroupSlotAdjust: (updater: Record<string, GroupSlotAdjust> | ((prev: Record<string, GroupSlotAdjust>) => Record<string, GroupSlotAdjust>)) => void
  groupAssignments: Record<string, GroupAssignment>
  setGroupAssignments: (
    updater: Record<string, GroupAssignment> | ((prev: Record<string, GroupAssignment>) => Record<string, GroupAssignment>)
  ) => void
  dragStudentId: string | null
  setDragStudentId: (value: string | null) => void
  randomDialogOpen: boolean
  setRandomDialogOpen: (open: boolean) => void
  randomDraft: RandomDraft
  setRandomDraft: (updater: RandomDraft | ((prev: RandomDraft) => RandomDraft)) => void
  randomDrag: { id: string; from: DraftPool } | null
  setRandomDrag: (value: { id: string; from: DraftPool } | null) => void
}

export function useDebateAssignment(params: UseDebateAssignmentParams) {
  const selectedCount = params.selectedStudents.length
  const slotConfig = useMemo(
    () => ({
      affirmativeSlots: params.affirmativeSlots,
      negativeSlots: params.negativeSlots,
      moderatorSlots: params.moderatorSlots,
    }),
    [params.affirmativeSlots, params.negativeSlots, params.moderatorSlots]
  )

  const groupIds = useMemo(() => getGroupIds(selectedCount, params.groupCount), [selectedCount, params.groupCount])

  useEffect(() => {
    if (selectedCount > 0 && params.groupCount < 1) params.setGroupCount(1)
  }, [selectedCount, params.groupCount, params.setGroupCount])

  useEffect(() => {
    const validIds = new Set(params.selectedStudents.map((s) => s.id))
    params.setGroupAssignments((prev) =>
      normalizeGroupAssignments({
        groupIds,
        groupAssignments: prev,
        groupSlotAdjust: params.groupSlotAdjust,
        validStudentIds: validIds,
        teacherGuided: params.teacherGuided,
        slotConfig,
      })
    )
  }, [groupIds, params.selectedStudents, params.groupSlotAdjust, params.teacherGuided, params.setGroupAssignments, slotConfig])

  const assignedIds = useMemo(
    () => collectAssignedIds(groupIds, params.groupAssignments, params.teacherGuided),
    [groupIds, params.groupAssignments, params.teacherGuided]
  )

  const unassignedStudents = useMemo(
    () => params.selectedStudents.filter((student) => !assignedIds.has(student.id)),
    [params.selectedStudents, assignedIds]
  )

  const debateGroupsPreview = useMemo(
    () =>
      params.isDebate
        ? buildDebateGroupsPreview({
            groupIds,
            groupAssignments: params.groupAssignments,
            groupSlotAdjust: params.groupSlotAdjust,
            studentMap: params.studentMap,
            teacherGuided: params.teacherGuided,
            teacherModerator: params.teacherModerator,
            slotConfig,
          })
        : [],
    [
      params.isDebate,
      groupIds,
      params.groupAssignments,
      params.groupSlotAdjust,
      params.studentMap,
      params.teacherGuided,
      params.teacherModerator,
      slotConfig,
    ]
  )

  const affirmativeStudents = useMemo(() => debateGroupsPreview.flatMap((group) => group.affirmative), [debateGroupsPreview])
  const negativeStudents = useMemo(() => debateGroupsPreview.flatMap((group) => group.negative), [debateGroupsPreview])
  const moderatorStudents = useMemo(() => debateGroupsPreview.flatMap((group) => group.moderators), [debateGroupsPreview])

  const slotCapacity = useMemo(() => computeSlotCapacity(groupIds, params.groupAssignments), [groupIds, params.groupAssignments])
  const debateReady = params.isDebate && selectedCount > 0 && assignedIds.size === selectedCount

  const randomLimits = useMemo(
    () => getRandomLimits(groupIds, params.groupSlotAdjust, slotConfig, params.selectedStudents.length),
    [groupIds, params.groupSlotAdjust, slotConfig, params.selectedStudents.length]
  )

  const fixedModeratorCount = useMemo(
    () => getFixedModeratorCount(params.teacherGuided, groupIds, params.groupSlotAdjust, params.moderatorSlots),
    [params.teacherGuided, groupIds, params.groupSlotAdjust, params.moderatorSlots]
  )

  const randomStudentCaps = useMemo(
    () => ({
      affirmative: randomLimits.affirmative,
      negative: randomLimits.negative,
      moderator: Math.max(0, randomLimits.moderator - fixedModeratorCount),
    }),
    [randomLimits, fixedModeratorCount]
  )

  const initializeRandomDraft = useCallback(() => {
    const unassigned = shuffle(params.selectedStudents.map((s) => s.id))
    params.setRandomDraft({ unassigned, affirmative: [], negative: [], moderator: [] })
  }, [params.selectedStudents, params.setRandomDraft])

  useEffect(() => {
    if (params.randomDialogOpen) initializeRandomDraft()
  }, [params.randomDialogOpen, initializeRandomDraft])

  const adjustGroupRoleSlots = useCallback(
    (groupId: string, role: SlotRole, delta: number) => {
      const base = role === "affirmative" ? params.affirmativeSlots : role === "negative" ? params.negativeSlots : params.moderatorSlots
      params.setGroupSlotAdjust((prev) => {
        const current = prev[groupId] ?? { affirmative: 0, negative: 0, moderator: 0 }
        const nextRoleValue = Math.max(-base, current[role] + delta)
        return {
          ...prev,
          [groupId]: {
            ...current,
            [role]: nextRoleValue,
          },
        }
      })
    },
    [params.affirmativeSlots, params.negativeSlots, params.moderatorSlots, params.setGroupSlotAdjust]
  )

  const placeStudentToSlot = useCallback(
    (groupId: string, role: SlotRole, slotIndex: number) => {
      if (!params.dragStudentId) return

      params.setGroupAssignments((prev) => {
        let source: { groupId: string; role: SlotRole; slotIndex: number } | null = null

        for (const gid of groupIds) {
          const group = prev[gid] ?? buildGroupAssignmentShape(gid, slotConfig, params.groupSlotAdjust)
          const affIdx = group.affirmative.findIndex((id) => id === params.dragStudentId)
          if (affIdx >= 0) {
            source = { groupId: gid, role: "affirmative", slotIndex: affIdx }
            break
          }
          const negIdx = group.negative.findIndex((id) => id === params.dragStudentId)
          if (negIdx >= 0) {
            source = { groupId: gid, role: "negative", slotIndex: negIdx }
            break
          }
          const modIdx = group.moderator.findIndex((id) => id === params.dragStudentId)
          if (modIdx >= 0) {
            source = { groupId: gid, role: "moderator", slotIndex: modIdx }
            break
          }
        }

        const draft: Record<string, GroupAssignment> = {}
        groupIds.forEach((id) => {
          const src = prev[id] ?? buildGroupAssignmentShape(id, slotConfig, params.groupSlotAdjust)
          draft[id] = {
            affirmative: [...src.affirmative],
            negative: [...src.negative],
            moderator: [...src.moderator],
          }
        })
        const next = clearStudentFromAssignments(draft, params.dragStudentId!)

        const targetSlots = next[groupId][role]
        const sameRoleReorder = source?.groupId === groupId && source?.role === role
        if (sameRoleReorder) {
          const idx = Math.max(0, Math.min(slotIndex, targetSlots.length - 1))
          if (targetSlots.length > 0) targetSlots[idx] = params.dragStudentId
        } else {
          const firstEmpty = targetSlots.findIndex((id) => id === null)
          const idx = firstEmpty >= 0 ? firstEmpty : Math.max(0, Math.min(slotIndex, targetSlots.length - 1))
          if (targetSlots.length > 0) targetSlots[idx] = params.dragStudentId
        }

        return next
      })

      params.setDragStudentId(null)
    },
    [params, groupIds, slotConfig]
  )

  const dropToUnassignedPool = useCallback(() => {
    const dragId = params.dragStudentId
    if (!dragId) return
    params.setGroupAssignments((prev) => {
      const draft: Record<string, GroupAssignment> = {}
      groupIds.forEach((id) => {
        const src = prev[id] ?? buildGroupAssignmentShape(id, slotConfig, params.groupSlotAdjust)
        draft[id] = {
          affirmative: [...src.affirmative],
          negative: [...src.negative],
          moderator: [...src.moderator],
        }
      })
      return clearStudentFromAssignments(draft, dragId)
    })
    params.setDragStudentId(null)
  }, [params, groupIds, slotConfig])

  const moveDraftStudent = useCallback(
    (to: DraftPool) => {
      if (!params.randomDrag) return
      const { id, from } = params.randomDrag
      if (from === to) return

      params.setRandomDraft((prev) => {
        const cap =
          to === "moderator"
            ? randomStudentCaps.moderator
            : to === "affirmative"
              ? randomStudentCaps.affirmative
              : to === "negative"
                ? randomStudentCaps.negative
                : Number.MAX_SAFE_INTEGER

        if (to !== "unassigned" && prev[to].length >= cap) return prev

        return {
          ...prev,
          [from]: prev[from].filter((v) => v !== id),
          [to]: [...prev[to], id],
        }
      })
      params.setRandomDrag(null)
    },
    [params, randomStudentCaps]
  )

  const applyRandomDraft = useCallback(() => {
    const next = applyRandomDraftToAssignments({
      groupIds,
      groupSlotAdjust: params.groupSlotAdjust,
      slotConfig,
      teacherGuided: params.teacherGuided,
      randomDraft: params.randomDraft,
    })
    params.setGroupAssignments(next)
    params.setRandomDialogOpen(false)
  }, [groupIds, params.groupSlotAdjust, params.teacherGuided, params.randomDraft, params.setGroupAssignments, params.setRandomDialogOpen, slotConfig])

  const buildCampShuffleDraftFromCurrent = useCallback(() => {
    return buildCampShuffleDraft(
      params.selectedStudents.map((s) => s.id),
      randomLimits,
      randomStudentCaps.moderator
    )
  }, [params.selectedStudents, randomLimits, randomStudentCaps.moderator])

  const createEmptyForGroup = useCallback(
    (groupId: string) => buildGroupAssignmentShape(groupId, slotConfig, params.groupSlotAdjust),
    [slotConfig, params.groupSlotAdjust]
  )

  const getRoleCount = useCallback(
    (groupId: string, role: SlotRole) => getRoleSlotCount(role, groupId, slotConfig, params.groupSlotAdjust),
    [slotConfig, params.groupSlotAdjust]
  )

  return {
    selectedCount,
    groupIds,
    unassignedStudents,
    slotCapacity,
    debateReady,
    debateGroupsPreview,
    affirmativeStudents,
    negativeStudents,
    moderatorStudents,
    randomLimits,
    fixedModeratorCount,
    randomStudentCaps,
    adjustGroupRoleSlots,
    placeStudentToSlot,
    dropToUnassignedPool,
    moveDraftStudent,
    applyRandomDraft,
    buildCampShuffleDraft: buildCampShuffleDraftFromCurrent,
    createEmptyForGroup,
    getRoleCount,
  }
}
