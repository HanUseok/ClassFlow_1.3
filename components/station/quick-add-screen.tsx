"use client"
/* eslint-disable react-hooks/refs */

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Eye, FileText, Hand, Lock, Mic, MicOff } from "lucide-react"
import { buildSessionReportPath, saveSpeech } from "@/lib/application/session-service"
import { useQuickAddCards, type CardType } from "@/hooks/station/use-quick-add-cards"
import { useSpeechControls } from "@/hooks/station/use-speech-controls"

interface QuickAddScreenProps {
  round: number
  phase: string
  durationSeconds: number
  recordLimitPerRound: number
  sessionId?: string
  teacherGuided?: boolean
  sessionTitle?: string
  sessionStatus?: "Pending" | "Live" | "Ended"
  groupCount?: number
  groupLayout?: string
  argumentCards?: {
    id: string
    title: string
    claim: string
    evidenceHint?: string
    side?: "affirmative" | "negative" | "neutral"
    enabled: boolean
  }[]
  teamMembers: { id: string; name: string; roleLabel?: string }[]
  currentSpeaker?: { id: string; name: string; roleLabel?: string }
  debateMode?: "Ordered" | "Free"
  onStartSpeech?: () => void
  onEndSpeech?: () => void
  debateFinished?: boolean
  compact?: boolean
  startOnlyMode?: boolean
  speechRunning?: boolean
  startOnlyStatus?: "idle" | "requesting" | "ready" | "running"
  participantCanStart?: boolean
  participantUseRequestFlow?: boolean
  participantRecordingEnabled?: boolean
  showCards?: boolean
  speechType?: "질문" | "반박" | "동의" | null
  onSpeechTypeChange?: (value: "질문" | "반박" | "동의" | null) => void
}

type SpeechHistoryItem = {
  phase: string
  speaker: string
  speechType?: string
  argumentCard: string
  argumentKeyword: string
  thinkingCard: string
  thinkingKeyword: string
}

function getCardTone(type: CardType) {
  if (type === "argument") {
    return {
      shell: "border-sky-300 bg-gradient-to-b from-sky-50 to-cyan-100",
      team: "text-sky-700",
      title: "text-sky-950",
      body: "text-slate-700",
    }
  }

  return {
    shell: "border-violet-300 bg-gradient-to-b from-violet-50 to-fuchsia-100",
    team: "text-violet-700",
    title: "text-violet-950",
    body: "text-slate-700",
  }
}

