"use client"

import { use, useEffect, useMemo, useState } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import type { SessionType } from "@/lib/mock-data"
import { TypeBadge } from "@/components/status-badge"
import { ArrowLeft, User, CalendarDays, ChevronDown, ChevronRight, Star } from "lucide-react"
import { useMockSessions } from "@/hooks/use-mock-sessions"
import { listDebateEvents, listStudents } from "@/lib/application/roster-service"
import { DEADLINES } from "@/lib/deadlines"
import {
  buildEvidenceItems,
  buildReportInsight,
  extractKeywordsFromNote,
  getReportKindLabel,
  mapEvidenceToCompetency,
} from "@/lib/evidence-utils"
import {
  readFeaturedEvidenceMap,
  subscribeFeaturedEvidence,
  toggleFeaturedEvidence,
} from "@/lib/featured-evidence-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function getDaysLeft(date: string) {
  const target = new Date(`${date}T00:00:00`)
  const today = new Date()
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.ceil((target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))
}

function deadlineTone(daysLeft: number) {
  if (daysLeft <= 0) return "border-rose-300 bg-rose-100 text-rose-900"
  if (daysLeft <= 7) return "border-rose-200 bg-rose-50 text-rose-900"
  if (daysLeft <= 14) return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-border bg-white text-foreground"
}

function speechLabel(type: "Claim" | "Rebuttal" | "Question") {
  if (type === "Claim") return "주장"
  if (type === "Rebuttal") return "반박"
  return "질문"
}

function buildTemplateSentence(item: ReturnType<typeof buildEvidenceItems>[number]) {
  const sessionTitle = item.session?.title ?? "해당 수업"
  const noteText = normalizeNote(item.event.note, item.event.studentName) || "관찰 메모가 기록됨"
  return `"${sessionTitle}" 수업에서 ${speechLabel(item.event.speechType)} 발언을 통해 ${noteText}.`
}

function normalizeNote(note: string | undefined, studentName: string) {
  if (!note?.trim()) return ""
  const trimmed = note.trim()
  const escapedName = studentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return trimmed.replace(new RegExp(`^${escapedName}:\\s*`), "")
}

export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const allStudents = listStudents()
  const student = allStudents.find((item) => item.id === id)

  if (!student) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/teacher/students"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        학생 목록으로
      </Link>

      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{student.name}</h1>
          <p className="text-sm text-muted-foreground">{student.className}</p>
        </div>
      </div>

      <StudentEvidenceWorkspace studentId={student.id} />
    </div>
  )
}

