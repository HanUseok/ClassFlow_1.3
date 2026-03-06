"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { listClasses, listDebateEvents, listStudents } from "@/lib/application/roster-service"
import { useMockSessions } from "@/hooks/use-mock-sessions"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, User } from "lucide-react"
import {
  buildEvidenceItems,
  buildStudentEvidenceSummaries,
  priorityScore,
} from "@/lib/evidence-utils"
import { readFeaturedEvidenceMap, subscribeFeaturedEvidence } from "@/lib/featured-evidence-store"

export default function StudentsPage() {
  const allStudents = listStudents()
  const classes = listClasses()
  const events = listDebateEvents()
  const { sessions } = useMockSessions()
  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState<string>("all")
  const [featuredMap, setFeaturedMap] = useState<Record<string, string[]>>({})

  useEffect(() => {
    setFeaturedMap(readFeaturedEvidenceMap())
    return subscribeFeaturedEvidence(() => {
      setFeaturedMap(readFeaturedEvidenceMap())
    })
  }, [])

  const evidenceItems = useMemo(
    () => buildEvidenceItems({ events, sessions, students: allStudents }),
    [events, sessions, allStudents]
  )

  const summaries = useMemo(
    () => buildStudentEvidenceSummaries({ students: allStudents, evidenceItems, featuredMap }),
    [allStudents, evidenceItems, featuredMap]
  )

  const filtered = useMemo(() => {
    return summaries
      .filter((summary) => {
        if (classFilter !== "all" && summary.student.classId !== classFilter) return false
        if (search && !summary.student.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        const priorityDiff = priorityScore(a) - priorityScore(b)
        if (priorityDiff !== 0) return priorityDiff
        return a.student.name.localeCompare(b.student.name, "ko")
      })
  }, [summaries, search, classFilter])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">학생</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="학생 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="전체 학급" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 학급</SelectItem>
            {classes.map((classItem) => (
              <SelectItem key={classItem.id} value={classItem.id}>
                {classItem.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((summary) => (
            <Link
              key={summary.student.id}
              href={`/teacher/students/${summary.student.id}`}
              className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/20 hover:bg-accent/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-card-foreground group-hover:text-foreground">
                      {summary.student.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{summary.student.className}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {summary.evidenceCount === 0 ? <Badge variant="destructive">근거 없음</Badge> : null}
                {summary.featuredCount === 0 ? <Badge variant="outline">대표 사례 없음</Badge> : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">조건에 맞는 학생이 없습니다.</p>
        </div>
      )}
    </div>
  )
}

