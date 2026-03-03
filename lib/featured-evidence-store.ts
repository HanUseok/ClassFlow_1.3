const STORAGE_KEY = "classflow.representative.v1"
const STORE_EVENT = "classflow:featured-evidence:changed"

export type FeaturedEvidenceMap = Record<string, string[]>

const DEFAULT_FEATURED_EVIDENCE: FeaturedEvidenceMap = {
  s1: ["evt-6"],
  s7: ["evt-1"],
  s10: ["evt-2"],
}

function normalize(value: unknown): FeaturedEvidenceMap {
  if (!value || typeof value !== "object") return {}

  const entries = Object.entries(value as Record<string, unknown>)
  const next: FeaturedEvidenceMap = {}

  for (const [studentId, eventIds] of entries) {
    if (!Array.isArray(eventIds)) continue
    next[studentId] = Array.from(new Set(eventIds.filter((id): id is string => typeof id === "string")))
  }

  return next
}

export function readFeaturedEvidenceMap(): FeaturedEvidenceMap {
  if (typeof window === "undefined") return {}
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FEATURED_EVIDENCE))
    return DEFAULT_FEATURED_EVIDENCE
  }

  try {
    return normalize(JSON.parse(raw))
  } catch {
    return {}
  }
}

function writeFeaturedEvidenceMap(next: FeaturedEvidenceMap) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(STORE_EVENT))
}

export function toggleFeaturedEvidence(studentId: string, eventId: string): string[] {
  const current = readFeaturedEvidenceMap()
  const currentIds = current[studentId] ?? []
  const hasEvent = currentIds.includes(eventId)
  const nextIds = hasEvent ? currentIds.filter((id) => id !== eventId) : [...currentIds, eventId]

  const next: FeaturedEvidenceMap = {
    ...current,
    [studentId]: nextIds,
  }

  if (nextIds.length === 0) {
    delete next[studentId]
  }

  writeFeaturedEvidenceMap(next)
  return nextIds
}

export function subscribeFeaturedEvidence(listener: () => void) {
  if (typeof window === "undefined") return () => {}

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener()
  }

  window.addEventListener(STORE_EVENT, listener)
  window.addEventListener("storage", onStorage)

  return () => {
    window.removeEventListener(STORE_EVENT, listener)
    window.removeEventListener("storage", onStorage)
  }
}
