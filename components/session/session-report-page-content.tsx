"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useMockSessions } from "@/hooks/use-mock-sessions"
import { collectUniqueMembers } from "@/lib/domain/session"

const ORDERED_PHASES = ["입론", "반론", "재반론", "마무리"] as const
const FREE_COLUMNS = 4

const ARGUMENT_FALLBACKS = [
  "1) 뇌 발달/중독 메커니즘",
  "2) 학습권/집중력 저하",
  "3) 수면권/건강권",
  "4) 자기결정권/자율성",
  "5) 실효성/우회 가능성",
  "6) 규제보다 미디어 교육",
  "9) 규제보다 미디어 교육",
  "10) 단계적·조건부 제한",
]

const THINKING_FALLBACKS = ["적용", "인과 설명", "비교", "한계 지적", "반례 제시", "전제 분석", "자료 보완", "입장 수정"]

function buildKeyword(argument: string, thinking: string) {
  const normalizedArgument = argument.replace(/^\d+\)\s*/, "")
  return `${normalizedArgument}, ${thinking}`
}

export function SessionReportPageContent() {
  const params = useParams<{ id: string }>()
  const { sessions, hydrated } = useMockSessions()
  const session = sessions.find((item) => item.id === params.id)

  const groups = session?.debate?.groups ?? []
  const members = useMemo(() => {
    if (!session || session.type !== "Debate") return []
    return collectUniqueMembers(groups)
  }, [session, groups])
  const speakerNames = members.map((member) => member.name)
  const isFreeMode = session?.type === "Debate" && (session.debate?.mode ?? "Ordered") === "Free"

  if (!hydrated) {
    return (
      <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
        레포트 불러오는 중...
      </div>
    )
  }

  if (!session || session.type !== "Debate") {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-border p-6">
        <p className="text-sm text-muted-foreground">토론 세션 레포트를 찾을 수 없습니다.</p>
        <Link href="/teacher/sessions" className="text-sm font-medium text-primary hover:underline">
          세션 목록으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link href="/teacher/sessions" className="w-fit text-sm text-muted-foreground transition-colors hover:text-foreground">
          <span className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            세션 목록으로 돌아가기
          </span>
        </Link>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">완료 세션 레포트</p>
          <h1 className="text-2xl font-bold text-foreground">{session.title}</h1>
          {session.topic ? <p className="mt-1 text-sm text-muted-foreground">{session.topic}</p> : null}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-2 text-sm font-medium text-foreground">전체 학생</p>
        <p className="text-sm text-muted-foreground">{speakerNames.length > 0 ? speakerNames.join(", ") : "학생 정보 없음"}</p>
      </div>

      {isFreeMode ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[1600px] text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">발표자</th>
                {Array.from({ length: FREE_COLUMNS }, (_, idx) => (
                  <th key={`free-${idx}`} className="px-3 py-2 text-left font-medium text-muted-foreground">
                    매핑 {idx + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {speakerNames.map((speaker, speakerIndex) => (
                <tr key={`${speaker}-${speakerIndex}`} className="border-b border-border align-top last:border-0">
                  <td className="px-3 py-2 font-medium text-foreground">{speaker}</td>
                  {Array.from({ length: FREE_COLUMNS }, (_, cellIndex) => {
                    const argument = ARGUMENT_FALLBACKS[(speakerIndex + cellIndex) % ARGUMENT_FALLBACKS.length]
                    const thinking = THINKING_FALLBACKS[(speakerIndex + cellIndex) % THINKING_FALLBACKS.length]
                    return (
                      <td key={`${speaker}-${cellIndex}`} className="px-3 py-2 text-muted-foreground">
                        <div className="space-y-1">
                          <p>
                            <span className="font-semibold text-foreground">논거:</span> {argument}
                          </p>
                          <p>
                            <span className="font-semibold text-foreground">사고:</span> {thinking}
                          </p>
                          <p>
                            <span className="font-semibold text-foreground">키워드:</span> {buildKeyword(argument, thinking)}
                          </p>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[1600px] text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">발표자</th>
                {ORDERED_PHASES.map((phase) => (
                  <th key={phase} className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {phase} 매핑
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {speakerNames.map((speaker, speakerIndex) => (
                <tr key={`${speaker}-${speakerIndex}`} className="border-b border-border align-top last:border-0">
                  <td className="px-3 py-2 font-medium text-foreground">{speaker}</td>
                  {ORDERED_PHASES.map((phase, phaseIndex) => {
                    const argument = ARGUMENT_FALLBACKS[(speakerIndex + phaseIndex) % ARGUMENT_FALLBACKS.length]
                    const thinking = THINKING_FALLBACKS[(speakerIndex + phaseIndex) % THINKING_FALLBACKS.length]
                    return (
                      <td key={`${speaker}-${phase}`} className="px-3 py-2 text-muted-foreground">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">{phase}</p>
                          <p>
                            <span className="font-semibold text-foreground">논거:</span> {argument}
                          </p>
                          <p>
                            <span className="font-semibold text-foreground">사고:</span> {thinking}
                          </p>
                          <p>
                            <span className="font-semibold text-foreground">키워드:</span> {buildKeyword(argument, thinking)}
                          </p>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
