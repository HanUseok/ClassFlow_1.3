export type SessionType = "Debate" | "Presentation"
export type SessionStatus = "Live" | "Ended" | "Pending"
export type StationRole = "Teacher Desk" | "Team 1" | "Team 2"
export type StationConnectionStatus = "Connected" | "Waiting"
export type DebatePhase = "Preparation" | "Opening" | "Rebuttal" | "Closing" | "Voting"
export type SpeechType = "Claim" | "Rebuttal" | "Question"

export interface Student {
  id: string
  name: string
  classId: string
  className: string
}

export interface ClassGroup {
  id: string
  name: string
  students: Student[]
}

export interface Session {
  id: string
  title: string
  topic?: string
  type: SessionType
  status: SessionStatus
  date: string
  classId: string
  className: string
  teams?: {
    team1: Student[]
    team2: Student[]
  }
  debate?: {
    argumentCards?: {
      id: string
      title: string
      claim: string
      evidenceHint?: string
      side?: "affirmative" | "negative" | "neutral"
      enabled: boolean
    }[]
    mode?: "Ordered" | "Free"
    teacherGuided?: boolean
    orderedFlow?: {
      stages: {
        id: "opening" | "crossQuestion" | "rebuttal" | "surrebuttal" | "closing"
        label: string
        enabled: boolean
        minutes: number
      }[]
    }
    membersPerGroup: 4 | 6
    moderators: Student[]
    groups: {
      id: string
      affirmative: Student[]
      negative: Student[]
      moderator?: Student
    }[]
    assignmentConfig?: {
      groupCount: number
      affirmativeSlots: number
      negativeSlots: number
      moderatorSlots: number
      selectedStudentIds?: string[]
      groupAssignments?: Record<
        string,
        {
          affirmative: (string | null)[]
          negative: (string | null)[]
          moderator: (string | null)[]
        }
      >
      groupSlotAdjust?: Record<
        string,
        {
          affirmative: number
          negative: number
          moderator: number
        }
      >
    }
  }
  presentation?: {
    presenters: {
      student: Student
      recordingEnabled: boolean
    }[]
    secondsPerPresenter: number
  }
}

export interface Station {
  id: string
  name: string
  role: StationRole
  connectionStatus: StationConnectionStatus
}

export interface DebateEvent {
  id: string
  sessionId: string
  round: number
  studentId: string
  studentName: string
  team: "Team 1" | "Team 2"
  speechType: SpeechType
  note?: string
  timestamp: string
  approved: boolean
}

export const classes: ClassGroup[] = [
  {
    id: "class-1",
    name: "1학년 3반",
    students: [
      { id: "s1", name: "김민준", classId: "class-1", className: "1학년 3반" },
      { id: "s2", name: "이서준", classId: "class-1", className: "1학년 3반" },
      { id: "s3", name: "박지호", classId: "class-1", className: "1학년 3반" },
      { id: "s4", name: "최도윤", classId: "class-1", className: "1학년 3반" },
      { id: "s5", name: "정예준", classId: "class-1", className: "1학년 3반" },
      { id: "s6", name: "한지우", classId: "class-1", className: "1학년 3반" },
    ],
  },
  {
    id: "class-2",
    name: "1학년 4반",
    students: [
      { id: "s7", name: "강서윤", classId: "class-2", className: "1학년 4반" },
      { id: "s8", name: "윤하은", classId: "class-2", className: "1학년 4반" },
      { id: "s9", name: "임수아", classId: "class-2", className: "1학년 4반" },
      { id: "s10", name: "오지민", classId: "class-2", className: "1학년 4반" },
      { id: "s11", name: "신유나", classId: "class-2", className: "1학년 4반" },
      { id: "s12", name: "조현우", classId: "class-2", className: "1학년 4반" },
    ],
  },
  {
    id: "class-3",
    name: "1학년 5반",
    students: [
      { id: "s13", name: "문서현", classId: "class-3", className: "1학년 5반" },
      { id: "s14", name: "백시우", classId: "class-3", className: "1학년 5반" },
      { id: "s15", name: "송도현", classId: "class-3", className: "1학년 5반" },
      { id: "s16", name: "유채린", classId: "class-3", className: "1학년 5반" },
    ],
  },
]

export const allStudents: Student[] = classes.flatMap((c) => c.students)

