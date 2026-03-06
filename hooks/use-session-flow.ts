"use client"

import { useCallback, useMemo, useState } from "react"
import {
  advancePhase,
  canEndDebate,
  PHASE_ORDER,
  type DebateMode,
  type PhaseKey,
  type SpeechProgressState,
} from "@/lib/domain/session"

type GroupFlowState = {
  phase: PhaseKey
  currentSpeakerIndex: number
  isSpeechRunning: boolean
  finalSpeechCompleted: boolean
}

const defaultGroupFlowState: GroupFlowState = {
  phase: "Opening",
  currentSpeakerIndex: 0,
  isSpeechRunning: false,
  finalSpeechCompleted: false,
}

function getFlow(state: Record<string, GroupFlowState>, groupId: string): GroupFlowState {
  return state[groupId] ?? defaultGroupFlowState
}

export function useSessionFlow() {
  const [groupState, setGroupState] = useState<Record<string, GroupFlowState>>({})

  const getGroupState = useCallback((groupId: string) => getFlow(groupState, groupId), [groupState])

  const setGroupPhase = useCallback((groupId: string, phase: PhaseKey) => {
    setGroupState((prev) => ({
      ...prev,
      [groupId]: {
        ...getFlow(prev, groupId),
        phase,
        currentSpeakerIndex: 0,
        isSpeechRunning: false,
        finalSpeechCompleted: false,
      },
    }))
  }, [])

  const setGroupSpeakerIndex = useCallback((groupId: string, index: number) => {
    setGroupState((prev) => ({
      ...prev,
      [groupId]: {
        ...getFlow(prev, groupId),
        currentSpeakerIndex: Math.max(0, index),
        isSpeechRunning: false,
        finalSpeechCompleted: false,
      },
    }))
  }, [])

  const setSpeechRunning = useCallback((groupId: string, isSpeechRunning: boolean) => {
    setGroupState((prev) => ({
      ...prev,
      [groupId]: {
        ...getFlow(prev, groupId),
        isSpeechRunning,
        finalSpeechCompleted: isSpeechRunning ? false : getFlow(prev, groupId).finalSpeechCompleted,
      },
    }))
  }, [])

  const markDebateFinished = useCallback((groupId: string) => {
    setGroupState((prev) => ({
      ...prev,
      [groupId]: {
        ...getFlow(prev, groupId),
        isSpeechRunning: false,
        finalSpeechCompleted: true,
      },
    }))
  }, [])

  const resetGroup = useCallback((groupId: string) => {
    setGroupState((prev) => ({
      ...prev,
      [groupId]: defaultGroupFlowState,
    }))
  }, [])

  const handleEndSpeech = useCallback((groupId: string, speakerCount: number, debateMode: DebateMode) => {
    setGroupState((prev) => {
      const current = getFlow(prev, groupId)
      const nextState = advancePhase({
        phase: current.phase,
        currentSpeakerIndex: current.currentSpeakerIndex,
        speakerCount,
        debateMode,
        finalSpeechCompleted: current.finalSpeechCompleted,
      })

      return {
        ...prev,
        [groupId]: {
          phase: nextState.phase,
          currentSpeakerIndex: nextState.currentSpeakerIndex,
          isSpeechRunning: false,
          finalSpeechCompleted: nextState.finalSpeechCompleted,
        },
      }
    })
  }, [])

  const goPrev = useCallback((groupId: string, speakerCount: number) => {
    setGroupState((prev) => {
      const current = getFlow(prev, groupId)
      const phaseIndex = PHASE_ORDER.indexOf(current.phase)

      if (current.currentSpeakerIndex > 0) {
        return {
          ...prev,
          [groupId]: {
            ...current,
            currentSpeakerIndex: current.currentSpeakerIndex - 1,
          },
        }
      }

      if (phaseIndex > 0) {
        const prevPhase = PHASE_ORDER[phaseIndex - 1]
        return {
          ...prev,
          [groupId]: {
            ...current,
            phase: prevPhase,
            currentSpeakerIndex: Math.max(0, speakerCount - 1),
            isSpeechRunning: false,
            finalSpeechCompleted: false,
          },
        }
      }

      return prev
    })
  }, [])

  const goNext = useCallback((groupId: string, speakerCount: number) => {
    setGroupState((prev) => {
      const current = getFlow(prev, groupId)
      const phaseIndex = PHASE_ORDER.indexOf(current.phase)

      if (current.currentSpeakerIndex < Math.max(0, speakerCount - 1)) {
        return {
          ...prev,
          [groupId]: {
            ...current,
            currentSpeakerIndex: current.currentSpeakerIndex + 1,
          },
        }
      }

      if (phaseIndex >= 0 && phaseIndex < PHASE_ORDER.length - 1) {
        const nextPhase = PHASE_ORDER[phaseIndex + 1]
        return {
          ...prev,
          [groupId]: {
            ...current,
            phase: nextPhase,
            currentSpeakerIndex: 0,
            isSpeechRunning: false,
            finalSpeechCompleted: false,
          },
        }
      }

      return prev
    })
  }, [])

  const isDebateFinished = useCallback((groupId: string, speakerCount: number, debateMode: DebateMode) => {
    const current = getGroupState(groupId)
    const state: SpeechProgressState = {
      phase: current.phase,
      currentSpeakerIndex: current.currentSpeakerIndex,
      speakerCount,
      debateMode,
      finalSpeechCompleted: current.finalSpeechCompleted,
    }
    return canEndDebate(state) && !current.isSpeechRunning
  }, [getGroupState])

  return useMemo(
    () => ({
      getGroupState,
      setGroupPhase,
      setGroupSpeakerIndex,
      setSpeechRunning,
      markDebateFinished,
      resetGroup,
      handleEndSpeech,
      goPrev,
      goNext,
      isDebateFinished,
    }),
    [
      getGroupState,
      setGroupPhase,
      setGroupSpeakerIndex,
      setSpeechRunning,
      markDebateFinished,
      resetGroup,
      handleEndSpeech,
      goPrev,
      goNext,
      isDebateFinished,
    ]
  )
}
