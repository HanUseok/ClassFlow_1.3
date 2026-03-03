"use client"

import { Button } from "@/components/ui/button"
import { Monitor } from "lucide-react"

interface WaitingScreenProps {
  onJoin: () => void
  sessionInfo: {
    topic: string
    teacherName: string
    createdAt: string
    memberCount: number
    hasSpeakingOrder: boolean
  }
}

export function WaitingScreen({ onJoin, sessionInfo }: WaitingScreenProps) {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Monitor className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">조 스테이션</h1>
          <p className="mt-1 text-sm text-muted-foreground">교사 시작 대기 중...</p>
        </div>
      </div>

      <div className="w-full rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-4 text-left">
          <div>
            <p className="mb-1 text-xs text-muted-foreground uppercase tracking-wider">주제</p>
            <p className="text-sm font-medium text-card-foreground">{sessionInfo.topic}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground uppercase tracking-wider">교사</p>
            <p className="text-sm font-medium text-card-foreground">{sessionInfo.teacherName}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-muted/50 p-3">
              <p className="mb-1 text-xs text-muted-foreground">생성 시간</p>
              <p className="text-xs font-medium text-card-foreground">
                {new Date(sessionInfo.createdAt).toLocaleString("ko-KR", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="rounded-md bg-muted/50 p-3">
              <p className="mb-1 text-xs text-muted-foreground">조 편성 정보</p>
              <p className="text-xs font-medium text-card-foreground">
                {sessionInfo.memberCount}명 / 발언 순서 {sessionInfo.hasSpeakingOrder ? "설정 완료" : "미설정"}
              </p>
            </div>
          </div>

          <Button size="lg" className="mt-2 w-full" onClick={onJoin}>
            입장
          </Button>
        </div>
      </div>
    </div>
  )
}
