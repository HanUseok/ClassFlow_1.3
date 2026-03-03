"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { Session, SessionStatus } from "@/lib/mock-data"
import {
  createSession,
  deleteAllSessions,
  deleteSession,
  getSession,
  listSessions,
  setSessionStatus,
  subscribeSessionChanges,
  updateSessionBasics,
  overwriteSessionFromInput,
  assignGroups,
  assignTeams,
  type CreateSessionInput,
  type UpdateSessionInput,
} from "@/lib/application/session-service"

export function useMockSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [hydrated, setHydrated] = useState(false)

  const refresh = useCallback(() => {
    setSessions(listSessions())
  }, [])

  useEffect(() => {
    refresh()
    setHydrated(true)
    return subscribeSessionChanges(refresh)
  }, [refresh])

  const create = useCallback((input: CreateSessionInput) => {
    return createSession(input)
  }, [])

  const setStatus = useCallback((sessionId: string, status: SessionStatus) => {
    return setSessionStatus(sessionId, status)
  }, [])

  const setTeams = useCallback((sessionId: string, teams: NonNullable<Session["teams"]>) => {
    return assignTeams(sessionId, teams)
  }, [])

  const setDebateGroups = useCallback((sessionId: string, groups: NonNullable<NonNullable<Session["debate"]>["groups"]>) => {
    return assignGroups(sessionId, groups)
  }, [])

  const update = useCallback((sessionId: string, input: UpdateSessionInput) => {
    return updateSessionBasics(sessionId, input)
  }, [])

  const overwrite = useCallback((sessionId: string, input: CreateSessionInput) => {
    return overwriteSessionFromInput(sessionId, input)
  }, [])

  const remove = useCallback((sessionId: string) => {
    return deleteSession(sessionId)
  }, [])

  const removeAll = useCallback(() => {
    deleteAllSessions()
  }, [])

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [sessions]
  )

  return {
    hydrated,
    sessions: sortedSessions,
    refresh,
    create,
    setStatus,
    update,
    overwrite,
    remove,
    removeAll,
    setTeams,
    setDebateGroups,
    getById: (sessionId: string) => getSession(sessionId),
  }
}
