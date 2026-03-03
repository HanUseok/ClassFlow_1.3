"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type { Session } from "@/lib/mock-data"
import { useMockSessions } from "@/hooks/use-mock-sessions"
import { Button } from "@/components/ui/button"

function getStatusLabel(status: Session["status"]) {
  switch (status) {
    case "Live":
      return "진행중"
    case "Ended":
      return "완료"
    case "Pending":
      return "준비됨"
    default:
      return status
  }
}

function getStatusColor(status: Session["status"]) {
  switch (status) {
    case "Live":
      return "font-medium text-emerald-600"
    case "Pending":
      return "font-medium text-amber-600"
    case "Ended":
      return "font-medium text-slate-600"
    default:
      return "font-medium text-muted-foreground"
  }
}

function toDateTime(dateText: string) {
  const parsed = new Date(`${dateText}T00:00:00`)
  if (!Number.isNaN(parsed.getTime())) return parsed.getTime()
  const fallback = new Date(dateText)
  return Number.isNaN(fallback.getTime()) ? 0 : fallback.getTime()
}

function formatSessionDate(dateText: string) {
  const parsed = new Date(`${dateText}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return dateText
  return parsed.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

export default function SessionsPage() {
  const { sessions, hydrated, update, remove, removeAll } = useMockSessions()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | Session["type"]>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | Session["status"]>("all")
  const [query, setQuery] = useState("")

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sessions
      .filter((session) => {
      if (typeFilter !== "all" && session.type !== typeFilter) return false
      if (statusFilter !== "all" && session.status !== statusFilter) return false
      if (q) {
        const target = `${session.title} ${session.topic ?? ""}`.toLowerCase()
        if (!target.includes(q)) return false
      }
      return true
      })
      .sort((a, b) => toDateTime(b.date) - toDateTime(a.date))
  }, [sessions, typeFilter, statusFilter, query])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-foreground">세션 개요</h1>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (sessions.length === 0) return
              if (window.confirm("세션을 전체 삭제할까요?")) {
                removeAll()
                setEditingId(null)
                setDraftTitle("")
              }
            }}
          >
            전체삭제
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/teacher/sessions/create?type=presentation">발표 생성</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/teacher/sessions/create?type=debate">토론 생성</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | Session["type"])}
          className="rounded border border-border bg-background px-2 py-2 text-sm"
        >
          <option value="all">전체 유형</option>
          <option value="Debate">토론</option>
          <option value="Presentation">발표</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | Session["status"])}
          className="rounded border border-border bg-background px-2 py-2 text-sm"
        >
          <option value="all">전체 상태</option>
          <option value="Pending">준비됨</option>
          <option value="Live">진행중</option>
          <option value="Ended">완료</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목/주제/발언자 검색"
          className="sm:col-span-2 rounded border border-border bg-background px-2 py-2 text-sm"
        />
      </div>

      {!hydrated ? (
        <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
          세션 불러오는 중...
        </div>
      ) : list.length > 0 ? (
        <div className="space-y-3">
          {list.map((session) => {
            const isEditing = editingId === session.id
            const canInlineEdit = false
            const detailLabel =
              session.status === "Pending"
                ? "확인/수정"
                : session.status === "Live"
                  ? "세션 진입"
                  : "레포트 확인"
            const detailHref =
              session.status === "Pending"
                ? `/teacher/sessions/create?sessionId=${session.id}&type=${session.type === "Presentation" ? "presentation" : "debate"}`
                : session.status === "Ended"
                  ? `/teacher/sessions/${session.id}/report`
                  : `/teacher/sessions/${session.id}`
            return (
              <div key={session.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    {isEditing ? (
                      <input
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        className="w-full max-w-md rounded border border-border bg-background px-2 py-1 text-sm"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-card-foreground">{session.title}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                      <span className="text-card-foreground">{session.topic ?? "주제 없음"}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-semibold text-card-foreground">{formatSessionDate(session.date)}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={getStatusColor(session.status)}>{getStatusLabel(session.status)}</span>
                    </div>
                  </div>

	                  <div className="flex flex-wrap items-center gap-2">
	                    <Button asChild size="sm" variant="outline">
	                      <Link href={detailHref}>{detailLabel}</Link>
	                    </Button>

                    {canInlineEdit && isEditing ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            update(session.id, { title: draftTitle.trim() || session.title })
                            setEditingId(null)
                            setDraftTitle("")
                          }}
                        >
                          저장
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null)
                            setDraftTitle("")
                          }}
                        >
                          취소
                        </Button>
                      </>
                    ) : canInlineEdit ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(session.id)
                          setDraftTitle(session.title)
                        }}
                      >
                        수정
                      </Button>
                    ) : null}

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm("이 세션을 삭제할까요?")) {
                          remove(session.id)
                          if (editingId === session.id) {
                            setEditingId(null)
                            setDraftTitle("")
                          }
                        }
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">조건에 맞는 세션이 없습니다.</p>
        </div>
      )}
    </div>
  )
}
