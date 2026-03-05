import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge, TypeBadge } from "@/components/status-badge"
import { ReportManageView } from "@/components/station/report-manage-view"

type ReportLogItem = {
  phase: string
  speaker: string
  argumentCard: string
  argumentKeyword: string
  thinkingCard: string
  thinkingKeyword: string
}

type OrderedPhaseKey = "입론" | "반론" | "재반론" | "마무리"
type SessionStatus = "Pending" | "Live" | "Ended"

const ORDERED_PHASES: OrderedPhaseKey[] = ["입론", "반론", "재반론", "마무리"]
const FREE_MODE_COLUMNS = 4
const FREE_MODE_FALLBACKS: Array<{
  argumentCard: string
  thinkingCard: string
  argumentKeyword: string
  thinkingKeyword: string
}> = [
  {
    argumentCard: "1) 뇌 발달/중독 메커니즘",
    thinkingCard: "적용",
    argumentKeyword: "뇌 발달, 중독, 보상회로",
    thinkingKeyword: "적용, 사례 연결",
  },
  {
    argumentCard: "2) 학습권/집중력 저하",
    thinkingCard: "인과 설명",
    argumentKeyword: "학습권, 집중력, 알림 간섭",
    thinkingKeyword: "인과, 원인과 결과",
  },
  {
    argumentCard: "3) 수면권/건강권",
    thinkingCard: "비교",
    argumentKeyword: "수면권, 건강권, 피로도",
    thinkingKeyword: "비교, 대안 대비",
  },
  {
    argumentCard: "9) 규제보다 미디어 교육",
    thinkingCard: "입장 수정",
    argumentKeyword: "미디어 교육, 자기조절, 장기효과",
    thinkingKeyword: "입장 수정, 조건부 합의",
  },
]

const ORDERED_FALLBACK: Record<OrderedPhaseKey, { argumentCard: string; thinkingCard: string }> = {
  입론: { argumentCard: "1) 뇌 발달/중독 메커니즘", thinkingCard: "적용" },
  반론: { argumentCard: "5) 실효성/우회 가능성", thinkingCard: "반례 제시" },
  재반론: { argumentCard: "2) 학습권/집중력 저하", thinkingCard: "전제 분석" },
  마무리: { argumentCard: "9) 규제보다 미디어 교육", thinkingCard: "입장 수정" },
}

const STOPWORDS = new Set([
  "그리고",
  "하지만",
  "그러나",
  "때문",
  "대한",
  "위한",
  "에서",
  "사용",
  "문제",
  "설명",
  "분석",
  "제시",
  "최소한",
  "자유토론",
  "쟁점",
  "근거를",
  "중심으로",
  "맥락에서",
  "확장",
])

function uniq(items: string[]) {
  return Array.from(new Set(items.filter((v) => v && v !== "-")))
}

function extractKeywords(text: string, limit = 4) {
  if (!text || text === "-") return []
  const tokens = text
    .replace(/[^\p{L}\p{N}\s,]/gu, " ")
    .split(/[\s,]+/)
    .map((v) => v.trim())
    .filter((v) => v.length >= 2 && !STOPWORDS.has(v))
  return uniq(tokens).slice(0, limit)
}

function normalizeOrderedPhase(raw: string): OrderedPhaseKey | null {
  if (raw === "입론" || raw === "반론" || raw === "재반론" || raw === "마무리") return raw
  if (raw === "Opening") return "입론"
  if (raw === "Rebuttal") return "반론"
  if (raw === "Rerebuttal") return "재반론"
  if (raw === "FinalSummary" || raw === "Closing") return "마무리"
  return null
}