export const sessions: Session[] = [
  {
    id: "sess-1",
    title: "기후 변화 정책",
    topic: "정부는 기후 행동보다 경제 성장을 우선해야 하는가?",
    type: "Debate",
    status: "Live",
    date: "2026-02-26",
    classId: "class-1",
    className: "1학년 3반",
    teams: {
      team1: [allStudents[0], allStudents[1], allStudents[2]],
      team2: [allStudents[3], allStudents[4], allStudents[5]],
    },
  },
  {
    id: "sess-2",
    title: "교육에서의 AI",
    topic: "AI가 기존의 전통적 교수법을 대체해야 하는가?",
    type: "Debate",
    status: "Ended",
    date: "2026-02-24",
    classId: "class-2",
    className: "1학년 4반",
    teams: {
      team1: [allStudents[6], allStudents[7], allStudents[8]],
      team2: [allStudents[9], allStudents[10], allStudents[11]],
    },
  },
  {
    id: "sess-3",
    title: "우주 탐사 제안 발표",
    type: "Presentation",
    status: "Ended",
    date: "2026-02-20",
    classId: "class-1",
    className: "1학년 3반",
  },
  {
    id: "sess-4",
    title: "재생 가능 에너지원",
    topic: "원자력은 화석 연료를 대체할 최선의 대안인가?",
    type: "Debate",
    status: "Pending",
    date: "2026-02-28",
    classId: "class-3",
    className: "1학년 5반",
    teams: {
      team1: [allStudents[12], allStudents[13]],
      team2: [allStudents[14], allStudents[15]],
    },
  },
  {
    id: "sess-5",
    title: "역사 다큐멘터리 리뷰",
    type: "Presentation",
    status: "Ended",
    date: "2026-02-18",
    classId: "class-2",
    className: "1학년 4반",
  },
  {
    id: "sess-6",
    title: "스마트 시티 토론",
    topic: "도시 데이터 수집은 공공안전을 위해 확대되어야 하는가?",
    type: "Debate",
    status: "Ended",
    date: "2026-03-02",
    classId: "class-1",
    className: "1학년 3반",
    teams: {
      team1: [allStudents[0], allStudents[2], allStudents[4]],
      team2: [allStudents[1], allStudents[3], allStudents[5]],
    },
  },
  {
    id: "sess-7",
    title: "기술 윤리 발표",
    type: "Presentation",
    status: "Live",
    date: "2026-03-01",
    classId: "class-2",
    className: "1학년 4반",
  },
  {
    id: "sess-8",
    title: "해양 플라스틱 해결책",
    topic: "일회용 플라스틱 규제를 강화해야 하는가?",
    type: "Debate",
    status: "Pending",
    date: "2026-03-04",
    classId: "class-3",
    className: "1학년 5반",
    teams: {
      team1: [allStudents[12], allStudents[14]],
      team2: [allStudents[13], allStudents[15]],
    },
  },
  {
    id: "sess-9",
    title: "지역 문화유산 발표",
    type: "Presentation",
    status: "Ended",
    date: "2026-02-27",
    classId: "class-1",
    className: "1학년 3반",
  },
]

export const stations: Station[] = [
  { id: "st-1", name: "스테이션 알파", role: "Teacher Desk", connectionStatus: "Connected" },
  { id: "st-2", name: "스테이션 베타", role: "Team 1", connectionStatus: "Connected" },
  { id: "st-3", name: "스테이션 감마", role: "Team 2", connectionStatus: "Waiting" },
]

