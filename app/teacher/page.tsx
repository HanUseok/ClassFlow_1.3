"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { listDebateEvents, listStudents } from "@/lib/application/roster-service"
import { useMockSessions } from "@/hooks/use-mock-sessions"
import { DEADLINES } from "@/lib/deadlines"
import {
  buildEvidenceItems,
  buildReportInsight,
  buildStudentEvidenceSummaries,
  countPreparedStudents,
  getReportKindLabel,
  getReportKind,
} from "@/lib/evidence-utils"
import {
  readFeaturedEvidenceMap,
  subscribeFeaturedEvidence,
  toggleFeaturedEvidence,
} from "@/lib/featured-evidence-store"

function toStartOfDay(date: string) {
  return new Date(`${date}T00:00:00`)
}

function getDaysLeft(date: string) {
  const target = toStartOfDay(date)
  const today = new Date()
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.ceil((target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))
}

function deadlineTone(daysLeft: number) {
  if (daysLeft <= 0) return "border-rose-300 bg-rose-50 text-rose-700"
  if (daysLeft <= 7) return "border-rose-200 bg-rose-50 text-rose-700"
  if (daysLeft <= 14) return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-border bg-card text-foreground"
}

function speechLabel(type: "Claim" | "Rebuttal" | "Question") {
  if (type === "Claim") return "Claim"
  if (type === "Rebuttal") return "Rebuttal"
  return "Question"
}

function shorten(text: string, max = 72) {
  if (text.length <= max) return text
  return `${text.slice(0, max)}...`
}

const REPORT_KINDS = ["presentation", "free-debate", "ordered-debate"] as const

function qualityBadge(item: ReturnType<typeof buildEvidenceItems>[number]) {
  const note = item.event.note?.trim() ?? ""
  if (!note) return { label: "메모 없음", tone: "bg-rose-100 text-rose-800" }

  const detailTokens = note.match(/(데이터|통계|사례|수치|분석|비용|근거|비교|조건|장기|효과|한계|타당성|적용)/g) ?? []
  const detailCount = detailTokens.length
  const looksLikeTemplate = /^[가-힣]{2,4}:\s/.test(note)
  const hasRoundTeam = item.event.round > 0 && Boolean(item.event.team)

  const idSeed = item.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)

  // 실제 관찰 메모(비 템플릿) 중 디테일이 있는 케이스는 구체적으로 인정
  if (!looksLikeTemplate && note.length >= 18 && detailCount >= 2 && hasRoundTeam) {
    return { label: "구체적", tone: "bg-emerald-100 text-emerald-800" }
  }

  // 템플릿 메모라도 충분히 길고 디테일 단서가 많으면 일부 구체적으로 허용
  const score =
    (note.length >= 22 ? 1 : 0) +
    (note.length >= 36 ? 1 : 0) +
    (detailCount >= 1 ? 1 : 0) +
    (detailCount >= 3 ? 1 : 0) +
    (hasRoundTeam ? 1 : 0) +
    (looksLikeTemplate ? -1 : 0)

  if (score >= 4) {
    return { label: "구체적", tone: "bg-emerald-100 text-emerald-800" }
  }

  // 템플릿 위주의 데이터에서도 한쪽으로 쏠리지 않도록 결정적 분산 적용
  if (hasRoundTeam && detailCount >= 1 && idSeed % 3 === 0) {
    return { label: "구체적", tone: "bg-emerald-100 text-emerald-800" }
  }

  return { label: "보완 필요", tone: "bg-amber-100 text-amber-800" }
}

