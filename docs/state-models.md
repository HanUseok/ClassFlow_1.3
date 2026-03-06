# State Models (현재 구현 기준)

## Scan Basis
- Verified Date: 2026-03-06
- 핵심 파일:
- `lib/mock-data.ts`
- `lib/mock-session-store.ts`
- `hooks/use-mock-sessions.ts`
- `hooks/use-session-flow.ts`
- `hooks/station/use-station-entry-flow.ts`
- `app/station/page.tsx`

## 1) Session Status Model

### 상태 집합
- `Pending`
- `Live`
- `Ended`

### 생성 기본값
- 세션 생성 시 항상 `Pending`

### 전이 트리거
| From | To | Trigger |
|---|---|---|
| `Pending` | `Live` | 세션 시작 (Teacher/Station) |
| `Live` | `Ended` | 세션 종료 (Teacher/Station) |
| `Pending` | `Ended` | 상태 setter 직접 호출 시 가능 |

### 상태 기반 라우팅 (`/teacher/sessions`)
- `Pending` -> `/teacher/sessions/create?sessionId=...`
- `Live` -> `/teacher/sessions/{id}`
- `Ended` -> `/teacher/sessions/{id}/report`

## 2) Debate Runtime State Model

### Debate Mode
- `Ordered` / `Free`

### Ordered Phase
- 순서: `Opening` -> `Rebuttal` -> `Rerebuttal` -> `FinalSummary`
- 종료 조건: 마지막 phase + 마지막 speaker 종료 후 `finalSpeechCompleted = true`

### Group Runtime State (`useSessionFlow`)
- `phase`
- `currentSpeakerIndex`
- `isSpeechRunning`
- `finalSpeechCompleted`

## 3) Session Creation State Model

### Debate 단계
- `setup`
- `headcount`
- `cards`
- 단, 선택 학생 전원이 녹음 대상이면 `cards` 단계를 생략하고 `headcount`에서 바로 생성 가능

### 생성 가능 조건
- Debate: `orderedFlowValid && cardsReady && hasEnoughSlots`
- Presentation: `selectedCount > 0 && presentationMinutesPerStudent > 0`

### Guided 규칙
- `guided`면 `group-1`의 진행자 첫 슬롯은 교사 진행자 고정 처리

## 4) Station Entry / Live State

### 상태 집합 (`useStationEntryFlow`)
- `landing`
- `identity`
- `group`
- `waiting`
- `live`

### 전이
- `landing -> identity` (입장)
- `identity -> group` (학생 선택)
- `group -> waiting` (조 선택)
- `waiting -> live` (배치 완료)
- `live -> /station/report?...&source=station` (종료/완료)

## 5) Station Report View State
- query: `view=report | manage`
- `source=station`이면 `report` 강제

## 6) Persistence Model
- 세션 목록/기본 정보: localStorage 저장
- 토론 런타임(phase/index/running): 메모리 상태 (새로고침 복구 없음)
- featured evidence: 별도 store 구독 기반
- 토론 녹음 대상: `debate.assignmentConfig.recordingStudentIds`에 저장

## 7) Empty/Error States
- 세션 없음: 상세/스테이션에서 안내 메시지
- 학생 없음: `/teacher/students/[id]`에서 `notFound()`
- 리포트 query JSON 파싱 실패: fallback 처리
