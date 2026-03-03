"use client"

import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Eye, FileText, Lock, Play, Save } from "lucide-react"
import { buildSessionReportPath, saveSpeech } from "@/lib/application/session-service"

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
}

type SlotKey = "argument" | "accidentType"
type CardType = "argument" | "accidentType"

type CardItem = {
  id: string
  type: CardType
  team?: "찬성" | "반대" | "중립"
  title: string
  body: string
}

type PreviewRect = { left: number; top: number; width: number; height: number }
type DragOrigin = { kind: "hand" } | { kind: "slot"; slot: SlotKey }
type DragState = {
  cardId: string
  cardType: CardType
  origin: DragOrigin
  x: number
  y: number
  width: number
  height: number
  offsetX: number
  offsetY: number
}

type SpeechHistoryItem = {
  phase: string
  speaker: string
  argumentCard: string
  argumentKeyword: string
  thinkingCard: string
  thinkingKeyword: string
}

const ARGUMENT_CARDS: CardItem[] = [
  {
    id: "a1",
    type: "argument",
    team: "찬성",
    title: "1) 뇌 발달/중독 메커니즘",
    body: "청소년기는 보상 자극에 취약해 스마트폰 중독 위험이 높으므로 일정 수준의 사용 제한이 필요하다.",
  },
  {
    id: "a2",
    type: "argument",
    team: "찬성",
    title: "2) 학습권/집중력 저하",
    body: "과도한 스마트폰 사용은 집중도를 저하시켜 교육 기회의 질을 떨어뜨릴 수 있다.",
  },
  {
    id: "a3",
    type: "argument",
    team: "찬성",
    title: "3) 수면권/건강권",
    body: "야간 스마트폰 사용은 수면 부족과 정신 건강 문제로 이어질 가능성이 크므로 최소한의 제한이 필요하다.",
  },
  {
    id: "a4",
    type: "argument",
    team: "반대",
    title: "4) 자기결정권/자율성",
    body: "청소년도 사용자로서의 자기결정권을 가지며, 획일적 제한은 과도한 기본권 침해가 될 수 있다.",
  },
  {
    id: "a5",
    type: "argument",
    team: "반대",
    title: "5) 실효성/우회 가능성",
    body: "기술적 차단만으로는 우회 방법이 존재해 실효성이 낮고, 오히려 음성적 사용을 늘릴 우려가 있다.",
  },
  {
    id: "a6",
    type: "argument",
    team: "반대",
    title: "6) 규제보다 미디어 교육",
    body: "강제보다 자기조절 교육과 보호자-교사 협력이 장기적으로 더 효과적일 수 있다.",
  },
  {
    id: "a7",
    type: "argument",
    team: "찬성",
    title: "7) 사이버폭력/유해노출 예방",
    body: "사용 제한은 사이버폭력과 유해 콘텐츠 노출 위험을 줄이는 예방 장치가 될 수 있다.",
  },
  {
    id: "a8",
    type: "argument",
    team: "반대",
    title: "8) 디지털 역량 저해",
    body: "과도한 제한은 정보 탐색·협업·미디어 리터러시 같은 역량 발달을 저해할 수 있다.",
  },
  {
    id: "a9",
    type: "argument",
    team: "중립",
    title: "9) 규제보다 미디어 교육",
    body: "일괄 규제보다 자기조절 교육과 가정-학교 공동지도가 장기적으로 더 효과적일 수 있다.",
  },
  {
    id: "a10",
    type: "argument",
    team: "중립",
    title: "10) 단계적·조건부 제한",
    body: "전면 금지보다 시간·장소·연령에 따른 단계적 제한이 현실적인 대안이 될 수 있다.",
  },
]

