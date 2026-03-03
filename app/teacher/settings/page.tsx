"use client"

import { useState } from "react"
import { listClasses, listStations } from "@/lib/application/roster-service"
import type { StationRole } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, Trash2, Users, Monitor } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">설정</h1>

      <Tabs defaultValue="roster">
        <TabsList>
          <TabsTrigger value="roster" className="gap-2">
            <Users className="h-3.5 w-3.5" />
            명단 관리
          </TabsTrigger>
          <TabsTrigger value="stations" className="gap-2">
            <Monitor className="h-3.5 w-3.5" />
            스테이션 관리
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="mt-6">
          <RosterManagement />
        </TabsContent>

        <TabsContent value="stations" className="mt-6">
          <StationManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RosterManagement() {
  const classes = listClasses()
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          학급
        </h2>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-3.5 w-3.5" />
          CSV 업로드
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="rounded-lg border border-border bg-card"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-card-foreground">
                  {cls.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {cls.students.length}명
                </span>
              </div>
            </div>
            <div className="divide-y divide-border">
              {cls.students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <span className="text-sm text-card-foreground">{student.name}</span>
                  <span className="text-xs text-muted-foreground">{student.id}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StationManagement() {
  const [stationList, setStationList] = useState(listStations())

  const handleRoleChange = (stationId: string, newRole: StationRole) => {
    setStationList((prev) =>
      prev.map((s) => (s.id === stationId ? { ...s, role: newRole } : s))
    )
  }

  const handleDelete = (stationId: string) => {
    setStationList((prev) => prev.filter((s) => s.id !== stationId))
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        등록된 스테이션
      </h2>

      {stationList.length > 0 ? (
        <div className="flex flex-col gap-2">
          {stationList.map((station) => (
            <div
              key={station.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-card-foreground">
                    {station.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {station.connectionStatus === "Connected" ? "연결됨" : "대기 중"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={station.role}
                  onValueChange={(val) =>
                    handleRoleChange(station.id, val as StationRole)
                  }
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Teacher Desk">교사용 데스크</SelectItem>
                    <SelectItem value="Team 1">1팀</SelectItem>
                    <SelectItem value="Team 2">2팀</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(station.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">스테이션 삭제</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">
            등록된 스테이션이 없습니다.
          </p>
        </div>
      )}
    </div>
  )
}
