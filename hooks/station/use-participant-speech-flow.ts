"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { DebateMode } from "@/lib/domain/session"
import { finishParticipantSpeech, startParticipantSpeech } from "@/lib/application/session-service"

export type ParticipantSpeechStatus = "idle" | "requesting" | "ready" | "running"

export function useParticipantSpeechFlow() {
  const [status, setStatus] = useState<ParticipantSpeechStatus>("idle")
  const [completedSpeeches, setCompletedSpeeches] = useState(0)
  const requestTimerRef = useRef<number | null>(null)

  const clearRequestTimer = useCallback(() => {
    if (requestTimerRef.current) {
      window.clearTimeout(requestTimerRef.current)
      requestTimerRef.current = null
    }
  }, [])

  const resetForSession = useCallback(() => {
    clearRequestTimer()
    setStatus("idle")
    setCompletedSpeeches(0)
  }, [clearRequestTimer])

  const resetForStudent = useCallback(() => {
    setCompletedSpeeches(0)
  }, [])

  const syncWithSpeechRunning = useCallback((isSpeechRunning: boolean, isModerator: boolean) => {
    if (isModerator) return
    if (!isSpeechRunning) {
      setStatus((prev) => (prev === "running" ? "idle" : prev))
    }
  }, [])

  const requestOrStartSpeech = useCallback(
    (params: {
      debateMode: DebateMode
      isCurrentSpeakerSelf: boolean
      selectedMemberIndex: number
      setSpeakerIndex: (index: number) => void
      setSpeechRunning: (running: boolean) => void
    }) => {
      const { debateMode, isCurrentSpeakerSelf, selectedMemberIndex, setSpeakerIndex, setSpeechRunning } = params

      const transition = startParticipantSpeech({
        debateMode,
        status,
        isCurrentSpeakerSelf,
      })

      if (transition.shouldRequest) {
        if (selectedMemberIndex >= 0) {
          setSpeakerIndex(selectedMemberIndex)
        }
        setStatus(transition.nextStatus)
        clearRequestTimer()
        requestTimerRef.current = window.setTimeout(() => {
          setStatus("ready")
          requestTimerRef.current = null
        }, transition.requestDelayMs)
        return
      }

      if (transition.shouldStartSpeech) {
        if (selectedMemberIndex >= 0) {
          setSpeakerIndex(selectedMemberIndex)
        }
        setSpeechRunning(true)
        setStatus(transition.nextStatus)
      }
    },
    [clearRequestTimer, status]
  )

  const endSpeech = useCallback(
    (params: {
      debateMode: DebateMode
      onOrderedEnd: () => void
      setSpeechRunning: (running: boolean) => void
    }) => {
      const { debateMode, onOrderedEnd, setSpeechRunning } = params
      const transition = finishParticipantSpeech({
        debateMode,
        status,
        completedSpeeches,
      })

      if (!transition.shouldAdvanceOrderedFlow && transition.nextStatus === status) return
      if (debateMode === "Free") {
        setSpeechRunning(false)
        setStatus(transition.nextStatus)
        setCompletedSpeeches(transition.completedSpeeches)
        return
      }

      if (transition.shouldAdvanceOrderedFlow) {
        onOrderedEnd()
      }
      setStatus(transition.nextStatus)
    },
    [completedSpeeches, status]
  )

  useEffect(() => {
    return () => {
      clearRequestTimer()
    }
  }, [clearRequestTimer])

  return {
    status,
    completedSpeeches,
    resetForSession,
    resetForStudent,
    syncWithSpeechRunning,
    requestOrStartSpeech,
    endSpeech,
    setStatus,
  }
}

