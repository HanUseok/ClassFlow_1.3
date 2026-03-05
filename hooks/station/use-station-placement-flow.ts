"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Session, Student } from "@/lib/mock-data"

type StationGroup = NonNullable<NonNullable<NonNullable<Session["debate"]>["groups"]>>[number]

type UseStationPlacementFlowParams = {
  activeDebate: Session | undefined
  selectedGroupIndex: number
  setSelectedGroupIndex: (updater: number | ((prev: number) => number)) => void
  selectedStudent?: Student
  placementCandidates: Student[]
  groupCount?: number
  onPlacementComplete: (groups: StationGroup[]) => void
}

export function useStationPlacementFlow({
  activeDebate,
  selectedGroupIndex,
  setSelectedGroupIndex,
  selectedStudent,
  placementCandidates,
  groupCount = 2,
  onPlacementComplete,
}: UseStationPlacementFlowParams) {
  const [stationGroups, setStationGroups] = useState<StationGroup[]>([])
  const [isAutoFilling, setIsAutoFilling] = useState(false)
  const autoFillTimersRef = useRef<number[]>([])

  const clearAutoFillTimers = useCallback(() => {
    autoFillTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    autoFillTimersRef.current = []
  }, [])

  useEffect(() => {
    if (!activeDebate || activeDebate.type !== "Debate") {
      setStationGroups([])
      return
    }

    const storedGroups = activeDebate.debate?.groups ?? []
    const groups = Array.from({ length: groupCount }, (_, index) => ({
      id: storedGroups[index]?.id ?? `group-${index + 1}`,
      affirmative: [],
      negative: [],
      moderator: undefined,
    }))
    setStationGroups(groups)
    setSelectedGroupIndex((prev) => Math.max(0, Math.min(typeof prev === "number" ? prev : 0, groups.length - 1)))
  }, [activeDebate?.id, groupCount, setSelectedGroupIndex])

  useEffect(() => {
    setIsAutoFilling(false)
    clearAutoFillTimers()
  }, [activeDebate?.id, clearAutoFillTimers])

  useEffect(() => {
    return () => {
      clearAutoFillTimers()
    }
  }, [clearAutoFillTimers])

  const placementStatus = useMemo(() => {
    if (!activeDebate || activeDebate.type !== "Debate") return []
    return stationGroups.map((group, index) => {
      const requiredAff = 2
      const requiredNeg = 2
      const requiredMod = 1
      const requiredTotal = requiredAff + requiredNeg + requiredMod
      const placedTotal = group.affirmative.length + group.negative.length + (group.moderator ? 1 : 0)
      return {
        groupId: group.id,
        label: `${index + 1}조`,
        placedTotal,
        requiredTotal,
        done: requiredTotal === 0 ? placedTotal > 0 : placedTotal >= requiredTotal,
      }
    })
  }, [activeDebate, stationGroups])

  const currentPlacementGroupIndex = Math.min(selectedGroupIndex, Math.max(0, stationGroups.length - 1))
  const currentPlacementGroupNumber = currentPlacementGroupIndex + 1
  const currentPlacementGroup = stationGroups[currentPlacementGroupIndex]

  const deskPlacementGroups = useMemo(() => {
    const current = stationGroups[currentPlacementGroupIndex]
    return current ? [current] : []
  }, [stationGroups, currentPlacementGroupIndex])

  const placementSeatConfig = useMemo(
    () =>
      deskPlacementGroups.map(() => ({
        affirmative: 2,
        negative: 2,
        moderator: 1,
      })),
    [deskPlacementGroups]
  )

  const isSelectedStudentPlacedInCurrentGroup = Boolean(
    selectedStudent &&
      currentPlacementGroup &&
      (currentPlacementGroup.affirmative.some((student) => student.id === selectedStudent.id) ||
        currentPlacementGroup.negative.some((student) => student.id === selectedStudent.id) ||
        currentPlacementGroup.moderator?.id === selectedStudent.id)
  )

  const selfPlacementPool = selectedStudent && !isSelectedStudentPlacedInCurrentGroup ? [selectedStudent] : []

  const handleDeskLayoutChange = useCallback(
    (nextGroups: StationGroup[]) => {
      if (isAutoFilling) return
      const nextGroup = nextGroups[0]
      if (!nextGroup) return

      const merged = [...stationGroups]
      const wasPlaced = Boolean(
        selectedStudent &&
          currentPlacementGroup &&
          (currentPlacementGroup.affirmative.some((student) => student.id === selectedStudent.id) ||
            currentPlacementGroup.negative.some((student) => student.id === selectedStudent.id) ||
            currentPlacementGroup.moderator?.id === selectedStudent.id)
      )

      const nowPlaced = Boolean(
        selectedStudent &&
          (nextGroup.affirmative.some((student) => student.id === selectedStudent.id) ||
            nextGroup.negative.some((student) => student.id === selectedStudent.id) ||
            nextGroup.moderator?.id === selectedStudent.id)
      )

      merged[currentPlacementGroupIndex] = nextGroup
      setStationGroups(merged)

      if (!wasPlaced || !nowPlaced) return

      const seatCfg = placementSeatConfig[0] ?? { affirmative: 2, negative: 2, moderator: 1 }
      const assignedIds = new Set(
        merged.flatMap((group, index) =>
          index === currentPlacementGroupIndex
            ? []
            : [
                ...group.affirmative.map((student) => student.id),
                ...group.negative.map((student) => student.id),
                ...(group.moderator ? [group.moderator.id] : []),
              ]
        )
      )
      const currentIds = new Set([
        ...nextGroup.affirmative.map((student) => student.id),
        ...nextGroup.negative.map((student) => student.id),
        ...(nextGroup.moderator ? [nextGroup.moderator.id] : []),
      ])
      const autoFillCandidates = placementCandidates.filter(
        (student) => !assignedIds.has(student.id) && !currentIds.has(student.id)
      )

      const steps: Array<{ side: "affirmative" | "negative" | "moderator"; student: Student }> = []
      let cursor = 0
      const pick = () => {
        const picked = autoFillCandidates[cursor]
        cursor += 1
        return picked
      }

      for (let i = nextGroup.affirmative.length; i < seatCfg.affirmative; i += 1) {
        const picked = pick()
        if (!picked) break
        steps.push({ side: "affirmative", student: picked })
      }
      for (let i = nextGroup.negative.length; i < seatCfg.negative; i += 1) {
        const picked = pick()
        if (!picked) break
        steps.push({ side: "negative", student: picked })
      }
      if (seatCfg.moderator > 0 && !nextGroup.moderator) {
        const picked = pick()
        if (picked) steps.push({ side: "moderator", student: picked })
      }

      if (steps.length === 0) {
        onPlacementComplete(merged)
        return
      }

      setIsAutoFilling(true)
      clearAutoFillTimers()

      const intervalMs = 900
      const finalMerged = [...merged]
      const finalGroup = { ...nextGroup, affirmative: [...nextGroup.affirmative], negative: [...nextGroup.negative] }

      steps.forEach((step, stepIndex) => {
        const timer = window.setTimeout(() => {
          setStationGroups((prev) => {
            const next = [...prev]
            const target = next[currentPlacementGroupIndex]
            if (!target) return prev

            if (step.side === "affirmative") {
              next[currentPlacementGroupIndex] = { ...target, affirmative: [...target.affirmative, step.student] }
            } else if (step.side === "negative") {
              next[currentPlacementGroupIndex] = { ...target, negative: [...target.negative, step.student] }
            } else {
              next[currentPlacementGroupIndex] = { ...target, moderator: step.student }
            }
            return next
          })
        }, (stepIndex + 1) * intervalMs)

        autoFillTimersRef.current.push(timer)

        if (step.side === "affirmative") finalGroup.affirmative.push(step.student)
        else if (step.side === "negative") finalGroup.negative.push(step.student)
        else finalGroup.moderator = step.student
      })

      finalMerged[currentPlacementGroupIndex] = finalGroup
      const completeTimer = window.setTimeout(() => {
        setIsAutoFilling(false)
        onPlacementComplete(finalMerged)
      }, (steps.length + 1) * intervalMs)
      autoFillTimersRef.current.push(completeTimer)
    },
    [
      currentPlacementGroup,
      currentPlacementGroupIndex,
      isAutoFilling,
      onPlacementComplete,
      placementCandidates,
      placementSeatConfig,
      selectedStudent,
      stationGroups,
      clearAutoFillTimers,
    ]
  )

  return {
    stationGroups,
    setStationGroups,
    isAutoFilling,
    placementStatus,
    currentPlacementGroup,
    currentPlacementGroupIndex,
    currentPlacementGroupNumber,
    deskPlacementGroups,
    placementSeatConfig,
    isSelectedStudentPlacedInCurrentGroup,
    selfPlacementPool,
    handleDeskLayoutChange,
  }
}

