import { mockRosterRepository } from "@/lib/infrastructure/roster-repository"

const repository = mockRosterRepository

export function listClasses() {
  return repository.listClasses()
}

export function listStudents() {
  return repository.listStudents()
}

export function listStations() {
  return repository.listStations()
}

export function listDebateEvents() {
  return repository.listDebateEvents()
}

