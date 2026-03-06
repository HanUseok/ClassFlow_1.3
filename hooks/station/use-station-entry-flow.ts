"use client"

import { useCallback, useMemo, useState } from "react"

export type StationEntryState = "landing" | "identity" | "group" | "waiting" | "live"

export function useStationEntryFlow() {
  const [state, setState] = useState<StationEntryState>("landing")
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0)

  const goLanding = useCallback(() => setState("landing"), [])
  const goIdentity = useCallback(() => setState("identity"), [])
  const goGroup = useCallback(() => setState("group"), [])
  const goWaiting = useCallback(() => setState("waiting"), [])
  const goLive = useCallback(() => setState("live"), [])

  const selectGroupAndWait = useCallback((index: number) => {
    setSelectedGroupIndex(index)
    setState("waiting")
  }, [])

  return useMemo(
    () => ({
      state,
      setState,
      selectedStudentId,
      setSelectedStudentId,
      selectedGroupIndex,
      setSelectedGroupIndex,
      goLanding,
      goIdentity,
      goGroup,
      goWaiting,
      goLive,
      selectGroupAndWait,
    }),
    [
      state,
      selectedStudentId,
      selectedGroupIndex,
      goLanding,
      goIdentity,
      goGroup,
      goWaiting,
      goLive,
      selectGroupAndWait,
    ]
  )
}
