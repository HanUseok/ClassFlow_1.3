"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Session } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Mic, MicOff } from "lucide-react"

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

const KEYWORD_CATEGORIES = [
  "주제 핵심 키워드",
  "문제 인식 키워드",
  "탐구 방법 키워드",
  "분석/확장 키워드",
  "전공 연계 키워드",
  "학생 역량 키워드",
  "성장/변화 키워드",
] as const

const KEYWORD_POOL: Record<(typeof KEYWORD_CATEGORIES)[number], string[]> = {
  "주제 핵심 키워드": ["탄소중립", "데이터 윤리", "지역경제", "디지털 전환", "공공성", "기후 적응"],
  "문제 인식 키워드": ["격차 심화", "정보 비대칭", "접근성 한계", "정책 공백", "비용 부담"],
  "탐구 방법 키워드": ["설문 조사", "사례 비교", "인터뷰", "통계 분석", "문헌 검토", "현장 관찰"],
  "분석/확장 키워드": ["원인-결과", "대안 제시", "반례 검토", "가정 검증", "적용 범위 확장"],
  "전공 연계 키워드": ["경영", "컴퓨터공학", "환경공학", "사회학", "교육학", "디자인"],
  "학생 역량 키워드": ["논리 전개", "근거 제시", "의사소통", "질문 설계", "협업", "비판적 사고"],
  "성장/변화 키워드": ["관점 전환", "표현 자신감", "근거 정확도 향상", "피드백 반영", "탐구 태도 강화"],
}

function pickKeywords(seed: number, pool: string[], min: number, max: number) {
  const count = min + (seed % (max - min + 1))
  const shifted = pool.map((item, idx) => pool[(idx + (seed % pool.length)) % pool.length])
  return shifted.slice(0, Math.min(count, pool.length))
}

function buildKeywordMap(studentName: string, recordingEnabled: boolean) {
  const result = {} as Record<(typeof KEYWORD_CATEGORIES)[number], string[]>

  if (!recordingEnabled) {
    KEYWORD_CATEGORIES.forEach((category) => {
      result[category] = []
    })
    return result
  }

  const baseSeed = studentName.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)

  KEYWORD_CATEGORIES.forEach((category, index) => {
    const pool = KEYWORD_POOL[category]
    const seed = baseSeed + index * 17
    const shouldBeEmpty = (seed % 5) === 0
    if (shouldBeEmpty) {
      result[category] = []
      return
    }
    result[category] = pickKeywords(seed, pool, 1, Math.min(3, pool.length))
  })

  return result
}

