import type { PhaseKey } from "@/lib/domain/session"

export function getPhaseLabel(phase: string) {
  return phase === "Opening" ? "입론" : phase === "Rebuttal" ? "반론" : phase === "Rerebuttal" ? "재반론" : "마무리"
}

export function getSpeakerBoundaryState(phase: PhaseKey, currentIndex: number, teamSize: number) {
  const hasSpeakers = teamSize > 0
  const isFirstBoundary = phase === "Opening" && currentIndex === 0
  const isLastBoundary = hasSpeakers && phase === "FinalSummary" && currentIndex === teamSize - 1
  return {
    hasSpeakers,
    isFirstBoundary,
    isLastBoundary,
    hasPrevSpeaker: hasSpeakers && !isFirstBoundary,
    hasNextSpeaker: hasSpeakers && !isLastBoundary,
  }
}

export function getDebateStatusLabel({
  endedByDebateClose,
  sessionEnded,
  isRunning,
}: {
  endedByDebateClose: boolean
  sessionEnded: boolean
  isRunning: boolean
}) {
  if (endedByDebateClose || sessionEnded) return "토론 종료"
  if (isRunning) return "발언중"
  return "완료"
}

