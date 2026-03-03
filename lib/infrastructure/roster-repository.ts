import { allStudents, classes, debateEvents, stations } from "@/lib/mock-data"

export const mockRosterRepository = {
  listClasses: () => classes,
  listStudents: () => allStudents,
  listStations: () => stations,
  listDebateEvents: () => debateEvents,
}

