export type SlotRole = "affirmative" | "negative" | "moderator"

export type GroupAssignment = {
  affirmative: (string | null)[]
  negative: (string | null)[]
  moderator: (string | null)[]
}

export type GroupSlotAdjust = {
  affirmative: number
  negative: number
  moderator: number
}

export type DraftPool = "unassigned" | "affirmative" | "negative" | "moderator"
export type RandomDraft = Record<DraftPool, string[]>
export type OrderedStageId = "opening" | "crossQuestion" | "rebuttal" | "surrebuttal" | "closing"
export type OrderedStageConfig = {
  id: OrderedStageId
  label: string
  enabled: boolean
  minutes: number
}
export type ArgumentSide = "affirmative" | "negative" | "neutral"
export type ArgumentCard = {
  id: string
  title: string
  claim: string
  evidenceHint?: string
  side: ArgumentSide
  enabled: boolean
}

export function buildSuggestedArgumentCards(topic: string): ArgumentCard[] {
  const targetTopic = topic.trim() || "해당 주제"
  const cardPresets: Array<{ title: string; claim: string; evidenceHint: string; side: ArgumentSide }> = [
    {
      title: "1) 뇌 발달/중독 메커니즘",
      claim: `${targetTopic}에서 청소년은 보상 자극에 취약하므로 사용 제한이 필요하다.`,
      evidenceHint: "도파민 보상회로, 자기통제 발달, 중독 관련 연구",
      side: "affirmative",
    },
    {
      title: "2) 학습권/집중력 저하",
      claim: `${targetTopic}은 수업과 자습 집중도를 떨어뜨려 학습권을 침해할 수 있다.`,
      evidenceHint: "알림 간섭, 멀티태스킹 저하, 과제 수행 시간 변화",
      side: "affirmative",
    },
    {
      title: "3) 수면권/건강권",
      claim: `${targetTopic}의 과사용은 수면과 건강에 악영향을 주므로 제한이 타당하다.`,
      evidenceHint: "야간 사용 시간, 수면 질, 피로도 및 정서 지표",
      side: "affirmative",
    },
    {
      title: "4) 사이버폭력/유해노출 예방",
      claim: `${targetTopic} 제한은 사이버폭력과 유해 콘텐츠 노출 위험을 줄이는 예방 장치가 된다.`,
      evidenceHint: "온라인 괴롭힘 통계, 유해 콘텐츠 접근성",
      side: "affirmative",
    },
    {
      title: "5) 자기결정권/자율성",
      claim: `${targetTopic}에 대한 과도한 규제는 청소년의 자기결정권과 자율성을 침해할 수 있다.`,
      evidenceHint: "권리 관점, 자율성 기반 교육, 책임 학습",
      side: "negative",
    },
    {
      title: "6) 실효성/우회 가능성",
      claim: `${targetTopic} 제한 정책은 우회 행동을 유발해 실효성이 낮을 수 있다.`,
      evidenceHint: "우회 앱/계정, 단속 비용, 정책 이행률",
      side: "negative",
    },
    {
      title: "7) 낙인/감시 부작용",
      claim: `${targetTopic} 통제는 학생과 보호자 간 신뢰 저하 및 낙인 효과를 낳을 수 있다.`,
      evidenceHint: "감시 정책 부작용, 관계 신뢰도",
      side: "negative",
    },
    {
      title: "8) 디지털 역량 저해",
      claim: `${targetTopic}의 과도한 제한은 디지털 리터러시·자기조절 역량 발달을 오히려 늦출 수 있다.`,
      evidenceHint: "디지털 시민성 교육, 역량 프레임워크",
      side: "negative",
    },
    {
      title: "9) 규제보다 미디어 교육",
      claim: `${targetTopic} 문제는 일괄 규제보다 미디어 리터러시 교육이 더 지속가능한 대안일 수 있다.`,
      evidenceHint: "자기조절 훈련, 가정-학교 공동지도",
      side: "neutral",
    },
    {
      title: "10) 단계적·조건부 제한",
      claim: `${targetTopic}은 전면 금지보다 시간·장소·연령에 따른 단계적 제한이 현실적이다.`,
      evidenceHint: "조건부 정책 설계, 점진적 시행 사례",
      side: "neutral",
    },
  ]

  return cardPresets.map((card, index) => ({
    id: `arg-${index + 1}`,
    title: card.title,
    claim: card.claim,
    evidenceHint: card.evidenceHint,
    side: card.side,
    enabled: true,
  }))
}

export function emptyAssignment(affirmativeSlots: number, negativeSlots: number, moderatorSlots: number): GroupAssignment {
  return {
    affirmative: Array.from({ length: affirmativeSlots }, () => null),
    negative: Array.from({ length: negativeSlots }, () => null),
    moderator: Array.from({ length: moderatorSlots }, () => null),
  }
}

export function shuffle<T>(list: T[]): T[] {
  return [...list].sort(() => Math.random() - 0.5)
}