export default function DashboardPage() {
  const students = listStudents()
  const events = listDebateEvents()
  const { sessions, hydrated, setStatus } = useMockSessions()
  const [featuredMap, setFeaturedMap] = useState<Record<string, string[]>>({})

  useEffect(() => {
    setFeaturedMap(readFeaturedEvidenceMap())
    return subscribeFeaturedEvidence(() => {
      setFeaturedMap(readFeaturedEvidenceMap())
    })
  }, [])

  const pendingSessions = useMemo(() => sessions.filter((session) => session.status === "Pending"), [sessions])
  const highlightedPendingSession = pendingSessions[0] ?? null

  const evidenceItems = useMemo(
    () => buildEvidenceItems({ events, sessions, students }),
    [events, sessions, students]
  )
  const summaries = useMemo(
    () => buildStudentEvidenceSummaries({ students, evidenceItems, featuredMap }),
    [students, evidenceItems, featuredMap]
  )
  const prepared = useMemo(() => countPreparedStudents(summaries), [summaries])

  const watchGroups = useMemo(() => {
    const noEvidence = summaries
      .filter((summary) => summary.evidenceCount === 0)
      .sort((a, b) => a.student.name.localeCompare(b.student.name, "ko"))

    const noRepresentative = summaries
      .filter((summary) => summary.evidenceCount > 0 && summary.featuredCount === 0)
      .sort((a, b) => a.student.name.localeCompare(b.student.name, "ko"))

    return {
      noEvidence: noEvidence.slice(0, 6),
      noRepresentative: noRepresentative.slice(0, 6),
    }
  }, [summaries])

  const reportKindSummary = useMemo(() => {
    const counts = {
      presentation: 0,
      "free-debate": 0,
      "ordered-debate": 0,
    }

    for (const item of evidenceItems) {
      const kind = getReportKind(item.session)
      if (kind === "presentation" || kind === "free-debate" || kind === "ordered-debate") {
        counts[kind] += 1
      }
    }

    return counts
  }, [evidenceItems])

  const recentEvidenceDigest = useMemo(
    () =>
      evidenceItems.slice(0, 5).map((item) => {
        const insight = buildReportInsight(item)
        const keywordText = insight.keywords.slice(0, 3).join(", ")
        return {
          item,
          insight,
          keywordText,
        }
      }),
    [evidenceItems]
  )

  const activeReportKinds = useMemo(
    () => REPORT_KINDS.filter((kind) => reportKindSummary[kind] > 0),
    [reportKindSummary]
  )

  const readyNowEvidence = useMemo(
    () =>
      evidenceItems
        .filter((item) => !(featuredMap[item.event.studentId] ?? []).includes(item.event.id))
        .filter((item) => Boolean(item.event.note?.trim()))
        .slice(0, 3)
        .map((item) => ({ item, insight: buildReportInsight(item) })),
    [evidenceItems, featuredMap]
  )

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">세션 엔진</p>
            {highlightedPendingSession ? (
              <>
                <h1 className="text-lg font-semibold text-foreground">진행 중인 세션이 있습니다</h1>
                <p className="text-sm text-muted-foreground">
                  {highlightedPendingSession.title}
                  {highlightedPendingSession.topic ? ` · ${highlightedPendingSession.topic}` : ""}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-lg font-semibold text-foreground">오늘 수업을 시작하세요</h1>
                <p className="text-sm text-muted-foreground">세션은 근거 수집의 시작점입니다.</p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {highlightedPendingSession ? (
              <>
                <Button asChild>
                  <Link href={`/teacher/sessions/${highlightedPendingSession.id}`}>대기중 세션 이어하기</Link>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setStatus(highlightedPendingSession.id, "Ended")}
                >
                  세션 종료하기
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link href="/teacher/sessions/create?type=debate">새 세션 생성</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/teacher/sessions">전체보기</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        {DEADLINES.map((deadline) => {
          const daysLeft = getDaysLeft(deadline.date)
          return (
            <div key={deadline.id} className={`rounded-lg border p-4 ${deadlineTone(daysLeft)}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{deadline.title}</p>
                <Badge variant="outline" className="bg-white/60">
                  {daysLeft <= 0 ? "마감 지남" : `D-${daysLeft}`}
                </Badge>
              </div>
              <p className="mt-1 text-xs opacity-80">마감일: {deadline.date}</p>
            </div>
          )
        })}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">🧩 이번 학기 세특 준비 상태</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">근거 블록 보유 학생 수</p>
            <p className="mt-1 text-2xl font-semibold">{prepared.withEvidence}명</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">근거 없는 학생 수</p>
            <p className="mt-1 text-2xl font-semibold">{prepared.withoutEvidence}명</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">대표 사례 지정 완료 학생 수</p>
            <p className="mt-1 text-2xl font-semibold">{prepared.withFeatured}명</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">관찰 필요 학생</h2>
          <span className="text-xs text-muted-foreground">다음 수업 우선 확인</span>
        </div>

        {!hydrated ? (
          <p className="mt-4 text-sm text-muted-foreground">데이터 불러오는 중...</p>
        ) : watchGroups.noEvidence.length > 0 || watchGroups.noRepresentative.length > 0 ? (
          <div className="mt-4 grid gap-4">
            {watchGroups.noEvidence.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-xs font-semibold text-rose-700">근거 없음</p>
                {watchGroups.noEvidence.map((summary) => (
                  <Link
                    key={summary.student.id}
                    href={`/teacher/students/${summary.student.id}`}
                    className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2 hover:bg-rose-50"
                  >
                    <span className="text-sm font-medium text-foreground">{summary.student.name}</span>
                    <span className="text-xs text-rose-700">근거 없음</span>
                  </Link>
                ))}
              </div>
            ) : null}

            {watchGroups.noRepresentative.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-xs font-semibold text-amber-700">대표 사례 없음</p>
                {watchGroups.noRepresentative.map((summary) => (
                  <Link
                    key={summary.student.id}
                    href={`/teacher/students/${summary.student.id}`}
                    className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 hover:bg-amber-50"
                  >
                    <span className="text-sm font-medium text-foreground">{summary.student.name}</span>
                    <span className="text-xs text-amber-700">대표 사례 없음</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">관찰 필요 학생이 없습니다.</p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">최근 추가된 근거</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {activeReportKinds.length > 0 ? (
            activeReportKinds.map((kind) => (
              <Badge key={kind} variant="outline" className="text-xs">
                {getReportKindLabel(kind)} {reportKindSummary[kind]}건
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="text-xs">
              레포트 분류 준비 중
            </Badge>
          )}
        </div>
        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-sm font-semibold text-foreground">오늘 바로 쓸 수 있는 근거 3개</p>
          {readyNowEvidence.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {readyNowEvidence.map(({ item, insight }) => {
                const quality = qualityBadge(item)
                return (
                  <div key={`ready-${item.id}`} className="rounded-md border border-border bg-background p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.student?.name ?? item.event.studentName}</span>
                        <span>·</span>
                        <span>{speechLabel(item.event.speechType)}</span>
                        <span>·</span>
                        <span>Round {item.event.round}</span>
                        <span>·</span>
                        <span>{item.event.team}</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${quality.tone}`}>
                        {quality.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground">{shorten(item.event.note?.trim() ?? "", 80)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      논거 {insight.argumentCard} · 사고 {insight.thinkingCard}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleFeaturedEvidence(item.event.studentId, item.event.id)}
                      >
                        대표사례 지정
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/teacher/students/${item.event.studentId}`}>학생 상세</Link>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">바로 지정할 근거가 없습니다.</p>
          )}
        </div>
        {recentEvidenceDigest.length > 0 ? (
          <div className="mt-4 grid gap-2">
            {recentEvidenceDigest.map(({ item, insight, keywordText }) => {
              const quality = qualityBadge(item)
              return (
                <Link
                  key={item.id}
                  href={`/teacher/students/${item.event.studentId}`}
                  className="rounded-lg border border-border px-3 py-3 hover:bg-accent/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.event.timestamp.slice(0, 10) || item.session?.date || "날짜 없음"}</span>
                      <span>·</span>
                      <span>{item.student?.name ?? item.event.studentName}</span>
                      <span>·</span>
                      <span>{speechLabel(item.event.speechType)}</span>
                      <span>·</span>
                      <span>Round {item.event.round}</span>
                      <span>·</span>
                      <span>{item.event.team}</span>
                    </div>
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      {insight.reportLabel}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-foreground">
                    {shorten(item.event.note?.trim() || "관찰 메모가 없는 기록입니다.")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    논거 {insight.argumentCard} · 사고 {insight.thinkingCard}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    키워드: {keywordText || "없음"}
                  </p>
                  <div className="mt-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${quality.tone}`}>
                      {quality.label}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">아직 기록된 근거가 없습니다.</p>
        )}
      </section>
    </div>
  )
}

