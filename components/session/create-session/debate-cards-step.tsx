"use client"

import { RefreshCw, Sparkles, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ArgumentCard, ArgumentSide } from "@/lib/domain/session/create-session"

type DebateCardsStepProps = {
  isDebate: boolean
  debateStep: "setup" | "cards" | "headcount" | "placement"
  isGeneratingCards: boolean
  cardsReady: boolean
  argumentCards: ArgumentCard[]
  onOpenCardsStep: (forceRegenerate?: boolean) => void
  onSetArgumentCards: (updater: (prev: ArgumentCard[]) => ArgumentCard[]) => void
}

export function DebateCardsStep({
  isDebate,
  debateStep,
  isGeneratingCards,
  cardsReady,
  argumentCards,
  onOpenCardsStep,
  onSetArgumentCards,
}: DebateCardsStepProps) {
  if (!isDebate || debateStep !== "cards") return null

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      {isGeneratingCards ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-center">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="text-base font-medium text-foreground">AI가 논거카드를 생성하고 있어요</p>
          <p className="mt-1 text-sm text-muted-foreground">주제에 맞는 카드 목록을 준비 중입니다.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">AI 논거카드 제안</p>
              <p className="text-xs text-muted-foreground">찬성 4 / 반대 4 / 중립 2 기본 구성</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenCardsStep(true)}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                AI 재생성
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onSetArgumentCards((prev) => [
                    ...prev,
                    {
                      id: `arg-${Date.now()}`,
                      title: "",
                      claim: "",
                      evidenceHint: "",
                      side: "neutral",
                      enabled: true,
                    },
                  ])
                }
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                카드 추가
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {argumentCards.map((card) => (
              <div key={card.id} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Checkbox
                    checked={card.enabled}
                    onCheckedChange={(checked) =>
                      onSetArgumentCards((prev) => prev.map((item) => (item.id === card.id ? { ...item, enabled: Boolean(checked) } : item)))
                    }
                  />
                  <Select
                    value={card.side}
                    onValueChange={(value) =>
                      onSetArgumentCards((prev) =>
                        prev.map((item) => (item.id === card.id ? { ...item, side: value as ArgumentSide } : item))
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="affirmative">찬성</SelectItem>
                      <SelectItem value="negative">반대</SelectItem>
                      <SelectItem value="neutral">중립</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-destructive"
                    onClick={() => onSetArgumentCards((prev) => prev.filter((item) => item.id !== card.id))}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    삭제
                  </Button>
                </div>

                <Input
                  placeholder="카드 제목"
                  value={card.title}
                  onChange={(e) =>
                    onSetArgumentCards((prev) => prev.map((item) => (item.id === card.id ? { ...item, title: e.target.value } : item)))
                  }
                />
                <Textarea
                  className="mt-2"
                  rows={3}
                  placeholder="핵심 주장"
                  value={card.claim}
                  onChange={(e) =>
                    onSetArgumentCards((prev) => prev.map((item) => (item.id === card.id ? { ...item, claim: e.target.value } : item)))
                  }
                />
              </div>
            ))}
          </div>

          {!cardsReady ? (
            <p className="text-xs text-destructive">활성화된 논거카드를 3개 이상(제목/주장 입력) 작성해야 세션을 만들 수 있습니다.</p>
          ) : null}
        </>
      )}
    </div>
  )
}