function SessionTopHeader({
  sessionId,
  sessionTitle,
  sessionStatus,
  activeView,
  reportHref,
  manageHref,
}: {
  sessionId: string
  sessionTitle: string
  sessionStatus: SessionStatus
  activeView: "report" | "manage"
  reportHref: string
  manageHref: string
}) {
  if (!sessionId) return null
  const primaryLabel = sessionStatus === "Ended" ? "레포트" : "진행 화면"

  return (
    <div className="mb-6 flex flex-col gap-4">
      <Link href="/teacher/sessions" className="w-fit text-sm text-muted-foreground transition-colors hover:text-foreground">
        <span className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          세션 목록으로 돌아가기
        </span>
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-foreground">{sessionTitle || "토론 세션"}</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border p-1">
            {activeView === "report" ? (
              <Button size="sm" variant="default" className="pointer-events-none">
                {primaryLabel}
              </Button>
            ) : (
              <Button asChild size="sm" variant="ghost">
                <Link href={reportHref}>{primaryLabel}</Link>
              </Button>
            )}
            {activeView === "manage" ? (
              <Button size="sm" variant="default" className="pointer-events-none">
                관리 화면
              </Button>
            ) : (
              <Button asChild size="sm" variant="ghost">
                <Link href={manageHref}>관리 화면</Link>
              </Button>
            )}
          </div>
          <TypeBadge type="Debate" />
          <StatusBadge status={sessionStatus} />
        </div>
      </div>
    </div>
  )
}

