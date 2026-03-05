import { PHASE, type PhaseKey } from "@/lib/domain/session"

export function getPhaseLabel(phase: string) {
  if (phase === PHASE.OPENING) return "입론"
  if (phase === PHASE.REBUTTAL) return "반론"
  if (phase === PHASE.REREBUTTAL) return "재반론"
  if (phase === PHASE.FINAL_SUMMARY) return "마무리"
  return phase
}

export function getSpeakerBoundaryState(phase: PhaseKey, currentIndex: number, teamSize: number) {
  const hasSpeakers = teamSize > 0
  const isFirstBoundary = phase === PHASE.OPENING && currentIndex === 0
  const isLastBoundary = hasSpeakers && phase === PHASE.FINAL_SUMMARY && currentIndex === teamSize - 1
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
  return "대기중"
}
