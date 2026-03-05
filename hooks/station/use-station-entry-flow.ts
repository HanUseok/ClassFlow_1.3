"use client"

import { useState } from "react"

export type StationEntryState = "landing" | "identity" | "group" | "waiting" | "live"

export function useStationEntryFlow() {
  const [state, setState] = useState<StationEntryState>("landing")
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0)

  const goLanding = () => setState("landing")
  const goIdentity = () => setState("identity")
  const goGroup = () => setState("group")
  const goWaiting = () => setState("waiting")
  const goLive = () => setState("live")

  const selectGroupAndWait = (index: number) => {
    setSelectedGroupIndex(index)
    setState("waiting")
  }

  return {
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
  }
}