export function PresentationView({
  session,
  onStart,
  onEnd,
}: {
  session: Session
  onStart: () => void
  onEnd: () => void
}) {
  const presenters = useMemo(() => {
    const raw = session.presentation?.presenters ?? []
    return raw.map((item) => {
      if ("student" in item) {
        return {
          student: item.student,
          recordingEnabled: item.recordingEnabled,
        }
      }
      return {
        student: item,
        recordingEnabled: false,
      }
    })
  }, [session.presentation?.presenters])
  const secondsPerPresenter = session.presentation?.secondsPerPresenter ?? 300

  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(secondsPerPresenter)
  const [isRunning, setIsRunning] = useState(false)
  const [readyForNext, setReadyForNext] = useState(false)
  const [showAiLoading, setShowAiLoading] = useState(false)
  const prevStatusRef = useRef(session.status)

  const currentPresenter = presenters[currentIndex]
  const isRecordingCurrent = currentPresenter?.recordingEnabled ?? false
  const hasPresenters = presenters.length > 0

  useEffect(() => {
    setCurrentIndex(0)
    setTimeLeft(secondsPerPresenter)
    setIsRunning(false)
    setReadyForNext(false)
    setShowAiLoading(false)
    prevStatusRef.current = session.status
  }, [session.id, secondsPerPresenter])

  useEffect(() => {
    const prevStatus = prevStatusRef.current
    prevStatusRef.current = session.status

    if (session.status !== "Ended") return
    if (prevStatus === "Ended") return

    setShowAiLoading(true)
    const timer = window.setTimeout(() => {
      setShowAiLoading(false)
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [session.status])

  const playTimeUpAlert = useCallback(() => {
    if (typeof window === "undefined") return
    const AudioContextRef = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextRef) return

    const ctx = new AudioContextRef()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = "sine"
    oscillator.frequency.value = 880
    gain.gain.value = 0.08
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.25)
  }, [])

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return
    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [isRunning, timeLeft])

  useEffect(() => {
    if (timeLeft !== 0 || !isRunning) return
    setIsRunning(false)
    setReadyForNext(true)
    playTimeUpAlert()
  }, [isRunning, playTimeUpAlert, timeLeft])

  const progressText = useMemo(() => `${Math.min(currentIndex + 1, Math.max(1, presenters.length))}`, [currentIndex, presenters.length])

  const handleStartOrEnd = () => {
    if (!hasPresenters) return
    if (isRunning) {
      setIsRunning(false)
      setReadyForNext(true)
      return
    }
    setReadyForNext(false)
    setIsRunning(true)
  }

  const handleNextPresenter = () => {
    if (currentIndex >= presenters.length - 1) {
      onEnd()
      return
    }
    const nextIndex = currentIndex + 1
    setCurrentIndex(nextIndex)
    setTimeLeft(secondsPerPresenter)
    setIsRunning(false)
    setReadyForNext(false)
  }

  const handleMoveOrder = (dir: -1 | 1) => {
    if (isRunning) return
    const nextIndex = currentIndex + dir
    if (nextIndex < 0 || nextIndex >= presenters.length) return
    setCurrentIndex(nextIndex)
    setTimeLeft(secondsPerPresenter)
    setReadyForNext(false)
  }

  if (!hasPresenters) {
    return (
      <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
        No presenters configured for this session.
      </div>
    )
  }

  if (session.status === "Pending") {
    return (
      <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6">
        <div className="text-sm text-muted-foreground">Per presenter: {Math.round(secondsPerPresenter / 60)} min</div>
        <div className="flex items-center gap-4 rounded-lg border border-border p-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback>{currentPresenter?.student.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs text-muted-foreground">1번 발표자</p>
            <p className="text-lg font-semibold text-foreground">{currentPresenter?.student.name}</p>
            <p className={`mt-1 text-xs ${isRecordingCurrent ? "text-rose-600" : "text-muted-foreground"}`}>
              {isRecordingCurrent ? "녹음 대상" : "녹음 제외 (타이머만 사용)"}
            </p>
          </div>
        </div>
        <Button onClick={onStart} className="w-full sm:w-auto">
          발표 시작하기
        </Button>
      </div>
    )
  }

  if (session.status === "Ended") {
    if (showAiLoading) {
      return (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="text-sm font-medium text-foreground">녹음 내용을 AI로 분석하는 중입니다...</p>
          <p className="text-xs text-muted-foreground">키워드 요약표를 생성하고 있습니다.</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
        <p className="text-sm font-medium text-foreground">발표 세션이 종료되었습니다. AI 키워드 요약 결과입니다.</p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">발표자</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">녹음</th>
                {KEYWORD_CATEGORIES.map((category) => (
                  <th key={category} className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {category}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {presenters.map((presenter, idx) => {
                const keywordMap = buildKeywordMap(presenter.student.name, presenter.recordingEnabled)
                return (
                  <tr key={presenter.student.id} className="border-b border-border align-top last:border-0">
                    <td className="px-3 py-2 text-foreground">
                      {idx + 1}. {presenter.student.name}
                    </td>
                    <td className="px-3 py-2">
                      <span className={presenter.recordingEnabled ? "text-rose-600" : "text-muted-foreground"}>
                        {presenter.recordingEnabled ? "녹음" : "비녹음"}
                      </span>
                    </td>
                    {KEYWORD_CATEGORIES.map((category) => (
                      <td key={category} className="px-3 py-2 text-muted-foreground">
                        {keywordMap[category].length > 0 ? keywordMap[category].join(", ") : "-"}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">발표 순서</p>
        <div className="mt-4 flex items-center gap-4 rounded-lg border border-border p-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback>{currentPresenter?.student.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs text-muted-foreground">{currentIndex + 1}번 발표자</p>
            <p className="text-xl font-semibold text-foreground">{currentPresenter?.student.name}</p>
            <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
              isRecordingCurrent ? "bg-rose-100 text-rose-700" : "bg-muted text-muted-foreground"
            }`}>
              {isRecordingCurrent ? (
                <>
                  <Mic className={`h-3 w-3 ${isRunning ? "animate-pulse" : ""}`} />
                  {isRunning ? "녹음 중" : "녹음 대기"}
                </>
              ) : (
                <>
                  <MicOff className="h-3 w-3" />
                  비녹음
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 text-center">
        <p className="text-xs text-muted-foreground">남은 시간</p>
        <p className={`mt-1 text-4xl font-bold tabular-nums ${timeLeft <= 20 ? "text-destructive" : "text-foreground"}`}>
          {formatTime(timeLeft)}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button onClick={handleStartOrEnd}>
          {isRunning ? "발표 끝내기" : "발표하기"}
        </Button>
        {!isRecordingCurrent && (
          <p className="text-center text-xs text-muted-foreground">
            현재 학생은 녹음되지 않습니다. 타이머만 진행됩니다.
          </p>
        )}

        {readyForNext && (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleNextPresenter}>
              {currentIndex >= presenters.length - 1 ? "세션 종료" : "다음 발표자"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card p-3">
        <Button variant="outline" size="sm" onClick={() => handleMoveOrder(-1)} disabled={isRunning || currentIndex === 0}>
          {"<"}
        </Button>
        <p className="min-w-16 text-center text-sm font-semibold text-foreground">{progressText}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleMoveOrder(1)}
          disabled={isRunning || currentIndex >= presenters.length - 1}
        >
          {">"}
        </Button>
      </div>
    </div>
  )
}