export default async function StationReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    round?: string
    phase?: string
    logs?: string
    names?: string
    sessionId?: string
    teacherGuided?: string
    sessionTitle?: string
    sessionStatus?: SessionStatus
    groupCount?: string
    groupLayout?: string
    view?: "report" | "manage"
    source?: string
  }>
}) {
  const params = await searchParams
  const round = params.round ?? "1"
  const phase = params.phase ?? "마무리"
  const logsRaw = params.logs ?? ""
  const namesRaw = params.names ?? ""
  const sessionId = params.sessionId ?? ""
  const teacherGuided = params.teacherGuided === "1"
  const sessionTitle = params.sessionTitle ?? "토론 세션"
  const sessionStatus = (params.sessionStatus ?? "Ended") as SessionStatus
  const groupCount = Number.parseInt(params.groupCount ?? "", 10)
  const desiredGroupCount = Number.isFinite(groupCount) && groupCount > 0 ? groupCount : undefined
  const groupLayoutRaw = params.groupLayout ?? ""
  let presetGroups: Array<{ affirmative?: string[]; negative?: string[] }> | undefined
  try {
    const parsed = JSON.parse(groupLayoutRaw) as Array<{ affirmative?: string[]; negative?: string[] }>
    if (Array.isArray(parsed)) presetGroups = parsed
  } catch {
    presetGroups = undefined
  }
  const isStationSource = params.source === "station"
  const activeView = isStationSource ? "report" : params.view === "manage" ? "manage" : "report"
  const baseReportHref = `/station/report?round=${encodeURIComponent(round)}&phase=${encodeURIComponent(
    phase
  )}&logs=${encodeURIComponent(logsRaw)}&names=${encodeURIComponent(namesRaw)}&sessionId=${encodeURIComponent(
    sessionId
  )}&teacherGuided=${teacherGuided ? "1" : "0"}&sessionTitle=${encodeURIComponent(
    sessionTitle
  )}&sessionStatus=${encodeURIComponent(sessionStatus)}${desiredGroupCount ? `&groupCount=${desiredGroupCount}` : ""}${
    groupLayoutRaw ? `&groupLayout=${encodeURIComponent(groupLayoutRaw)}` : ""
  }`
  const reportHref = `${baseReportHref}&view=report`
  const manageHref = `${baseReportHref}&view=manage`

  let logs: ReportLogItem[] = []
  try {
    logs = JSON.parse(logsRaw) as ReportLogItem[]
  } catch {
    logs = []
  }

  const speakerNames = namesRaw
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean)

  const isFreeMode =
    phase === "자유토론" ||
    logs.some((log) => log.phase === "자유토론") ||
    (logs.length > 0 && logs.every((log) => normalizeOrderedPhase(log.phase) === null))

  if (isFreeMode) {
    const speakerMap = new Map<string, ReportLogItem[]>()
    logs.forEach((log) => {
      const speaker = log.speaker || "발언자 미상"
      const prev = speakerMap.get(speaker) ?? []
      speakerMap.set(speaker, [...prev, log])
    })

    const speakers = speakerMap.size > 0 ? Array.from(speakerMap.keys()) : speakerNames

    return (
      <div className="mx-auto w-full max-w-7xl p-6">
        {!isStationSource ? (
          <SessionTopHeader
            sessionId={sessionId}
            sessionTitle={sessionTitle}
            sessionStatus={sessionStatus}
            activeView={activeView}
            reportHref={reportHref}
            manageHref={manageHref}
          />
        ) : null}

	        <div className="mb-4 flex items-start justify-between gap-3">
	          {activeView === "report" ? (
	            <>
	              <div>
	                <p className="text-xs font-semibold tracking-wide text-muted-foreground">토론 레포트</p>
	                <h1 className="text-2xl font-bold text-foreground">자유토론 키워드 매핑 결과</h1>
	                <p className="mt-1 text-sm text-muted-foreground">라운드 {round} · 단계 {phase}</p>
	              </div>
	              {isStationSource ? (
	                <Button asChild size="sm" variant="outline">
	                  <Link href="/station">스테이션 처음 화면으로</Link>
	                </Button>
	              ) : !sessionId ? (
	                <Button asChild size="sm" variant="outline">
	                  <Link href="/station">Station으로 돌아가기</Link>
	                </Button>
	              ) : null}
	            </>
          ) : null}
        </div>

        {activeView === "manage" ? (
          <ReportManageView
            phaseLabel="자유토론"
            speakers={speakers.length > 0 ? speakers : speakerNames}
            desiredGroupCount={desiredGroupCount}
            presetGroups={presetGroups}
          />
        ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[1800px] text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">발표자</th>
                {Array.from({ length: FREE_MODE_COLUMNS }, (_, idx) => (
                  <th key={`free-map-${idx}`} className="px-3 py-2 text-left font-medium text-muted-foreground">
                    매핑 {idx + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {speakers.length > 0 ? (
                speakers.map((speaker, idx) => {
                  const rows = speakerMap.get(speaker) ?? []
                  const visibleRows = rows.slice(0, FREE_MODE_COLUMNS)
                  const completedRows = Array.from({ length: FREE_MODE_COLUMNS }, (_, cellIdx) => {
                    const fromLog = visibleRows[cellIdx]
                    if (fromLog) return fromLog
                    const fallback = FREE_MODE_FALLBACKS[(idx + cellIdx) % FREE_MODE_FALLBACKS.length]
                    return {
                      phase: "자유토론",
                      speaker,
                      argumentCard: fallback.argumentCard,
                      thinkingCard: fallback.thinkingCard,
                      argumentKeyword: fallback.argumentKeyword,
                      thinkingKeyword: fallback.thinkingKeyword,
                    }
                  })

                  return (
                    <tr key={`${speaker}-${idx}`} className="border-b border-border align-top last:border-0">
                      <td className="px-3 py-2 font-medium text-foreground">{speaker}</td>
                      {completedRows.map((row, cellIdx) => {
                        const argumentCard = row.argumentCard && row.argumentCard !== "-" ? row.argumentCard : "9) 규제보다 미디어 교육"
                        const thinkingCard = row.thinkingCard && row.thinkingCard !== "-" ? row.thinkingCard : "입장 수정"
                        const keywordSource = `${row.argumentKeyword ?? ""} ${row.thinkingKeyword ?? ""}`.trim()
                        const keywords = extractKeywords(keywordSource)

                        return (
                          <td key={`${speaker}-${idx}-cell-${cellIdx}`} className="px-3 py-2 text-muted-foreground">
                            <div className="space-y-1">
                              <p>
                                <span className="font-semibold text-foreground">논거:</span> {argumentCard}
                              </p>
                              <p>
                                <span className="font-semibold text-foreground">사고:</span> {thinkingCard}
                              </p>
                              <p>
                                <span className="font-semibold text-foreground">키워드:</span> {keywords.length > 0 ? keywords.join(", ") : "-"}
                              </p>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={1 + FREE_MODE_COLUMNS}>
                    자유토론 로그가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>
    )
  }

  const speakerOrder: string[] = []
  const speakerPhaseMap = new Map<string, Map<OrderedPhaseKey, ReportLogItem>>()

  for (const log of logs) {
    const speaker = log.speaker || "발언자 미상"
    const phaseKey = normalizeOrderedPhase(log.phase)
    if (!phaseKey) continue

    if (!speakerPhaseMap.has(speaker)) {
      speakerPhaseMap.set(speaker, new Map())
      speakerOrder.push(speaker)
    }
    speakerPhaseMap.get(speaker)!.set(phaseKey, log)
  }

  if (speakerNames.length > 0) {
    for (const name of speakerNames) {
      if (!speakerOrder.includes(name)) {
        speakerOrder.push(name)
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-6">
      {!isStationSource ? (
        <SessionTopHeader
          sessionId={sessionId}
          sessionTitle={sessionTitle}
          sessionStatus={sessionStatus}
          activeView={activeView}
          reportHref={reportHref}
          manageHref={manageHref}
        />
      ) : null}

	      <div className="mb-4 flex items-start justify-between gap-3">
	        {activeView === "report" ? (
	          <>
	            <div>
	              <p className="text-xs font-semibold tracking-wide text-muted-foreground">토론 레포트</p>
	              <h1 className="text-2xl font-bold text-foreground">순서토론 단계별 매핑 결과</h1>
	              <p className="mt-1 text-sm text-muted-foreground">라운드 {round} · 마지막 단계 {phase}</p>
	            </div>
	            {isStationSource ? (
	              <Button asChild size="sm" variant="outline">
	                <Link href="/station">스테이션 처음 화면으로</Link>
	              </Button>
	            ) : !sessionId ? (
	              <Button asChild size="sm" variant="outline">
	                <Link href="/station">Station으로 돌아가기</Link>
	              </Button>
	            ) : null}
	          </>
        ) : null}
      </div>

      {activeView === "manage" ? (
        <ReportManageView
          phaseLabel={normalizeOrderedPhase(phase) ?? "마무리"}
          speakers={speakerOrder.length > 0 ? speakerOrder : speakerNames}
          desiredGroupCount={desiredGroupCount}
          presetGroups={presetGroups}
        />
      ) : (
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[1600px] text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">발표자</th>
              {ORDERED_PHASES.map((phaseKey) => (
                <th key={phaseKey} className="px-3 py-2 text-left font-medium text-muted-foreground">
                  {phaseKey} 매핑
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {speakerOrder.length > 0 ? (
              speakerOrder.map((speaker, idx) => {
                const perPhase = speakerPhaseMap.get(speaker) ?? new Map<OrderedPhaseKey, ReportLogItem>()
                return (
                  <tr key={`${speaker}-${idx}`} className="border-b border-border align-top last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{speaker}</td>
                    {ORDERED_PHASES.map((phaseKey) => {
                      const mapped = perPhase.get(phaseKey)
                      const fallback = ORDERED_FALLBACK[phaseKey]
                      const argumentCard = mapped?.argumentCard && mapped.argumentCard !== "-" ? mapped.argumentCard : fallback.argumentCard
                      const thinkingCard = mapped?.thinkingCard && mapped.thinkingCard !== "-" ? mapped.thinkingCard : fallback.thinkingCard
                      const keywordSource = `${mapped?.argumentKeyword ?? ""} ${mapped?.thinkingKeyword ?? ""}`.trim()
                      const keywords = extractKeywords(keywordSource)
                      return (
                        <td key={`${speaker}-${phaseKey}`} className="px-3 py-2 text-muted-foreground">
                          <div className="space-y-1">
                            <p>
                              <span className="font-semibold text-foreground">논거:</span> {argumentCard}
                            </p>
                            <p>
                              <span className="font-semibold text-foreground">사고:</span> {thinkingCard}
                            </p>
                            <p>
                              <span className="font-semibold text-foreground">키워드:</span> {keywords.length > 0 ? keywords.join(", ") : "-"}
                            </p>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            ) : (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={1 + ORDERED_PHASES.length}>
                  순서토론 로그가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}