function StudentEvidenceWorkspace({ studentId }: { studentId: string }) {
  const allStudents = listStudents()
  const debateEvents = listDebateEvents()
  const { sessions } = useMockSessions()
  const [featuredMap, setFeaturedMap] = useState<Record<string, string[]>>({})
  const [writingMode, setWritingMode] = useState(false)
  const [showAllFeatured, setShowAllFeatured] = useState(false)

  useEffect(() => {
    setFeaturedMap(readFeaturedEvidenceMap())
    return subscribeFeaturedEvidence(() => {
      setFeaturedMap(readFeaturedEvidenceMap())
    })
  }, [])

  const evidenceItems = useMemo(
    () =>
      buildEvidenceItems({
        events: debateEvents,
        sessions,
        students: allStudents,
      }).filter((item) => item.event.studentId === studentId),
    [debateEvents, sessions, allStudents, studentId]
  )

  const featuredIds = featuredMap[studentId] ?? []
  const featuredItems = evidenceItems.filter((item) => featuredIds.includes(item.event.id))
  const recentReportedItems = evidenceItems.slice(0, 5)

  const grouped = useMemo(() => {
    const buckets = {
      academic: [] as typeof evidenceItems,
      career: [] as typeof evidenceItems,
      community: [] as typeof evidenceItems,
      unclassified: [] as typeof evidenceItems,
    }

    for (const item of evidenceItems) {
      const key = mapEvidenceToCompetency(item.event.note ?? "", item.event.speechType)
      buckets[key].push(item)
    }

    return buckets
  }, [evidenceItems])

  const nearestDeadline = useMemo(() => {
    const withDays = DEADLINES.map((deadline) => ({
      ...deadline,
      daysLeft: getDaysLeft(deadline.date),
    }))
      .filter((deadline) => deadline.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft)

    return withDays[0] ?? null
  }, [])

  const reportSummary = useMemo(() => {
    const counts = {
      presentation: 0,
      "free-debate": 0,
      "ordered-debate": 0,
      unknown: 0,
    }

    for (const item of evidenceItems) {
      const kind = buildReportInsight(item).reportKind
      counts[kind] += 1
    }

    return counts
  }, [evidenceItems])

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">⭐ 대표 사례</h2>
          <Button variant="outline" onClick={() => setWritingMode((prev) => !prev)}>
            세특 작성 모드
          </Button>
        </div>

        {featuredItems.length > 0 ? (
          <div className="mt-4 grid gap-2">
            {(showAllFeatured ? featuredItems : featuredItems.slice(0, 3)).map((item) => (
              <EvidenceCard key={`featured-${item.id}`} item={item} featured onToggleFeatured={() => toggleFeaturedEvidence(studentId, item.event.id)} />
            ))}
            {featuredItems.length > 3 ? (
              <Button variant="ghost" className="w-fit" onClick={() => setShowAllFeatured((prev) => !prev)}>
                {showAllFeatured ? "접기" : `더보기 (${featuredItems.length - 3}개)`}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">대표 사례가 아직 지정되지 않았습니다.</p>
        )}

        {writingMode ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-amber-900">세특 작성 모드</p>
              {nearestDeadline ? (
                <Badge
                  variant="outline"
                  className={`font-semibold ${deadlineTone(nearestDeadline.daysLeft)}`}
                >
                  생기부 제출까지 {nearestDeadline.daysLeft}일
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-amber-800">자동 생성이 아닌 참고 초안입니다. 문장 표현은 직접 수정하세요.</p>

            {featuredItems.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-amber-900">선택된 근거</p>
                {featuredItems.slice(0, 3).map((item) => (
                  <div key={`draft-${item.id}`} className="rounded-md border border-amber-200 bg-white p-3 text-sm">
                    <p className="font-medium text-foreground">{item.session?.title ?? "세션 정보 없음"}</p>
                    <p className="mt-1 text-muted-foreground">
                      {normalizeNote(item.event.note, item.event.studentName) || "관찰 메모 없음"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      키워드: {extractKeywordsFromNote(normalizeNote(item.event.note, item.event.studentName)).slice(0, 4).join(", ") || "없음"}
                    </p>
                  </div>
                ))}

                <div className="rounded-md border border-amber-200 bg-white p-3">
                  <p className="text-xs font-medium text-foreground">참고 문장 예시</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {featuredItems.slice(0, 3).map((item) => (
                      <li key={`sentence-${item.id}`}>
                        {buildTemplateSentence(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-amber-900">대표 사례를 먼저 2~3개 지정해 주세요.</p>
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">역량별 근거 묶음</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-xs">
            발표 레포트 {reportSummary.presentation}건
          </Badge>
          <Badge variant="outline" className="text-xs">
            자유토론 레포트 {reportSummary["free-debate"]}건
          </Badge>
          <Badge variant="outline" className="text-xs">
            순서토론 레포트 {reportSummary["ordered-debate"]}건
          </Badge>
        </div>
        <div className="mt-4 grid gap-5">
          <CompetencySection
            title="📘 학업역량"
            items={grouped.academic}
            featuredIds={featuredIds}
            studentId={studentId}
          />
          <CompetencySection
            title="🧭 진로역량"
            items={grouped.career}
            featuredIds={featuredIds}
            studentId={studentId}
          />
          <CompetencySection
            title="🤝 공동체역량"
            items={grouped.community}
            featuredIds={featuredIds}
            studentId={studentId}
          />
          {grouped.unclassified.length > 0 ? (
            <CompetencySection
              title="기타"
              items={grouped.unclassified}
              featuredIds={featuredIds}
              studentId={studentId}
            />
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">최근 레포트 반영 근거</h2>
        {recentReportedItems.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {recentReportedItems.map((item) => {
              const insight = buildReportInsight(item)
              return (
                <div key={`recent-${item.id}`} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.event.timestamp.slice(0, 10)}</span>
                    <span>·</span>
                    <span>{getReportKindLabel(insight.reportKind)}</span>
                    <span>·</span>
                    <span>{speechLabel(item.event.speechType)}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{item.event.note?.trim() || "관찰 메모 없음"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    논거 {insight.argumentCard} · 사고 {insight.thinkingCard}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">레포트에 반영된 근거가 아직 없습니다.</p>
        )}
      </section>

      <RawSessionHistory studentId={studentId} />
    </div>
  )
}

function CompetencySection({
  title,
  items,
  featuredIds,
  studentId,
}: {
  title: string
  items: ReturnType<typeof buildEvidenceItems>
  featuredIds: string[]
  studentId: string
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {items.length > 0 ? (
        <div className="mt-2 grid gap-2">
          {items.map((item) => (
            <EvidenceCard
              key={item.id}
              item={item}
              featured={featuredIds.includes(item.event.id)}
              onToggleFeatured={() => toggleFeaturedEvidence(studentId, item.event.id)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">해당 역량의 근거가 아직 없습니다.</p>
      )}
    </div>
  )
}

function EvidenceCard({
  item,
  featured,
  onToggleFeatured,
}: {
  item: ReturnType<typeof buildEvidenceItems>[number]
  featured: boolean
  onToggleFeatured: () => void
}) {
  const keywords = extractKeywordsFromNote(item.event.note ?? "")
  const insight = buildReportInsight(item)

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{item.session?.title ?? "세션 정보 없음"}</span>
          <span>·</span>
          <span>Round {item.event.round}</span>
          <span>·</span>
          <span>{item.event.team}</span>
          <span>·</span>
          <span>{speechLabel(item.event.speechType)}</span>
        </div>
        <button
          type="button"
          onClick={onToggleFeatured}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
            featured ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"
          }`}
        >
          <Star className="h-3.5 w-3.5" />
          {featured ? "대표 사례 지정됨" : "대표 사례로 지정"}
        </button>
      </div>

      <p className="mt-2 text-sm text-foreground">{item.event.note?.trim() || "관찰 메모가 없는 기록입니다."}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
          {insight.reportLabel}
        </Badge>
        {item.session?.topic ? <span>주제 {item.session.topic}</span> : null}
        {item.session?.topic ? <span>·</span> : null}
        <span>논거 {insight.argumentCard}</span>
        <span>·</span>
        <span>사고 {insight.thinkingCard}</span>
      </div>

      {(keywords.length > 0 || insight.keywords.length > 0) ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(keywords.length > 0 ? keywords : insight.keywords).slice(0, 5).map((keyword) => (
            <Badge key={`${item.id}-${keyword}`} variant="outline">
              {keyword}
            </Badge>
          ))}
        </div>
      ) : null}

      <p className="mt-2 text-[11px] text-muted-foreground">수업 중 Quick Add 기록에서 생성됨</p>
    </div>
  )
}

function RawSessionHistory({ studentId }: { studentId: string }) {
  const allStudents = listStudents()
  const debateEvents = listDebateEvents()
  const { sessions } = useMockSessions()
  const [typeFilter, setTypeFilter] = useState<SessionType | "all">("all")
  const [openSessions, setOpenSessions] = useState<Set<string>>(new Set())

  const studentSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (typeFilter !== "all" && session.type !== typeFilter) return false
      if (session.teams) {
        return (
          session.teams.team1.some((teamMember) => teamMember.id === studentId) ||
          session.teams.team2.some((teamMember) => teamMember.id === studentId)
        )
      }
      return allStudents.find((student) => student.id === studentId)?.classId === session.classId
    })
  }, [studentId, typeFilter, sessions, allStudents])

  const toggleSession = (sessionId: string) => {
    setOpenSessions((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">전체 기록 보기</h2>

      <div className="mt-3 flex items-center gap-2">
        {(["all", "Debate", "Presentation"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              typeFilter === type
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {type === "all" ? "전체" : type}
          </button>
        ))}
      </div>

      {studentSessions.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2">
          {studentSessions.map((session) => {
            const isOpen = openSessions.has(session.id)
            const events = debateEvents.filter(
              (event) => event.sessionId === session.id && event.studentId === studentId
            )

            return (
              <div key={session.id} className="overflow-hidden rounded-lg border border-border bg-card">
                <button
                  onClick={() => toggleSession(session.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/50"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-card-foreground">{session.title}</span>
                      <TypeBadge type={session.type} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(session.date).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {isOpen ? (
                  <div className="border-t border-border px-4 py-3">
                    {events.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {events.map((event) => (
                          <div key={event.id} className="flex items-start gap-3 rounded-md bg-muted/50 px-3 py-2">
                            <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {speechLabel(event.speechType)}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm text-card-foreground">
                                {event.note || "기록된 메모가 없습니다."}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Round {event.round} - {event.team}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">이 세션에는 학생 기록 이벤트가 없습니다.</p>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-border py-10 text-center">
          <p className="text-sm text-muted-foreground">학생 세션 기록이 없습니다.</p>
        </div>
      )}
    </section>
  )
}