export function QuickAddScreen({
  round,
  phase,
  durationSeconds,
  recordLimitPerRound,
  sessionId,
  teacherGuided = false,
  sessionTitle = "토론 세션",
  sessionStatus = "Live",
  groupCount,
  groupLayout,
  argumentCards,
  teamMembers,
  currentSpeaker,
  debateMode = "Ordered",
  onStartSpeech,
  onEndSpeech,
  debateFinished,
  startOnlyMode = false,
  speechRunning = false,
  startOnlyStatus = "idle",
  participantCanStart = true,
  participantUseRequestFlow = true,
  participantRecordingEnabled = true,
  showCards = true,
  speechType = null,
  onSpeechTypeChange,
}: QuickAddScreenProps) {
  const [speechHistory, setSpeechHistory] = useState<SpeechHistoryItem[]>([])
  const isFreeMode = debateMode === "Free"
  const router = useRouter()

  const cards = useQuickAddCards({
    argumentCards,
    currentSpeakerRoleLabel: currentSpeaker?.roleLabel,
    showCards,
    isFreeMode,
  })

  const speechControls = useSpeechControls({
    startOnlyMode,
    debateMode,
    phase,
    currentSpeakerId: currentSpeaker?.id,
    showCards,
    onStartSpeech,
    onEndSpeech,
  })

  const showRunningPanel =
    (!startOnlyMode && speechControls.isRunning) ||
    (startOnlyMode && speechRunning && !participantRecordingEnabled)
  const showStartPanel = true
  const startButtonDisabled = startOnlyMode
    ? startOnlyStatus === "requesting" || (!participantCanStart && startOnlyStatus !== "running")
    : speechControls.isRunning || speechControls.isGranting
  const startPanelHidden = (!startOnlyMode && speechControls.isRunning) || (startOnlyMode && showRunningPanel)
  const nonRecordingParticipantMode = startOnlyMode && !participantRecordingEnabled
  const startOnlyButtonLabel =
    !participantCanStart && startOnlyStatus !== "running"
      ? "다른 사람 말하는 중"
      : startOnlyStatus === "running"
        ? "발언 종료"
        : !participantUseRequestFlow
          ? "발언 시작"
          : startOnlyStatus === "requesting"
            ? "발언 요청 중..."
            : startOnlyStatus === "ready"
              ? "발언 시작 가능"
              : "발언 요청"

  const startButtonClassName = startOnlyMode
    ? startOnlyStatus === "running"
      ? "h-[300px] w-full gap-3 rounded-2xl bg-rose-600 text-xl font-bold text-white transition-all duration-500 hover:bg-rose-700"
      : participantUseRequestFlow && startOnlyStatus === "idle"
        ? "h-[300px] w-full gap-3 rounded-2xl bg-slate-400 text-xl font-bold text-white transition-all duration-500 hover:bg-slate-500"
        : !participantCanStart
          ? "h-[300px] w-full gap-3 rounded-2xl bg-slate-400 text-xl font-bold text-white transition-all duration-500 hover:bg-slate-500"
          : nonRecordingParticipantMode
            ? "h-[300px] w-full gap-3 rounded-2xl bg-amber-600 text-xl font-bold text-white transition-all duration-500 hover:bg-amber-700"
            : "h-[300px] w-full gap-3 rounded-2xl bg-emerald-600 text-xl font-bold text-white transition-all duration-500 hover:bg-emerald-700"
    : "h-[300px] w-full gap-3 rounded-2xl bg-emerald-600 text-xl font-bold text-white transition-all duration-500 hover:bg-emerald-700"

  const phaseLabel = useMemo(() => {
    const labels: Record<string, string> = {
      Opening: "입론",
      Rebuttal: "반론",
      Rerebuttal: "재반론",
      FinalSummary: "마무리",
    }
    return labels[phase] ?? phase
  }, [phase])

  const handleEndSpeech = () => {
    const speakerLabel = currentSpeaker ? `${currentSpeaker.roleLabel ?? ""} ${currentSpeaker.name}`.trim() : "발언자 미상"
    const argumentCard = cards.equippedArgument?.title ?? "-"
    const thinkingCard = cards.equippedAccidentType?.title ?? "-"
    const argumentKeyword = cards.equippedArgument?.body ?? "-"
    const thinkingKeyword = cards.equippedAccidentType?.body ?? "-"

    setSpeechHistory((prev) =>
      saveSpeech(
        prev,
        {
          phase: phaseLabel,
          speaker: speakerLabel,
          speechType: isFreeMode ? speechType ?? "-" : undefined,
          argumentCard,
          argumentKeyword,
          thinkingCard,
          thinkingKeyword,
        },
        recordLimitPerRound
      )
    )

    cards.setPanelOpen(isFreeMode)
    cards.resetEquipped()
    cards.closePreview()
    if (isFreeMode) onSpeechTypeChange?.(null)
    speechControls.handleEndClick()
  }

  return (
    <div className="relative overflow-visible rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 via-lime-50 to-amber-50 p-4">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background:radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.20),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(234,179,8,0.20),transparent_35%)]" />

      <div className="relative flex flex-col gap-4">
        <div className="rounded-2xl border border-slate-300 bg-white/90 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span />
            <span />
          </div>

          {showRunningPanel ? (
            <Button
              size="lg"
              className={
                startOnlyMode
                  ? showCards && !speechControls.cardsVisible
                    ? nonRecordingParticipantMode
                      ? "h-[300px] w-full gap-3 rounded-2xl bg-amber-700 text-xl font-bold text-white transition-all duration-500 hover:bg-amber-800"
                      : "h-[300px] w-full gap-3 rounded-2xl bg-rose-600 text-xl font-bold text-white transition-all duration-500 hover:bg-rose-700"
                    : nonRecordingParticipantMode
                      ? "w-full gap-2 bg-amber-700 text-white hover:bg-amber-800"
                      : "w-full gap-2 bg-rose-600 text-white hover:bg-rose-700"
                  : "h-[300px] w-full gap-3 rounded-2xl bg-rose-600 text-xl font-bold text-white transition-all duration-500 hover:bg-rose-700"
              }
              onClick={handleEndSpeech}
            >
              {isFreeMode ? <MicOff className="h-7 w-7" /> : <Lock className="h-4 w-4" />}
              {isFreeMode ? "발언 종료" : "발언 중지"}
            </Button>
          ) : null}

          {showStartPanel ? (
            <div
              className={`origin-top transition-all duration-500 ease-out ${
                startPanelHidden
                  ? "pointer-events-none max-h-0 -translate-y-6 scale-90 overflow-hidden opacity-0"
                  : "mt-3 max-h-[360px] translate-y-0 scale-100 opacity-100"
              }`}
            >
              {debateFinished && !startOnlyMode && !isFreeMode ? (
                <Button
                  size="lg"
                  className="h-[300px] w-full gap-3 rounded-2xl bg-slate-800 text-xl font-bold text-white transition-all duration-500 hover:bg-slate-900"
                  onClick={() => {
                    const path = buildSessionReportPath({
                      names: teamMembers.map((m) => m.name),
                      round,
                      phase: phaseLabel,
                      logs: speechHistory,
                      sessionId: sessionId?.trim() ? sessionId : undefined,
                      teacherGuided,
                      sessionTitle,
                      sessionStatus,
                      groupCount,
                      groupLayout: groupLayout?.trim() ? groupLayout : undefined,
                    })
                    router.push(path)
                  }}
                  disabled={speechControls.isRunning}
                >
                  <FileText className="h-7 w-7" />
                  토론 종료
                </Button>
              ) : (
                <Button
                  size="lg"
                  className={startButtonClassName}
                  onClick={() => speechControls.handleStartClick(startOnlyStatus)}
                  disabled={startButtonDisabled}
                >
                  {startOnlyMode ? (
                    !participantCanStart && startOnlyStatus !== "running" ? (
                      <Lock className="h-7 w-7" />
                    ) : participantUseRequestFlow && (startOnlyStatus === "idle" || startOnlyStatus === "requesting") ? (
                      <Hand className="h-7 w-7" />
                    ) : (
                      <Mic className="h-7 w-7" />
                    )
                  ) : (
                    <Hand className="h-7 w-7" />
                  )}
                  {startOnlyMode
                    ? startOnlyButtonLabel
                    : speechControls.isGranting
                      ? "발언권 부여 중..."
                      : "발언권 부여"}
                </Button>
              )}
            </div>
          ) : null}
        </div>

        {showRunningPanel && showCards ? (
          <div className="mb-2 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => speechControls.setCardsVisible((prev) => !prev)}
            >
              {speechControls.cardsVisible ? "카드 숨기기" : "카드 보기"}
            </Button>
          </div>
        ) : null}

        {showRunningPanel && showCards && speechControls.cardsVisible ? (
          <>
            <div className="flex flex-wrap justify-center gap-4">
              <div
                ref={cards.argumentSlotRef}
                onClick={() => cards.handleSlotTap("argument")}
                className={`relative flex h-[290px] w-[200px] items-center justify-center rounded-2xl border-2 p-3 transition ${
                  cards.activeSlot === "argument"
                    ? "border-sky-500 bg-sky-100/70"
                    : "border-slate-300 bg-white/75"
                } ${
                  cards.dragOverSlot === "argument"
                    ? cards.isArgumentDropInvalid
                      ? "border-red-500 ring-4 ring-red-300/60"
                      : "ring-4 ring-sky-300/60"
                    : ""
                } ${cards.snapSlot === "argument" ? "scale-[1.02]" : ""}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    cards.handleSlotTap("argument")
                  }
                }}
              >
                <p className="pointer-events-none absolute top-3 left-3 text-xs font-semibold text-sky-700">
                  논거 슬롯
                </p>
                {cards.equippedArgument ? (
                  <button
                    type="button"
                    onPointerDown={(e) => cards.handleCardPointerDown(e, cards.equippedArgument, { kind: "slot", slot: "argument" })}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (cards.suppressClickCardId === cards.equippedArgument?.id) return
                      cards.unequipSlot("argument")
                      cards.setPanelOpen(true)
                    }}
                    className="relative h-[250px] w-[170px] rounded-xl border-2 border-sky-300 bg-gradient-to-b from-sky-50 to-cyan-100 p-3 text-left shadow-lg"
                  >
                    {cards.equippedArgument.team ? (
                      <p className="text-[11px] font-semibold text-sky-700">{cards.equippedArgument.team}</p>
                    ) : null}
                    <p className="mt-1 text-sm font-bold text-sky-950">{cards.equippedArgument.title}</p>
                    <p className="mt-2 line-clamp-4 text-xs text-slate-700">{cards.equippedArgument.body}</p>
                  </button>
                ) : (
                  <p className="pointer-events-none text-xs text-slate-500">탭하거나 카드를 드롭해 배치</p>
                )}
              </div>

              <div
                ref={cards.accidentSlotRef}
                onClick={() => cards.handleSlotTap("accidentType")}
                className={`relative flex h-[290px] w-[200px] items-center justify-center rounded-2xl border-2 p-3 transition ${
                  cards.activeSlot === "accidentType"
                    ? "border-violet-500 bg-violet-100/70"
                    : "border-slate-300 bg-white/75"
                } ${
                  cards.dragOverSlot === "accidentType"
                    ? cards.isAccidentDropInvalid
                      ? "border-red-500 ring-4 ring-red-300/60"
                      : "ring-4 ring-violet-300/60"
                    : ""
                } ${cards.snapSlot === "accidentType" ? "scale-[1.02]" : ""}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    cards.handleSlotTap("accidentType")
                  }
                }}
              >
                <p className="pointer-events-none absolute top-3 left-3 text-xs font-semibold text-violet-700">
                  사고 유형 슬롯
                </p>
                {cards.equippedAccidentType ? (
                  <button
                    type="button"
                    onPointerDown={(e) => cards.handleCardPointerDown(e, cards.equippedAccidentType, { kind: "slot", slot: "accidentType" })}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (cards.suppressClickCardId === cards.equippedAccidentType?.id) return
                      cards.unequipSlot("accidentType")
                      cards.setPanelOpen(true)
                    }}
                    className="relative h-[250px] w-[170px] rounded-xl border-2 border-violet-300 bg-gradient-to-b from-violet-50 to-fuchsia-100 p-3 text-left shadow-lg"
                  >
                    <p className="mt-1 text-sm font-bold text-violet-950">{cards.equippedAccidentType.title}</p>
                    <p className="mt-2 line-clamp-4 text-xs text-slate-700">{cards.equippedAccidentType.body}</p>
                  </button>
                ) : (
                  <p className="pointer-events-none text-xs text-slate-500">탭하거나 카드를 드롭해 배치</p>
                )}
              </div>
            </div>

            {cards.previewCard ? (
              <button
                type="button"
                onClick={cards.closePreview}
                className="fixed inset-0 z-[70] bg-black/35 transition-opacity duration-300"
                aria-label="프리뷰 닫기"
              />
            ) : null}

            {cards.previewCard && cards.previewRect ? (
              <div className="pointer-events-none fixed inset-0 z-[80]">
                <button
                  type="button"
                  onClick={cards.closePreview}
                  className={`pointer-events-auto fixed rounded-xl border-2 p-4 text-left shadow-2xl ${getCardTone(cards.previewCard.type).shell}`}
                  style={{
                    left: cards.previewRect.left,
                    top: cards.previewRect.top,
                    width: cards.previewRect.width,
                    height: cards.previewRect.height,
                    transformOrigin: "top left",
                    transform: cards.previewOpen
                      ? `translate(${cards.previewTransform.x}px, ${cards.previewTransform.y}px) scale(${cards.previewTransform.sx}, ${cards.previewTransform.sy})`
                      : "translate(0px, 0px) scale(1, 1)",
                    transition: "transform 340ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                  }}
                >
                  {cards.previewCard.team ? (
                    <p className={`text-xs font-semibold ${getCardTone(cards.previewCard.type).team}`}>
                      {cards.previewCard.team}
                    </p>
                  ) : null}
                  <p className={`mt-1 text-lg font-bold ${getCardTone(cards.previewCard.type).title}`}>
                    {cards.previewCard.title}
                  </p>
                  <p className={`mt-2 text-sm leading-relaxed ${getCardTone(cards.previewCard.type).body}`}>
                    {cards.previewCard.body}
                  </p>
                </button>
              </div>
            ) : null}

            <div
              className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-6xl transition-transform duration-300 ${
                cards.panelOpen ? "translate-y-0" : "translate-y-full"
              }`}
            >
              <div className="pointer-events-none max-h-[45vh] overflow-auto px-4 pb-3">
                {cards.activeSlot === "argument" ? (
                  <div
                    ref={cards.argumentHandRef}
                    className="pointer-events-none flex min-h-[280px] items-end justify-center px-2 pb-4 pt-8"
                  >
                    {cards.visibleArgumentHandCards.map((card, index) => (
                      <button
                        key={card.id}
                        type="button"
                        data-hand-card-id={card.id}
                        onPointerDown={(e) => cards.handleCardPointerDown(e, card, { kind: "hand" })}
                        onClick={(e) => {
                          if (cards.suppressClickCardId === card.id) return
                          cards.openPreview(card, e)
                        }}
                        className={`pointer-events-auto relative h-[250px] w-[170px] rounded-xl border-2 border-sky-300 bg-gradient-to-b from-sky-50 to-cyan-100 p-3 text-left shadow-lg transition duration-500 hover:-translate-y-2 hover:shadow-xl ${
                          cards.panelOpen ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
                        }`}
                        style={{
                          marginLeft: index === 0 ? 0 : -18,
                          transform: `${cards.panelOpen ? "translateY(118px)" : "translateY(220px)"}`,
                          transitionDelay: `${index * 80}ms`,
                          zIndex: index + 1,
                        }}
                      >
                        {card.team ? <p className="text-[11px] font-semibold text-sky-700">{card.team}</p> : null}
                        <p className="mt-1 text-sm font-bold text-sky-950">{card.title}</p>
                        <p className="mt-2 line-clamp-4 text-xs text-slate-700">{card.body}</p>
                        <div className="absolute right-2 bottom-2 inline-flex items-center gap-1 text-[10px] text-sky-700">
                          <Eye className="h-3 w-3" />
                          확대
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div
                    ref={cards.accidentHandRef}
                    className="pointer-events-none flex min-h-[280px] items-end justify-center px-2 pb-4 pt-8"
                  >
                    {cards.visibleAccidentCards.map((card, index) => (
                      <button
                        key={card.id}
                        type="button"
                        data-hand-card-id={card.id}
                        onPointerDown={(e) => cards.handleCardPointerDown(e, card, { kind: "hand" })}
                        onClick={(e) => {
                          if (cards.suppressClickCardId === card.id) return
                          cards.openPreview(card, e)
                        }}
                        className={`pointer-events-auto relative h-[250px] w-[170px] rounded-xl border-2 border-violet-300 bg-gradient-to-b from-violet-50 to-fuchsia-100 p-3 text-left shadow-lg transition duration-500 hover:-translate-y-2 hover:shadow-xl ${
                          cards.panelOpen ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
                        }`}
                        style={{
                          marginLeft: index === 0 ? 0 : -18,
                          transform: `${cards.panelOpen ? "translateY(118px)" : "translateY(220px)"}`,
                          transitionDelay: `${index * 80}ms`,
                          zIndex: index + 1,
                        }}
                      >
                        <p className="mt-1 text-sm font-bold text-violet-950">{card.title}</p>
                        <p className="mt-2 line-clamp-4 text-xs text-slate-700">{card.body}</p>
                        <div className="absolute right-2 bottom-2 inline-flex items-center gap-1 text-[10px] text-violet-700">
                          <Eye className="h-3 w-3" />
                          확대
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {cards.draggingCard ? (
              <div className="pointer-events-none fixed inset-0 z-[90]">
                <div
                  className={`fixed h-[250px] w-[170px] rounded-xl border-2 p-3 text-left shadow-2xl ${getCardTone(cards.draggingCard.type).shell}`}
                  style={{
                    left: cards.dragState?.x ?? 0,
                    top: cards.dragState?.y ?? 0,
                  }}
                >
                  {cards.draggingCard.team ? (
                    <p className={`text-[11px] font-semibold ${getCardTone(cards.draggingCard.type).team}`}>
                      {cards.draggingCard.team}
                    </p>
                  ) : null}
                  <p className={`mt-1 text-sm font-bold ${getCardTone(cards.draggingCard.type).title}`}>
                    {cards.draggingCard.title}
                  </p>
                  <p className={`mt-2 line-clamp-4 text-xs ${getCardTone(cards.draggingCard.type).body}`}>
                    {cards.draggingCard.body}
                  </p>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}


