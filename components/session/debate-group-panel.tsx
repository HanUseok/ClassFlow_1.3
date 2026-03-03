"use client"

import { Pause, Play, Square } from "lucide-react"
import type { Session } from "@/lib/mock-data"
import type { DebateGroup, PhaseKey } from "@/lib/domain/session"
import { LiveDebateScreen } from "@/components/station/live-debate-screen"
import { QuickAddScreen } from "@/components/station/quick-add-screen"
import { Button } from "@/components/ui/button"

type TeamMember = { id: string; name: string; roleLabel: string; team: "team1" | "team2" }

type DebateGroupPanelProps = {
  group: DebateGroup
  groupIndex: number
  isOpen: boolean
  phase: PhaseKey
  phaseLabel: string
  statusLabel: string
  isRunning: boolean
  isDebateFinished: boolean
  hasPrevSpeaker: boolean
  hasNextSpeaker: boolean
  firstSpeaker: string
  teamMembers: TeamMember[]
  currentIndex: number
  debateMode: "Ordered" | "Free"
  session: Session
  isTeacherGuided: boolean
  viewMode: "progress" | "manage"
  isSessionEnded: boolean
  groupCount: number
  groupLayout: string
  onToggleOpen: () => void
  onEndDebate: () => void
  onSelectSpeaker: (idx: number) => void
  onPhaseChange: (next: string) => void
  onMoveOrderTo: (from: number, to: number) => void
  onStartSpeech: () => void
  onEndSpeech: () => void
  onStartDebate: () => void
  onToggleRunning: () => void
  onPrevSpeaker: () => void
  onNextSpeaker: () => void
}

export function DebateGroupPanel({
  group,
  groupIndex,
  isOpen,
  phase,
  phaseLabel,
  statusLabel,
  isRunning,
  isDebateFinished,
  hasPrevSpeaker,
  hasNextSpeaker,
  firstSpeaker,
  teamMembers,
  currentIndex,
  debateMode,
  session,
  isTeacherGuided,
  viewMode,
  isSessionEnded,
  groupCount,
  groupLayout,
  onToggleOpen,
  onEndDebate,
  onSelectSpeaker,
  onPhaseChange,
  onMoveOrderTo,
  onStartSpeech,
  onEndSpeech,
  onStartDebate,
  onToggleRunning,
  onPrevSpeaker,
  onNextSpeaker,
}: DebateGroupPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-semibold text-card-foreground">{groupIndex + 1}조</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-card-foreground">{phaseLabel}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-card-foreground">{firstSpeaker}</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-medium text-emerald-600">{statusLabel}</span>
      </div>
      <button
        type="button"
        onClick={onToggleOpen}
        className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-card-foreground hover:bg-accent"
      >
        {isOpen ? `${groupIndex + 1}조 조정 닫기` : `${groupIndex + 1}조 조정 열기`}
      </button>

      {isOpen ? (
        <div className="mt-4 border-t border-border pt-4">
          <h2 className="mb-3 text-sm font-medium text-card-foreground">{groupIndex + 1}조 상세 조정</h2>
          <LiveDebateScreen
            round={1}
            phase={phase}
            durationSeconds={120}
            isSpeechRunning={isRunning}
            debateMode={debateMode}
            teamMembers={teamMembers}
            currentSpeakerIndex={currentIndex}
            onEndDebate={onEndDebate}
            onSelectSpeaker={onSelectSpeaker}
            onPhaseChange={onPhaseChange}
            onMoveOrderTo={onMoveOrderTo}
          />

          {viewMode === "progress" ? (
            <div className="mt-3">
              <QuickAddScreen
                round={1}
                phase={phase}
                durationSeconds={120}
                recordLimitPerRound={6}
                debateMode={debateMode}
                sessionId={session.id}
                teacherGuided={isTeacherGuided}
                sessionTitle={session.title}
                sessionStatus={session.status}
                groupCount={groupCount}
                groupLayout={groupLayout}
                argumentCards={session.debate?.argumentCards}
                teamMembers={teamMembers}
                currentSpeaker={teamMembers[currentIndex]}
                onStartSpeech={onStartSpeech}
                onEndSpeech={onEndSpeech}
                debateFinished={isDebateFinished}
                compact
              />
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {session.status === "Pending" ? (
                <Button size="sm" onClick={onStartDebate}>
                  토론 시작
                </Button>
              ) : null}
              <Button variant="outline" size="sm" className="gap-2" onClick={onToggleRunning}>
                {isRunning ? (
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
              {hasPrevSpeaker ? (
                <Button variant="outline" size="sm" onClick={onPrevSpeaker}>
                  이전 발언자
                </Button>
              ) : null}
              {hasNextSpeaker ? (
                <Button variant="outline" size="sm" onClick={onNextSpeaker}>
                  다음 발언자
                </Button>
              ) : null}
              <Button size="sm" variant="destructive" className="gap-2" onClick={onEndDebate} disabled={isSessionEnded}>
                <Square className="h-4 w-4" />
                토론 종료
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

