import type { DebateEvent, Session, Student } from "@/lib/mock-data"
import type { FeaturedEvidenceMap } from "@/lib/featured-evidence-store"

export type EvidenceItem = {
  id: string
  event: DebateEvent
  session: Session | null
  student: Student | null
  sortKey: number
}

export type StudentEvidenceSummary = {
  student: Student
  evidenceCount: number
  featuredCount: number
}

export function buildEvidenceItems(input: {
  events: DebateEvent[]
  sessions: Session[]
  students: Student[]
}): EvidenceItem[] {
  const sessionMap = new Map(input.sessions.map((session) => [session.id, session]))
  const studentMap = new Map(input.students.map((student) => [student.id, student]))

  return input.events
    .map((event, index) => {
      const session = sessionMap.get(event.sessionId) ?? null
      const student = studentMap.get(event.studentId) ?? null
      const timestamp = Number.isFinite(Date.parse(event.timestamp))
        ? Date.parse(event.timestamp)
        : Number.isFinite(Date.parse(session?.date ?? ""))
          ? Date.parse(`${session?.date}T00:00:00`)
          : index

      return {
        id: event.id,
        event,
        session,
        student,
        sortKey: timestamp,
      }
    })
    .sort((a, b) => b.sortKey - a.sortKey)
}

export function buildStudentEvidenceSummaries(input: {
  students: Student[]
  evidenceItems: EvidenceItem[]
  featuredMap: FeaturedEvidenceMap
}): StudentEvidenceSummary[] {
  const eventCountByStudent = new Map<string, number>()

  for (const item of input.evidenceItems) {
    const studentId = item.event.studentId
    eventCountByStudent.set(studentId, (eventCountByStudent.get(studentId) ?? 0) + 1)
  }

  return input.students.map((student) => {
    const evidenceCount = eventCountByStudent.get(student.id) ?? 0
    const featuredCount = (input.featuredMap[student.id] ?? []).length

    return {
      student,
      evidenceCount,
      featuredCount,
    }
  })
}

export function countPreparedStudents(summaries: StudentEvidenceSummary[]) {
  const withEvidence = summaries.filter((summary) => summary.evidenceCount > 0).length
  const withoutEvidence = summaries.filter((summary) => summary.evidenceCount === 0).length
  const withFeatured = summaries.filter((summary) => summary.featuredCount > 0).length

  return {
    withEvidence,
    withoutEvidence,
    withFeatured,
  }
}

export function priorityScore(summary: StudentEvidenceSummary) {
  if (summary.evidenceCount === 0) return 0
  if (summary.evidenceCount <= 1) return 1
  if (summary.featuredCount === 0) return 2
  return 3
}

export function getWatchReason(summary: StudentEvidenceSummary) {
  if (summary.evidenceCount === 0) return "근거 없음"
  if (summary.featuredCount === 0) return "대표 사례 없음"
  if (summary.evidenceCount <= 1) return "근거 수가 1개 이하"
  return "추가 관찰 필요"
}

const STOPWORDS = new Set([
  "그리고",
  "하지만",
  "그러나",
  "대한",
  "에서",
  "으로",
  "하고",
  "하는",
  "있다",
  "없다",
  "학생",
  "발언",
])

export function extractKeywordsFromNote(note: string, limit = 4) {
  if (!note.trim()) return []
  const tokens = note
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token))

  return Array.from(new Set(tokens)).slice(0, limit)
}

export type CompetencyKey = "academic" | "career" | "community" | "unclassified"

export function mapEvidenceToCompetency(note: string, speechType: DebateEvent["speechType"]): CompetencyKey {
  const lowered = note.toLowerCase()

  if (/(협력|협업|팀|조별|경청|배려|동료|합의|토의|역할\s*분담)/.test(lowered)) return "community"
  if (/(진로|전공|직업|미래|계열|탐색|선택)/.test(lowered)) return "career"
  if (speechType === "Question") return "career"
  if (speechType === "Claim" || speechType === "Rebuttal") return "academic"
  return "unclassified"
}

export type ReportKind = "presentation" | "free-debate" | "ordered-debate" | "unknown"

type ReportFallback = {
  argumentCard: string
  thinkingCard: string
  keywordSeed: string
}

const CLAIM_FALLBACK: ReportFallback = {
  argumentCard: "1) 뇌 발달/중독 메커니즘",
  thinkingCard: "적용",
  keywordSeed: "뇌 발달 중독 보상회로 적용 사례 연결",
}

const REBUTTAL_FALLBACK: ReportFallback = {
  argumentCard: "5) 실효성/우회 가능성",
  thinkingCard: "반례 제시",
  keywordSeed: "실효성 우회 가능성 반례 검증",
}

const QUESTION_FALLBACK: ReportFallback = {
  argumentCard: "2) 학습권/집중력 저하",
  thinkingCard: "전제 분석",
  keywordSeed: "학습권 집중력 전제 분석",
}

export function getReportKind(session: Session | null): ReportKind {
  // 이벤트만 남고 세션 참조가 유실된 경우, MVP에서는 토론 근거로 간주합니다.
  if (!session) return "ordered-debate"
  if (session.type === "Presentation") return "presentation"
  if (session.type === "Debate") {
    return (session.debate?.mode ?? "Ordered") === "Free" ? "free-debate" : "ordered-debate"
  }
  return "unknown"
}

export function getReportKindLabel(kind: ReportKind) {
  if (kind === "presentation") return "발표 레포트"
  if (kind === "free-debate") return "자유토론 레포트"
  if (kind === "ordered-debate") return "순서토론 레포트"
  return "레포트 미분류"
}

export type ReportInsight = {
  reportKind: ReportKind
  reportLabel: string
  argumentCard: string
  thinkingCard: string
  keywords: string[]
}

function fallbackForSpeechType(speechType: DebateEvent["speechType"]) {
  if (speechType === "Claim") return CLAIM_FALLBACK
  if (speechType === "Rebuttal") return REBUTTAL_FALLBACK
  return QUESTION_FALLBACK
}

export function buildReportInsight(item: EvidenceItem): ReportInsight {
  const reportKind = getReportKind(item.session)
  const fallback = fallbackForSpeechType(item.event.speechType)
  const noteKeywords = extractKeywordsFromNote(item.event.note ?? "", 5)
  const fallbackKeywords = extractKeywordsFromNote(fallback.keywordSeed, 5)

  return {
    reportKind,
    reportLabel: getReportKindLabel(reportKind),
    argumentCard: fallback.argumentCard,
    thinkingCard: fallback.thinkingCard,
    keywords: noteKeywords.length > 0 ? noteKeywords : fallbackKeywords,
  }
}