const ACCIDENT_TYPE_CARDS: CardItem[] = [
  { id: "t1", type: "accidentType", title: "적용", body: "개념/원칙을 현재 쟁점에 직접 연결" },
  { id: "t2", type: "accidentType", title: "인과 설명", body: "원인과 결과를 논리적으로 설명" },
  { id: "t3", type: "accidentType", title: "비교", body: "대안/사례와의 차이를 통해 주장 강화" },
  { id: "t4", type: "accidentType", title: "한계 지적", body: "주장/정책의 문제점과 경계조건 분석" },
  { id: "t5", type: "accidentType", title: "반례 제시", body: "예외 사례로 일반화 가능성 약화" },
  { id: "t6", type: "accidentType", title: "전제 분석", body: "숨은 가정 점검" },
  { id: "t7", type: "accidentType", title: "자료 보완", body: "통계/근거/사례로 설득력 강화" },
  { id: "t8", type: "accidentType", title: "입장 수정", body: "쟁점 과정 중 조건부 조정/확장" },
]

function formatClock(totalSeconds: number) {
  const mm = Math.floor(totalSeconds / 60)
  const ss = totalSeconds % 60
  return `${mm}:${ss.toString().padStart(2, "0")}`
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
}: QuickAddScreenProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [activeSlot, setActiveSlot] = useState<SlotKey>("argument")
  const [panelOpen, setPanelOpen] = useState(false)
  const [equipped, setEquipped] = useState<{ argument: string | null; accidentType: string | null }>({
    argument: null,
    accidentType: null,
  })
  const [dragOverSlot, setDragOverSlot] = useState<SlotKey | null>(null)
  const [snapSlot, setSnapSlot] = useState<SlotKey | null>(null)
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [suppressClickCardId, setSuppressClickCardId] = useState<string | null>(null)
  const [argumentOrder, setArgumentOrder] = useState<string[]>(() => ARGUMENT_CARDS.map((card) => card.id))
  const [accidentOrder, setAccidentOrder] = useState<string[]>(() => ACCIDENT_TYPE_CARDS.map((card) => card.id))

  const [previewCardId, setPreviewCardId] = useState<string | null>(null)
  const [previewRect, setPreviewRect] = useState<PreviewRect | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTransform, setPreviewTransform] = useState({ x: 0, y: 0, sx: 1, sy: 1 })
  const [speechHistory, setSpeechHistory] = useState<SpeechHistoryItem[]>([])
  const argumentSlotRef = useRef<HTMLDivElement | null>(null)
  const accidentSlotRef = useRef<HTMLDivElement | null>(null)
  const argumentHandRef = useRef<HTMLDivElement | null>(null)
  const accidentHandRef = useRef<HTMLDivElement | null>(null)
  const isFreeMode = debateMode === "Free"

  useEffect(() => {
    if (isFreeMode) {
      setPanelOpen(true)
      setIsRunning(false)
    }
  }, [isFreeMode])

  const argumentCardDeck = useMemo(() => {
    if (!argumentCards || argumentCards.length === 0) return ARGUMENT_CARDS

    const mapped = argumentCards
      .filter((card) => card.enabled)
      .map((card, index) => ({
        id: card.id || `a-custom-${index + 1}`,
        type: "argument" as const,
        team: card.side === "affirmative" ? ("찬성" as const) : card.side === "negative" ? ("반대" as const) : ("중립" as const),
        title: card.title.trim() || `논거 ${index + 1}`,
        body: card.claim?.trim() || card.evidenceHint?.trim() || "핵심 주장을 보완해 주세요.",
      }))

    return mapped.length > 0 ? mapped : ARGUMENT_CARDS
  }, [argumentCards])

  useEffect(() => {
    setArgumentOrder((prev) => {
      const nextIds = argumentCardDeck.map((card) => card.id)
      if (prev.length === 0) return nextIds
      const kept = prev.filter((id) => nextIds.includes(id))
      const added = nextIds.filter((id) => !kept.includes(id))
      return [...kept, ...added]
    })
  }, [argumentCardDeck])

  const currentTeam = useMemo<"찬성" | "반대" | null>(() => {
    const role = currentSpeaker?.roleLabel ?? ""
    if (role.includes("찬성")) return "찬성"
    if (role.includes("반대")) return "반대"
    return null
  }, [currentSpeaker?.roleLabel])

  const phaseLabel = useMemo(() => {
    const labels: Record<string, string> = {
      Opening: "입론",
      Rebuttal: "반론",
      Rerebuttal: "재반론",
      FinalSummary: "마무리",
    }
    return labels[phase] ?? phase
  }, [phase])
  const router = useRouter()

  const reportSpeakerLine = useMemo(() => {
    if (teamMembers.length === 0) return "발언자 정보 없음"
    return teamMembers.map((m) => `${m.roleLabel ?? ""} ${m.name}`.trim()).join(" · ")
  }, [teamMembers])

  const orderedArgumentCards = useMemo(() => {
    const map = new Map(argumentCardDeck.map((card) => [card.id, card]))
    return argumentOrder.map((id) => map.get(id)).filter((card): card is CardItem => Boolean(card))
  }, [argumentOrder, argumentCardDeck])

  const orderedAccidentCards = useMemo(() => {
    const map = new Map(ACCIDENT_TYPE_CARDS.map((card) => [card.id, card]))
    return accidentOrder.map((id) => map.get(id)).filter((card): card is CardItem => Boolean(card))
  }, [accidentOrder])

  const visibleArgumentCards = useMemo(
    () =>
      currentTeam
        ? orderedArgumentCards.filter((card) => card.team === currentTeam || card.team === "중립")
        : orderedArgumentCards,
    [currentTeam, orderedArgumentCards]
  )

  const activeCards = activeSlot === "argument" ? visibleArgumentCards : orderedAccidentCards
  const visibleArgumentHandCards = activeCards
    .filter((card) => card.id !== previewCardId && card.id !== equipped.argument && card.id !== draggingCardId)
  const visibleAccidentCards = activeCards.filter(
    (card) => card.id !== previewCardId && card.id !== equipped.accidentType && card.id !== draggingCardId
  )
  const allCards = useMemo(() => [...argumentCardDeck, ...ACCIDENT_TYPE_CARDS], [argumentCardDeck])
  const previewCard = allCards.find((card) => card.id === previewCardId) ?? null
  const equippedArgument = allCards.find((card) => card.id === equipped.argument) ?? null
  const equippedAccidentType = allCards.find((card) => card.id === equipped.accidentType) ?? null
  const draggingCard = allCards.find((card) => card.id === dragState?.cardId) ?? null
  const isArgumentDropInvalid = dragOverSlot === "argument" && dragState?.cardType !== undefined && dragState.cardType !== "argument"
  const isAccidentDropInvalid =
    dragOverSlot === "accidentType" && dragState?.cardType !== undefined && dragState.cardType !== "accidentType"

  const updateOrderForType = (type: CardType, updater: (prev: string[]) => string[]) => {
    if (type === "argument") {
      setArgumentOrder((prev) => updater(prev))
      return
    }
    setAccidentOrder((prev) => updater(prev))
  }

  const getVisibleIdsForType = (type: CardType, order: string[]) => {
    if (type === "argument") {
      const allowed = new Set(visibleArgumentCards.map((card) => card.id))
      return order.filter((id) => allowed.has(id))
    }
    const allowed = new Set(orderedAccidentCards.map((card) => card.id))
    return order.filter((id) => allowed.has(id))
  }

  const reorderWithinVisible = (type: CardType, cardId: string, targetIndex: number) => {
    updateOrderForType(type, (prev) => {
      const visibleIds = getVisibleIdsForType(type, prev)
      const visibleSet = new Set(visibleIds)
      if (!visibleSet.has(cardId)) return prev

      const nextVisible = visibleIds.filter((id) => id !== cardId)
      const safeIndex = Math.max(0, Math.min(targetIndex, nextVisible.length))
      nextVisible.splice(safeIndex, 0, cardId)

      let cursor = 0
      return prev.map((id) => {
        if (!visibleSet.has(id)) return id
        const nextId = nextVisible[cursor]
        cursor += 1
        return nextId
      })
    })
  }

  const handleSlotTap = (slot: SlotKey) => {
    if (previewCardId) closePreview()
    if (panelOpen && slot !== activeSlot) {
      setPanelOpen(false)
      window.setTimeout(() => {
        setActiveSlot(slot)
        setPanelOpen(true)
      }, 170)
      return
    }
    setActiveSlot(slot)
    setPanelOpen(true)
  }

  const unequipSlot = (slot: SlotKey) => {
    setEquipped((prev) => ({ ...prev, [slot]: null }))
  }

  const getSlotAtPoint = (clientX: number, clientY: number): SlotKey | null => {
    const argumentRect = argumentSlotRef.current?.getBoundingClientRect()
    if (
      argumentRect &&
      clientX >= argumentRect.left &&
      clientX <= argumentRect.right &&
      clientY >= argumentRect.top &&
      clientY <= argumentRect.bottom
    ) {
      return "argument"
    }
    const accidentRect = accidentSlotRef.current?.getBoundingClientRect()
    if (
      accidentRect &&
      clientX >= accidentRect.left &&
      clientX <= accidentRect.right &&
      clientY >= accidentRect.top &&
      clientY <= accidentRect.bottom
    ) {
      return "accidentType"
    }
    return null
  }

  const getHandDropIndex = (type: CardType, clientX: number, clientY: number): number | null => {
    const container = type === "argument" ? argumentHandRef.current : accidentHandRef.current
    if (!container) return null
    const rect = container.getBoundingClientRect()
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null

    const cardEls = Array.from(container.querySelectorAll<HTMLButtonElement>("button[data-hand-card-id]"))
    const centers = cardEls.map((el) => {
      const r = el.getBoundingClientRect()
      return { id: el.dataset.handCardId ?? "", centerX: r.left + r.width / 2 }
    })

    let insertIndex = centers.length
    for (let i = 0; i < centers.length; i += 1) {
      if (clientX < centers[i].centerX) {
        insertIndex = i
        break
      }
    }
    return insertIndex
  }

  const commitDrop = (slot: SlotKey, cardId: string) => {
    setEquipped((prev) => ({ ...prev, [slot]: cardId }))
    setSnapSlot(slot)
    window.setTimeout(() => setSnapSlot(null), 220)
  }

  const handleCardPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, card: CardItem, origin: DragOrigin) => {
    if (previewCardId) return
    if (event.button !== 0) return

    const source = event.currentTarget
    const sourceRect = source.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const offsetX = startX - sourceRect.left
    const offsetY = startY - sourceRect.top

    let moved = false

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      const distance = Math.hypot(dx, dy)
      if (!moved && distance < 7) return
      if (!moved) {
        moved = true
        setDraggingCardId(card.id)
      }
      const nextState: DragState = {
        cardId: card.id,
        cardType: card.type,
        origin,
        width: sourceRect.width,
        height: sourceRect.height,
        offsetX,
        offsetY,
        x: moveEvent.clientX - offsetX,
        y: moveEvent.clientY - offsetY,
      }
      setDragState(nextState)
      const hoverSlot = getSlotAtPoint(moveEvent.clientX, moveEvent.clientY)
      setDragOverSlot(hoverSlot)
    }

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)

      if (moved) {
        const hoverSlot = getSlotAtPoint(upEvent.clientX, upEvent.clientY)
        if ((hoverSlot === "argument" && card.type === "argument") || (hoverSlot === "accidentType" && card.type === "accidentType")) {
          commitDrop(hoverSlot, card.id)
        } else {
          const handIndex = getHandDropIndex(card.type, upEvent.clientX, upEvent.clientY)
          if (handIndex !== null) {
            if (origin.kind === "slot") {
              unequipSlot(origin.slot)
            }
            reorderWithinVisible(card.type, card.id, handIndex)
            setActiveSlot(card.type === "argument" ? "argument" : "accidentType")
            setPanelOpen(true)
          }
        }
        setSuppressClickCardId(card.id)
        window.setTimeout(() => setSuppressClickCardId(null), 0)
      }

      setDragState(null)
      setDraggingCardId(null)
      setDragOverSlot(null)
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("pointercancel", onPointerUp)
  }

  const openPreview = (card: CardItem, event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const targetW = 260
    const targetH = 380
    const targetLeft = (window.innerWidth - targetW) / 2
    const targetTop = (window.innerHeight - targetH) / 2

    setPreviewCardId(card.id)
    setPreviewRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
    setPreviewTransform({
      x: targetLeft - rect.left,
      y: targetTop - rect.top,
      sx: targetW / rect.width,
      sy: targetH / rect.height,
    })
    setPreviewOpen(false)
    window.requestAnimationFrame(() => setPreviewOpen(true))
  }

  const closePreview = () => {
    setPreviewOpen(false)
    window.setTimeout(() => {
      setPreviewCardId(null)
      setPreviewRect(null)
    }, 280)
  }

  const handleEndSpeech = () => {
    const speakerLabel = currentSpeaker ? `${currentSpeaker.roleLabel ?? ""} ${currentSpeaker.name}`.trim() : "발언자 미상"
    const argumentCard = equippedArgument?.title ?? "-"
    const thinkingCard = equippedAccidentType?.title ?? "-"
    const argumentKeyword = equippedArgument?.body ?? "-"
    const thinkingKeyword = equippedAccidentType?.body ?? "-"

    setSpeechHistory((prev) =>
      saveSpeech(
        prev,
        {
          phase: phaseLabel,
          speaker: speakerLabel,
          argumentCard,
          argumentKeyword,
          thinkingCard,
          thinkingKeyword,
        },
        recordLimitPerRound
      )
    )

    setIsRunning(false)
    setPanelOpen(isFreeMode)
    setEquipped({ argument: null, accidentType: null })
    closePreview()
    onEndSpeech?.()
  }

  return (
    <div className="relative overflow-visible rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 via-lime-50 to-amber-50 p-4">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background:radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.20),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(234,179,8,0.20),transparent_35%)]" />

      <div className="relative flex flex-col gap-4">
        <div className="rounded-2xl border border-slate-300 bg-white/90 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span />
            <span className="text-sm font-bold tabular-nums text-slate-700">세팅 {formatClock(durationSeconds)}</span>
          </div>

          {isRunning || isFreeMode ? (
            <Button
              size="lg"
              className={`w-full gap-2 text-white ${isFreeMode ? "bg-sky-600 hover:bg-sky-700" : "bg-rose-600 hover:bg-rose-700"}`}
              onClick={handleEndSpeech}
            >
              {isFreeMode ? <Save className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {isFreeMode ? "발언 저장" : "발언 종료"}
            </Button>
          ) : null}

          {!isFreeMode ? (
            <div
              className={`origin-top transition-all duration-500 ease-out ${
                isRunning
                  ? "pointer-events-none max-h-0 -translate-y-6 scale-90 overflow-hidden opacity-0"
                  : "mt-3 max-h-[360px] translate-y-0 scale-100 opacity-100"
              }`}
            >
              {debateFinished ? (
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
                  disabled={isRunning}
                >
                  <FileText className="h-7 w-7" />
                  토론 종료
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="h-[300px] w-full gap-3 rounded-2xl bg-emerald-600 text-xl font-bold text-white transition-all duration-500 hover:bg-emerald-700"
                  onClick={() => {
                    setIsRunning(true)
                    onStartSpeech?.()
                  }}
                  disabled={isRunning}
                >
                  <Play className="h-7 w-7" />
                  발언 시작
                </Button>
              )}
            </div>
          ) : null}
        </div>

        {isRunning || isFreeMode ? (
          <>
        <div className="flex flex-wrap justify-center gap-4">
          <div
            ref={argumentSlotRef}
            onClick={() => handleSlotTap("argument")}
            className={`relative flex h-[290px] w-[200px] items-center justify-center rounded-2xl border-2 p-3 transition ${
              activeSlot === "argument" ? "border-sky-500 bg-sky-100/70" : "border-slate-300 bg-white/75"
            } ${
              dragOverSlot === "argument"
                ? isArgumentDropInvalid
                  ? "border-red-500 ring-4 ring-red-300/60"
                  : "ring-4 ring-sky-300/60"
                : ""
            } ${snapSlot === "argument" ? "scale-[1.02]" : ""}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                handleSlotTap("argument")
              }
            }}
          >
            <p className="pointer-events-none absolute top-3 left-3 text-xs font-semibold text-sky-700">논거 슬롯</p>
	            {equippedArgument ? (
	              <button
                type="button"
                onPointerDown={(e) => handleCardPointerDown(e, equippedArgument, { kind: "slot", slot: "argument" })}
                onClick={(e) => {
                  e.stopPropagation()
                  if (suppressClickCardId === equippedArgument.id) return
                  unequipSlot("argument")
                  setPanelOpen(true)
                }}
	                className="relative h-[250px] w-[170px] rounded-xl border-2 border-sky-300 bg-gradient-to-b from-sky-50 to-cyan-100 p-3 text-left shadow-lg"
	              >
	                {equippedArgument.team && <p className="text-[11px] font-semibold text-sky-700">{equippedArgument.team}</p>}
	                <p className="mt-1 text-sm font-bold text-sky-950">{equippedArgument.title}</p>
	                <p className="mt-2 line-clamp-4 text-xs text-slate-700">{equippedArgument.body}</p>
	              </button>
            ) : (
              <p className="pointer-events-none text-xs text-slate-500">탭하거나 카드를 드롭해 배치</p>
            )}
          </div>
          <div
            ref={accidentSlotRef}
            onClick={() => handleSlotTap("accidentType")}
            className={`relative flex h-[290px] w-[200px] items-center justify-center rounded-2xl border-2 p-3 transition ${
              activeSlot === "accidentType" ? "border-violet-500 bg-violet-100/70" : "border-slate-300 bg-white/75"
            } ${
              dragOverSlot === "accidentType"
                ? isAccidentDropInvalid
                  ? "border-red-500 ring-4 ring-red-300/60"
                  : "ring-4 ring-violet-300/60"
                : ""
            } ${
              snapSlot === "accidentType" ? "scale-[1.02]" : ""
            }`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                handleSlotTap("accidentType")
              }
            }}
          >
            <p className="pointer-events-none absolute top-3 left-3 text-xs font-semibold text-violet-700">사고 유형 슬롯</p>
	            {equippedAccidentType ? (
	              <button
                type="button"
                onPointerDown={(e) => handleCardPointerDown(e, equippedAccidentType, { kind: "slot", slot: "accidentType" })}
                onClick={(e) => {
                  e.stopPropagation()
                  if (suppressClickCardId === equippedAccidentType.id) return
                  unequipSlot("accidentType")
                  setPanelOpen(true)
                }}
	                className="relative h-[250px] w-[170px] rounded-xl border-2 border-violet-300 bg-gradient-to-b from-violet-50 to-fuchsia-100 p-3 text-left shadow-lg"
	              >
	                <p className="mt-1 text-sm font-bold text-violet-950">{equippedAccidentType.title}</p>
	                <p className="mt-2 line-clamp-4 text-xs text-slate-700">{equippedAccidentType.body}</p>
	              </button>
            ) : (
              <p className="pointer-events-none text-xs text-slate-500">탭하거나 카드를 드롭해 배치</p>
            )}
          </div>
        </div>

        {previewCard && (
          <button
            type="button"
            onClick={closePreview}
            className="fixed inset-0 z-[70] bg-black/35 transition-opacity duration-300"
            aria-label="프리뷰 닫기"
          />
        )}

        {previewCard && previewRect && (
          <div className="pointer-events-none fixed inset-0 z-[80]">
	            <button
	              type="button"
	              onClick={closePreview}
	              className={`pointer-events-auto fixed rounded-xl border-2 p-4 text-left shadow-2xl ${getCardTone(previewCard.type).shell}`}
	              style={{
                left: previewRect.left,
                top: previewRect.top,
                width: previewRect.width,
                height: previewRect.height,
                transformOrigin: "top left",
                transform: previewOpen
                  ? `translate(${previewTransform.x}px, ${previewTransform.y}px) scale(${previewTransform.sx}, ${previewTransform.sy})`
                  : "translate(0px, 0px) scale(1, 1)",
                transition: "transform 340ms cubic-bezier(0.2, 0.8, 0.2, 1)",
              }}
            >
	              {previewCard.team && <p className={`text-xs font-semibold ${getCardTone(previewCard.type).team}`}>{previewCard.team}</p>}
	              <p className={`mt-1 text-lg font-bold ${getCardTone(previewCard.type).title}`}>{previewCard.title}</p>
	              <p className={`mt-2 text-sm leading-relaxed ${getCardTone(previewCard.type).body}`}>{previewCard.body}</p>
	            </button>
          </div>
        )}

        <div
          className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-6xl transition-transform duration-300 ${
            panelOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="pointer-events-none max-h-[45vh] overflow-auto px-4 pb-3">
            {activeSlot === "argument" ? (
              <div ref={argumentHandRef} className="pointer-events-none flex min-h-[280px] items-end justify-center px-2 pb-4 pt-8">
                {visibleArgumentHandCards.map((card, index) => (
                  <button
                    key={card.id}
                    type="button"
                    data-hand-card-id={card.id}
                    onPointerDown={(e) => handleCardPointerDown(e, card, { kind: "hand" })}
                    onClick={(e) => {
                      if (suppressClickCardId === card.id) return
                      openPreview(card, e)
                    }}
	                    className={`pointer-events-auto relative h-[250px] w-[170px] rounded-xl border-2 border-sky-300 bg-gradient-to-b from-sky-50 to-cyan-100 p-3 text-left shadow-lg transition duration-500 hover:-translate-y-2 hover:shadow-xl ${
	                      panelOpen ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
	                    }`}
                    style={{
                      marginLeft: index === 0 ? 0 : -18,
                      transform: `${panelOpen ? "translateY(118px)" : "translateY(220px)"}`,
                      transitionDelay: `${index * 80}ms`,
                      zIndex: index + 1,
                    }}
                  >
	                    {card.team && <p className="text-[11px] font-semibold text-sky-700">{card.team}</p>}
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
              <div ref={accidentHandRef} className="pointer-events-none flex min-h-[280px] items-end justify-center px-2 pb-4 pt-8">
                {visibleAccidentCards.map((card, index) => (
                  <button
                    key={card.id}
                    type="button"
                    data-hand-card-id={card.id}
                    onPointerDown={(e) => handleCardPointerDown(e, card, { kind: "hand" })}
                    onClick={(e) => {
                      if (suppressClickCardId === card.id) return
                      openPreview(card, e)
                    }}
	                    className={`pointer-events-auto relative h-[250px] w-[170px] rounded-xl border-2 border-violet-300 bg-gradient-to-b from-violet-50 to-fuchsia-100 p-3 text-left shadow-lg transition duration-500 hover:-translate-y-2 hover:shadow-xl ${
	                      panelOpen ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
	                    }`}
                    style={{
                      marginLeft: index === 0 ? 0 : -18,
                      transform: `${panelOpen ? "translateY(118px)" : "translateY(220px)"}`,
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

        {dragState && draggingCard && (
          <div className="pointer-events-none fixed inset-0 z-[90]">
	            <div
	              className={`fixed h-[250px] w-[170px] rounded-xl border-2 p-3 text-left shadow-2xl ${getCardTone(draggingCard.type).shell}`}
	              style={{
	                left: dragState.x,
	                top: dragState.y,
	              }}
	            >
	              {draggingCard.team && <p className={`text-[11px] font-semibold ${getCardTone(draggingCard.type).team}`}>{draggingCard.team}</p>}
	              <p className={`mt-1 text-sm font-bold ${getCardTone(draggingCard.type).title}`}>{draggingCard.title}</p>
	              <p className={`mt-2 line-clamp-4 text-xs ${getCardTone(draggingCard.type).body}`}>{draggingCard.body}</p>
	            </div>
          </div>
        )}

          </>
        ) : null}


      </div>
    </div>
  )
}

