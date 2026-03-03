"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Presenter = {
  student: { id: string; name: string }
  recordingEnabled: boolean
}

type PresentationConfigStepProps = {
  isDebate: boolean
  hasSelectedClass: boolean
  selectedStudentCount: number
  presentationMinutesPerStudent: number
  selectedPresentationPresenters: Presenter[]
  onMinutesChange: (value: number) => void
  onToggleRecordingStudent: (studentId: string) => void
  onMovePresenterOrder: (from: number, to: number) => void
}

export function PresentationConfigStep({
  isDebate,
  hasSelectedClass,
  selectedStudentCount,
  presentationMinutesPerStudent,
  selectedPresentationPresenters,
  onMinutesChange,
  onToggleRecordingStudent,
  onMovePresenterOrder,
}: PresentationConfigStepProps) {
  if (isDebate || !hasSelectedClass || selectedStudentCount <= 0) return null

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="presentation-minutes">Per-student presentation time (minutes)</Label>
        <Input
          id="presentation-minutes"
          type="number"
          min={1}
          max={30}
          value={presentationMinutesPerStudent}
          onChange={(e) => onMinutesChange(Math.max(1, Number(e.target.value) || 1))}
          className="max-w-[180px]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Presentation order</Label>
        <div className="flex flex-col gap-2">
          {selectedPresentationPresenters.map((presenter, idx) => (
            <div key={presenter.student.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm text-foreground">
                {idx + 1}. {presenter.student.name}
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={presenter.recordingEnabled} onCheckedChange={() => onToggleRecordingStudent(presenter.student.id)} />
                  Record
                </label>
                <button
                  type="button"
                  onClick={() => onMovePresenterOrder(idx, idx - 1)}
                  className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => onMovePresenterOrder(idx, idx + 1)}
                  className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                >
                  Down
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

