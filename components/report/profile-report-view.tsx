"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

export type ProfileReportSection = {
  title: string
  items: Array<{
    label: string
    value: string
  }>
}

export type ProfileReportProfile = {
  id: string
  name: string
  subtitle?: string
  summary?: string
  sections: ProfileReportSection[]
}

export function ProfileReportView({
  profiles,
  emptyMessage,
}: {
  profiles: ProfileReportProfile[]
  emptyMessage: string
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  if (profiles.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="mb-3 text-sm font-semibold text-foreground">레포트</p>
      <div className="flex flex-col gap-2">
        {profiles.map((profile) => {
          const open = openIds.has(profile.id)
          return (
            <div key={profile.id} className="rounded-lg border border-border/70 bg-background">
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start px-3 py-3"
                onClick={() =>
                  setOpenIds((prev) => {
                    const next = new Set(prev)
                    if (next.has(profile.id)) next.delete(profile.id)
                    else next.add(profile.id)
                    return next
                  })
                }
              >
                <div className="flex w-full items-center gap-3 text-left">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{profile.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{profile.name}</p>
                    {profile.subtitle ? <p className="truncate text-xs text-muted-foreground">{profile.subtitle}</p> : null}
                  </div>
                  {open ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </Button>

              {open ? (
                <div className="border-t border-border px-4 py-4">
                  <div className="mb-5 flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{profile.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{profile.name}</p>
                      {profile.subtitle ? <p className="text-sm text-muted-foreground">{profile.subtitle}</p> : null}
                      {profile.summary ? <p className="mt-1 text-xs text-muted-foreground">{profile.summary}</p> : null}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {profile.sections.map((section) => (
                      <section key={section.title} className="rounded-lg border border-border/70 bg-card p-4">
                        <p className="mb-3 text-sm font-semibold text-foreground">{section.title}</p>
                        <div className="grid gap-3 md:grid-cols-2">
                          {section.items.map((item) => (
                            <div
                              key={`${section.title}-${item.label}`}
                              className="rounded-md border border-border/60 bg-background px-3 py-2"
                            >
                              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                              <p className="mt-1 text-sm text-foreground">{item.value || "-"}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
