"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { OrderedStageConfig } from "@/lib/domain/session/create-session"

type DebateRosterStepProps = {
  isDebate: boolean
  debateStep: "setup" | "cards" | "headcount" | "placement"
  debateMode: "Ordered" | "Free"
  teacherGuided: "guided" | "unguided"
  orderedStages: OrderedStageConfig[]
  orderedFlowValid: boolean
  onDebateModeChange: (value: "Ordered" | "Free") => void
  onTeacherGuidedChange: (value: "guided" | "unguided") => void
  onStageToggle: (stageId: OrderedStageConfig["id"]) => void
  onStageMinutesChange: (stageId: OrderedStageConfig["id"], minutes: number) => void
  onGoHeadcount: () => void
}

export function DebateRosterStep({
  isDebate,
  debateStep,
  debateMode,
  teacherGuided,
  orderedStages,
  orderedFlowValid,
  onDebateModeChange,
  onTeacherGuidedChange,
  onStageToggle,
  onStageMinutesChange,
  onGoHeadcount,
}: DebateRosterStepProps) {
  if (!isDebate || debateStep !== "setup") return null

  return (
    <>
      <div className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>토론 방식</Label>
          <Select value={debateMode} onValueChange={(value) => onDebateModeChange(value as "Ordered" | "Free")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ordered">순서 토론</SelectItem>
              <SelectItem value="Free">자유 토론</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>진행 방식</Label>
          <Select value={teacherGuided} onValueChange={(value) => onTeacherGuidedChange(value as "guided" | "unguided")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="guided">교사 진행</SelectItem>
              <SelectItem value="unguided">자율 진행</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {debateMode === "Ordered" ? (
        <div className="rounded-lg border border-border p-4">
          <p className="mb-2 text-sm font-medium text-foreground">순서 토론 단계 설정</p>
          <div className="flex flex-wrap items-start gap-3">
            {orderedStages.map((stage, index) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => onStageToggle(stage.id)}
                className={[
                  "relative flex h-40 w-[140px] flex-col rounded-3xl border-2 bg-amber-50 p-3 text-left shadow-sm transition",
                  stage.enabled ? "border-emerald-500" : "border-red-500",
                ].join(" ")}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-medium text-slate-700">{stage.label}</span>
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      stage.enabled ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
                    ].join(" ")}
                  >
                    {stage.enabled ? "ON" : "OFF"}
                  </span>
                </div>
                <div className="mt-4 text-center text-3xl font-semibold text-slate-900">{index + 1}</div>
                <div className="mt-auto flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    value={stage.minutes}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onStageMinutesChange(stage.id, Math.max(1, Number(e.target.value) || 1))}
                    className="h-7 text-center"
                  />
                  <span className="text-[11px] text-slate-600">분</span>
                </div>
              </button>
            ))}
          </div>
          {!orderedFlowValid ? (
            <p className="mt-2 text-xs text-destructive">순서 토론은 1개 이상 단계를 켜고 시간은 1분 이상이어야 합니다.</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" onClick={onGoHeadcount}>
          인원 설정으로 이동
        </Button>
      </div>
    </>
  )
}

