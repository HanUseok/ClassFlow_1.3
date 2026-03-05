"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type UseSpeechControlsParams = {
  startOnlyMode: boolean
  debateMode: "Ordered" | "Free"
  phase: string
  currentSpeakerId?: string
  showCards: boolean
  onStartSpeech?: () => void
  onEndSpeech?: () => void
}

export function useSpeechControls({
  startOnlyMode,
  debateMode,
  phase,
  currentSpeakerId,
  showCards,
  onStartSpeech,
  onEndSpeech,
}: UseSpeechControlsParams) {
  const [isRunning, setIsRunning] = useState(false)
  const [isGranting, setIsGranting] = useState(false)
  const [cardsVisible, setCardsVisible] = useState(true)
  const grantTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (showCards) {
      setCardsVisible(true)
      return
    }
    setCardsVisible(false)
  }, [showCards])

  useEffect(() => {
    if (debateMode === "Free") {
      setIsRunning(false)
    }
  }, [debateMode])

  useEffect(() => {
    if (startOnlyMode) return
    if (grantTimerRef.current) {
      window.clearTimeout(grantTimerRef.current)
      grantTimerRef.current = null
    }
    setIsGranting(false)
    setIsRunning(false)
  }, [startOnlyMode, debateMode, phase, currentSpeakerId])

  useEffect(() => {
    return () => {
      if (grantTimerRef.current) {
        window.clearTimeout(grantTimerRef.current)
        grantTimerRef.current = null
      }
    }
  }, [])

  const handleStartClick = useCallback(
    (status: "idle" | "requesting" | "ready" | "running") => {
      if (startOnlyMode) {
        if (status === "running") onEndSpeech?.()
        else onStartSpeech?.()
        return
      }

      if (isGranting || isRunning) return
      setIsGranting(true)

      if (grantTimerRef.current) {
        window.clearTimeout(grantTimerRef.current)
        grantTimerRef.current = null
      }

      grantTimerRef.current = window.setTimeout(() => {
        setIsGranting(false)
        onStartSpeech?.()
        setIsRunning(true)
        grantTimerRef.current = null
      }, 1000)
    },
    [isGranting, isRunning, onEndSpeech, onStartSpeech, startOnlyMode]
  )

  const handleEndClick = useCallback(() => {
    setIsRunning(false)
    setIsGranting(false)
    onEndSpeech?.()
  }, [onEndSpeech])

  const resetRunningState = useCallback(() => {
    setIsRunning(false)
    setIsGranting(false)
  }, [])

  return {
    isRunning,
    isGranting,
    cardsVisible,
    setCardsVisible,
    setIsRunning,
    handleStartClick,
    handleEndClick,
    resetRunningState,
  }
}
