"use client"

import { useEffect, useMemo, useState } from "react"
import type { Session, Student } from "@/lib/mock-data"
import { stations } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Monitor, Users, Wifi, WifiOff, Send, Play, ArrowUp, ArrowDown } from "lucide-react"

type TeamKey = "team1" | "team2"
type TeamGroup = NonNullable<Session["teams"]>

type TimeStructure = {
  opening: number
  rebuttal: number
  rerebuttal: number
  finalSummary: number
}

const TIME_LABELS: Record<keyof TimeStructure, string> = {
  opening: "입론",
  rebuttal: "반론",
  rerebuttal: "재반론",
  finalSummary: "최종 정리",
}

export function PreStartView({
  session,
  onStart,
  onTeamsChange,
  onDebateGroupsChange,
}: {
  session: Session
  onStart: () => void
  onTeamsChange?: (teams: TeamGroup) => void
  onDebateGroupsChange?: (groups: NonNullable<NonNullable<Session["debate"]>["groups"]>) => void
}) {
  const [inviteSent, setInviteSent] = useState(false)
  const [team1, setTeam1] = useState<Student[]>(session.teams?.team1 ?? [])
  const [team2, setTeam2] = useState<Student[]>(session.teams?.team2 ?? [])
  const [timeStructure, setTimeStructure] = useState<TimeStructure>({
    opening: 180,
    rebuttal: 180,
    rerebuttal: 180,
    finalSummary: 120,
  })

  const stationData = stations.map((st) => ({
    ...st,
    icon: st.role === "Teacher Desk" ? Monitor : Users,
  }))

  const connectedCount = stationData.filter((st) => st.connectionStatus === "Connected").length
  const requiredConnected = connectedCount >= 2

  const totalMembers = team1.length + team2.length
  const speakingOrderReady = team1.length > 0 && team2.length > 0
  const [groups, setGroups] = useState<NonNullable<NonNullable<Session["debate"]>["groups"]>>(session.debate?.groups ?? [])

  useEffect(() => {
    setGroups(session.debate?.groups ?? [])
  }, [session.id, session.debate?.groups])

  const persistTeams = (nextTeam1: Student[], nextTeam2: Student[]) => {
    onTeamsChange?.({ team1: nextTeam1, team2: nextTeam2 })
  }

  const persistGroups = (nextGroups: NonNullable<NonNullable<Session["debate"]>["groups"]>) => {
    setGroups(nextGroups)
    onDebateGroupsChange?.(nextGroups)
  }

  const moveOrder = (team: TeamKey, index: number, dir: -1 | 1) => {
    const members = team === "team1" ? team1 : team2
    const target = index + dir
    if (target < 0 || target >= members.length) return

    const next = [...members]
    const [picked] = next.splice(index, 1)
    next.splice(target, 0, picked)

    if (team === "team1") {
      setTeam1(next)
      persistTeams(next, team2)
      return
    }

    setTeam2(next)
    persistTeams(team1, next)
  }

  const moveGroupRoleOrder = (
    groupId: string,
    role: "affirmative" | "negative",
    index: number,
    dir: -1 | 1
  ) => {
    const nextGroups = groups.map((group) => {
      if (group.id !== groupId) return group
      const list = [...group[role]]
      const target = index + dir
      if (target < 0 || target >= list.length) return group
      const [picked] = list.splice(index, 1)
      list.splice(target, 0, picked)
      return { ...group, [role]: list }
    })
    persistGroups(nextGroups)
  }

  const teamSummaries = useMemo(
    () => [
      { key: "team1" as const, label: "찬성", members: team1 },
      { key: "team2" as const, label: "반대", members: team2 },
    ],
    [team1, team2]
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">세션 요약</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">학급:</span>{" "}
            <span className="font-medium text-card-foreground">{session.className}</span>
          </div>
          <div>
            <span className="text-muted-foreground">일자:</span>{" "}
            <span className="font-medium text-card-foreground">
              {new Date(session.date).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">인원:</span>{" "}
            <span className="font-medium text-card-foreground">{totalMembers}</span>
          </div>
          <div>
            <span className="text-muted-foreground">발언 순서:</span>{" "}
            <span className="font-medium text-card-foreground">
              {speakingOrderReady ? "준비 완료" : "미준비"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">조 수:</span>{" "}
            <span className="font-medium text-card-foreground">{groups.length}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">역할별 발언 순서</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {teamSummaries.map((team) => (
            <div key={team.key} className="rounded-lg border border-border">
              <div className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-medium text-card-foreground">
                {team.label}
              </div>
              <div className="p-3">
                {team.members.length === 0 ? (
                  <p className="text-xs text-muted-foreground">배정된 인원이 없습니다.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {team.members.map((member, index) => (
                      <div key={member.id} className="flex items-center justify-between rounded-md border px-2 py-1.5">
                        <span className="text-sm text-card-foreground">
                          {index + 1}. {member.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveOrder(team.key, index, -1)}
                            className="rounded border px-1.5 py-1 text-muted-foreground hover:bg-accent"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveOrder(team.key, index, 1)}
                            className="rounded border px-1.5 py-1 text-muted-foreground hover:bg-accent"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {groups.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">그룹 편성</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((group) => (
              <div key={group.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-card-foreground">{group.id}</p>
                <p className="mt-1 text-xs text-muted-foreground">진행자: {group.moderator?.name ?? "-"}</p>
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-card-foreground">찬성</p>
                    {group.affirmative.length > 0 ? (
                      <div className="mt-1 flex flex-col gap-1">
                        {group.affirmative.map((student, idx) => (
                          <div key={student.id} className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{`찬성 ${idx + 1} ${student.name}`}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveGroupRoleOrder(group.id, "affirmative", idx, -1)}
                                className="rounded border px-1.5 py-0.5 hover:bg-accent"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveGroupRoleOrder(group.id, "affirmative", idx, 1)}
                                className="rounded border px-1.5 py-0.5 hover:bg-accent"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">-</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-card-foreground">반대</p>
                    {group.negative.length > 0 ? (
                      <div className="mt-1 flex flex-col gap-1">
                        {group.negative.map((student, idx) => (
                          <div key={student.id} className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{`반대 ${idx + 1} ${student.name}`}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveGroupRoleOrder(group.id, "negative", idx, -1)}
                                className="rounded border px-1.5 py-0.5 hover:bg-accent"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveGroupRoleOrder(group.id, "negative", idx, 1)}
                                className="rounded border px-1.5 py-0.5 hover:bg-accent"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">-</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">시간 구성</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(timeStructure).map(([rawKey, value]) => {
            const key = rawKey as keyof TimeStructure
            return (
            <label key={key} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span className="text-card-foreground">{TIME_LABELS[key]}</span>
              <input
                type="number"
                min={30}
                step={30}
                value={value}
                onChange={(e) => setTimeStructure((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))}
                className="w-20 rounded border border-border bg-background px-2 py-1 text-right text-sm"
              />
            </label>
          )})}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">스테이션 현황</h2>
        <div className="mb-2 text-xs text-muted-foreground">연결: {connectedCount}/{stationData.length}</div>
        <div className="flex flex-col gap-2">
          {stationData.map((station) => (
            <div
              key={station.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <station.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-card-foreground">
                    {station.role === "Teacher Desk" ? "교사용 데스크" : station.role === "Team 1" ? "1팀" : "2팀"}
                  </p>
                  <p className="text-xs text-muted-foreground">{station.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {station.connectionStatus === "Connected" ? (
                  <Wifi className="h-4 w-4 text-chart-2" />
                ) : (
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={`text-xs font-medium ${station.connectionStatus === "Connected" ? "text-chart-2" : "text-muted-foreground"}`}>
                  {station.connectionStatus === "Connected" ? "참여 중" : "대기 중"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" className="gap-2" onClick={() => setInviteSent(true)}>
          <Send className="h-4 w-4" />
          {inviteSent ? "초대 전송 완료" : "초대 전송"}
        </Button>
        <Button className="gap-2" disabled={!requiredConnected || !speakingOrderReady} onClick={onStart}>
          <Play className="h-4 w-4" />
          토론 시작
        </Button>
      </div>
      {(!requiredConnected || !speakingOrderReady) && (
        <p className="text-xs text-muted-foreground">
          시작 조건: 최소 2개 스테이션 연결 및 발언 순서 설정 필요
        </p>
      )}
    </div>
  )
}

