"use client"

import { useMemo, useState } from "react"
import type { Session, Student } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { LiveDebateScreen } from "@/components/station/live-debate-screen"
import { Pause, Play, Square } from "lucide-react"

type TeamGroup = NonNullable<Session["teams"]>
type PhaseKey = "Opening" | "Rebuttal" | "Rerebuttal" | "FinalSummary"
const PHASE_ORDER: PhaseKey[] = ["Opening", "Rebuttal", "Rerebuttal", "FinalSummary"]

export function LiveView({
  session,
  onEnd,
  onTeamsChange,
}: {
  session: Session
  onEnd: () => void
  onTeamsChange?: (teams: TeamGroup) => void
  onDebateGroupsChange?: (groups: NonNullable<NonNullable<Session["debate"]>["groups"]>) => void
}) {
  const [round] = useState(1)
  const [phase, setPhase] = useState<PhaseKey>("Opening")
  const [isSpeechRunning, setIsSpeechRunning] = useState(true)

  const [team1Order, setTeam1Order] = useState<Student[]>(session.teams?.team1 ?? [])
  const [team2Order, setTeam2Order] = useState<Student[]>(session.teams?.team2 ?? [])
  const [currentSpeakerIndex, setCurrentSpeakerIndex] = useState(0)

  const orderedMembers = useMemo(() => {
    const maxLength = Math.max(team1Order.length, team2Order.length)
    const merged: { id: string; name: string; roleLabel: string; team: "team1" | "team2" }[] = []

    for (let i = 0; i < maxLength; i += 1) {
      const a = team1Order[i]
      if (a) merged.push({ id: a.id, name: a.name, roleLabel: `찬성 ${i + 1}`, team: "team1" })
      const n = team2Order[i]
      if (n) merged.push({ id: n.id, name: n.name, roleLabel: `반대 ${i + 1}`, team: "team2" })
    }

    return merged
  }, [team1Order, team2Order])

  const persistFromMerged = (nextMerged: { id: string; team: "team1" | "team2" }[]) => {
    const team1Map = new Map(team1Order.map((member) => [member.id, member]))
    const team2Map = new Map(team2Order.map((member) => [member.id, member]))
    const nextTeam1: Student[] = []
    const nextTeam2: Student[] = []

    nextMerged.forEach((member) => {
      if (member.team === "team1") {
        const mapped = team1Map.get(member.id)
        if (mapped) nextTeam1.push(mapped)
      } else {
        const mapped = team2Map.get(member.id)
        if (mapped) nextTeam2.push(mapped)
      }
    })

    setTeam1Order(nextTeam1)
    setTeam2Order(nextTeam2)
    onTeamsChange?.({ team1: nextTeam1, team2: nextTeam2 })
  }

  const moveOrderTo = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= orderedMembers.length || to >= orderedMembers.length) return

    const next = [...orderedMembers]
    const [picked] = next.splice(from, 1)
    next.splice(to, 0, picked)

    persistFromMerged(next)

    if (currentSpeakerIndex === from) setCurrentSpeakerIndex(to)
    else if (currentSpeakerIndex === to) setCurrentSpeakerIndex(from)
  }

  const handleNextSpeaker = () => {
    if (orderedMembers.length === 0) return
    const isFinalTurn = phase === "FinalSummary" && currentSpeakerIndex === orderedMembers.length - 1
    if (isFinalTurn) {
      onEnd()
      return
    }

    const isLastSpeaker = currentSpeakerIndex === orderedMembers.length - 1
    if (!isLastSpeaker) {
      setCurrentSpeakerIndex((prev) => prev + 1)
      return
    }

    const phaseIndex = PHASE_ORDER.indexOf(phase)
    const hasNextPhase = phaseIndex >= 0 && phaseIndex < PHASE_ORDER.length - 1
    if (hasNextPhase) {
      setPhase(PHASE_ORDER[phaseIndex + 1])
      setCurrentSpeakerIndex(0)
      return
    }

    setCurrentSpeakerIndex(0)
  }

  const isFinalTurn = orderedMembers.length > 0 && phase === "FinalSummary" && currentSpeakerIndex === orderedMembers.length - 1

  return (
    <div className="flex flex-col gap-6">
      <LiveDebateScreen
        round={round}
        phase={phase}
        durationSeconds={120}
        isSpeechRunning={isSpeechRunning}
        teamMembers={orderedMembers}
        currentSpeakerIndex={currentSpeakerIndex}
        onMoveOrderTo={moveOrderTo}
        onSelectSpeaker={setCurrentSpeakerIndex}
        onPhaseChange={(next) => {
          const nextPhase = next as PhaseKey
          setPhase(nextPhase)
          setCurrentSpeakerIndex(0)
          setIsSpeechRunning(false)
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" className="gap-2" onClick={() => setIsSpeechRunning((prev) => !prev)}>
          {isSpeechRunning ? (
            <>
              <Pause className="h-4 w-4" />
              일시정지
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              재개
            </>
          )}
        </Button>
        <Button variant={isFinalTurn ? "destructive" : "outline"} onClick={handleNextSpeaker}>
          {isFinalTurn ? "토론 종료" : "다음 발언자"}
        </Button>
        <Button variant="destructive" className="gap-2" onClick={onEnd}>
          <Square className="h-4 w-4" />
          세션 종료
        </Button>
      </div>
    </div>
  )
}