const seedDebateEvents: DebateEvent[] = [
  {
    id: "evt-1",
    sessionId: "sess-2",
    round: 1,
    studentId: "s7",
    studentName: "강서윤",
    team: "Team 1",
    speechType: "Claim",
    note: "AI가 학습 경로를 효과적으로 개인화할 수 있다고 주장함.",
    timestamp: "2026-02-24T10:05:00",
    approved: true,
  },
  {
    id: "evt-2",
    sessionId: "sess-2",
    round: 1,
    studentId: "s10",
    studentName: "오지민",
    team: "Team 2",
    speechType: "Rebuttal",
    note: "AI는 교육에 필요한 정서적 이해가 부족하다고 반박함.",
    timestamp: "2026-02-24T10:08:00",
    approved: true,
  },
  {
    id: "evt-3",
    sessionId: "sess-2",
    round: 1,
    studentId: "s8",
    studentName: "윤하은",
    team: "Team 1",
    speechType: "Question",
    note: "학교에서 AI 도입 비용에 대해 질문함.",
    timestamp: "2026-02-24T10:10:00",
    approved: false,
  },
  {
    id: "evt-4",
    sessionId: "sess-2",
    round: 2,
    studentId: "s11",
    studentName: "신유나",
    team: "Team 2",
    speechType: "Claim",
    note: "교사-학생 관계에 관한 데이터를 제시함.",
    timestamp: "2026-02-24T10:15:00",
    approved: true,
  },
  {
    id: "evt-5",
    sessionId: "sess-2",
    round: 2,
    studentId: "s9",
    studentName: "임수아",
    team: "Team 1",
    speechType: "Rebuttal",
    timestamp: "2026-02-24T10:18:00",
    approved: false,
  },
  {
    id: "evt-6",
    sessionId: "sess-1",
    round: 1,
    studentId: "s1",
    studentName: "김민준",
    team: "Team 1",
    speechType: "Claim",
    note: "경제적 영향 데이터를 근거로 발언을 시작함.",
    timestamp: "2026-02-26T09:05:00",
    approved: true,
  },
  {
    id: "evt-7",
    sessionId: "sess-1",
    round: 1,
    studentId: "s4",
    studentName: "최도윤",
    team: "Team 2",
    speechType: "Rebuttal",
    note: "장기적인 환경 비용 분석으로 반박함.",
    timestamp: "2026-02-26T09:08:00",
    approved: true,
  },
]

function buildSupplementalDebateEvents(existingEvents: DebateEvent[]): DebateEvent[] {
  const existingStudentIds = new Set(existingEvents.map((event) => event.studentId))
  const speechPatterns: SpeechType[][] = [
    ["Question", "Claim"],
    ["Rebuttal", "Question"],
    ["Claim", "Question"],
  ]
  const sessionCycleByClass: Record<string, string[]> = {
    "class-1": ["sess-1", "sess-3"], // 토론 + 발표
    "class-2": ["sess-2", "sess-5"], // 토론 + 발표
  }

  // MVP rule:
  // - class-3 학생 4명은 근거 0 상태를 유지
  // - 그 외 근거 없는 학생은 규칙 기반으로 1~2개 근거를 자동 보강
  const targets = allStudents.filter(
    (student) => student.classId !== "class-3" && !existingStudentIds.has(student.id)
  )

  return targets.flatMap((student) => {
    const numericId = Number.parseInt(student.id.replace("s", ""), 10)
    const evidenceCount = numericId % 3 === 0 ? 2 : 1
    const sessionChoices = sessionCycleByClass[student.classId] ?? ["sess-1"]

    return Array.from({ length: evidenceCount }, (_, index) => {
      const speechType = speechPatterns[numericId % speechPatterns.length][index % 2]
      const sessionId = sessionChoices[(numericId + index) % sessionChoices.length]
      const team = numericId % 2 === 0 ? "Team 2" : "Team 1"
      const round = ((numericId + index) % 2) + 1
      const hh = sessionId === "sess-1" || sessionId === "sess-3" ? "09" : "10"
      const mm = String(20 + numericId + index * 3).padStart(2, "0")
      const datePrefix = sessionId === "sess-1" || sessionId === "sess-3" ? "2026-02-26" : "2026-02-24"

      const noteBank = [
        {
          Claim: "핵심 주장과 근거 데이터를 구조화해 설명함.",
          Rebuttal: "상대 주장의 한계 조건을 짚고 반례를 제시함.",
          Question: "주장의 타당성과 적용 범위를 질문으로 확인함.",
        },
        {
          Claim: "진로·전공 관점에서 주장 근거를 연결해 설명함.",
          Rebuttal: "직업/전공 맥락에서 반론의 실효성을 점검함.",
          Question: "진로 선택과 연결되는 기준을 질문으로 도출함.",
        },
        {
          Claim: "팀 협력 관점에서 역할 분담 근거를 제시함.",
          Rebuttal: "조별 토의 중 동료 의견을 경청하며 반박을 정리함.",
          Question: "팀 내 합의 형성을 위한 확인 질문을 제시함.",
        },
      ] as const
      const noteSet = noteBank[(numericId + index) % noteBank.length]

      return {
        id: `evt-auto-${student.id}-${index + 1}`,
        sessionId,
        round,
        studentId: student.id,
        studentName: student.name,
        team,
        speechType,
        note: `${student.name}: ${noteSet[speechType]}`,
        timestamp: `${datePrefix}T${hh}:${mm}:00`,
        approved: true,
      }
    })
  })
}

export const debateEvents: DebateEvent[] = [
  ...seedDebateEvents,
  ...buildSupplementalDebateEvents(seedDebateEvents),
]
