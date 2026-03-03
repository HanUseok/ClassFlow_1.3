"use client"

import { useCallback, useEffect, useMemo } from "react"
import { buildSuggestedArgumentCards, type ArgumentCard } from "@/lib/domain/session/create-session"

type UseDebateCardsParams = {
  isDebate: boolean
  debateStep: "setup" | "cards" | "headcount" | "placement"
  topic: string
  argumentCards: ArgumentCard[]
  setArgumentCards: (cards: ArgumentCard[]) => void
  setIsGeneratingCards: (value: boolean) => void
  setDebateStep: (step: "setup" | "cards" | "headcount" | "placement") => void
}

export function useDebateCards({
  isDebate,
  debateStep,
  topic,
  argumentCards,
  setArgumentCards,
  setIsGeneratingCards,
  setDebateStep,
}: UseDebateCardsParams) {
  const validEnabledCards = useMemo(
    () => argumentCards.filter((card) => card.enabled && card.title.trim().length > 0 && card.claim.trim().length > 0),
    [argumentCards]
  )

  const cardsReady = !isDebate || validEnabledCards.length >= 3

  useEffect(() => {
    if (!isDebate || debateStep !== "cards") return
    if (argumentCards.length > 0) return
    setArgumentCards(buildSuggestedArgumentCards(topic))
  }, [isDebate, debateStep, argumentCards.length, topic, setArgumentCards])

  const openCardsStep = useCallback(
    (forceRegenerate = false) => {
      setDebateStep("cards")
      const needsGeneration = forceRegenerate || argumentCards.length === 0
      if (!needsGeneration) return

      setIsGeneratingCards(true)
      window.setTimeout(() => {
        setArgumentCards(buildSuggestedArgumentCards(topic))
        setIsGeneratingCards(false)
      }, 700)
    },
    [argumentCards.length, setDebateStep, setIsGeneratingCards, setArgumentCards, topic]
  )

  return {
    cardsReady,
    openCardsStep,
  }
}
