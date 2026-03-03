# State Models (UX)

## Scan Basis
- Command:
  - `rg -n "status|Pending|Live|Ended|setStatus|updateStatus|debateMode|teacherGuided" app components hooks lib tests -g "*.ts" -g "*.tsx"`
- Core files:
  - `lib/mock-data.ts`
  - `lib/mock-session-store.ts`
  - `hooks/use-mock-sessions.ts`
  - `components/session/session-detail-page-content.tsx`
  - `app/station/page.tsx`

---

## 1) Session Status Model

### Status Set
- `Pending`
- `Live`
- `Ended`

### Creation Default
- 새 세션 생성 시 상태는 `Pending`으로 시작
  - Source: `lib/mock-session-store.ts` (`createSession`)

### UX Labels (표시 텍스트)
- 목록/배지에서 상태별 라벨 노출
  - `Pending` = 준비됨/대기
  - `Live` = 진행중/진행 중
  - `Ended` = 완료/종료
  - Source: `app/teacher/sessions/page.tsx`, `components/status-badge.tsx`

### Status Transition Triggers
| From | To | Trigger (UX Action) | Source |
|---|---|---|---|
| `Pending` | `Live` | 토론 시작 버튼, 발언 시작 시 자동 전환, 발표 시작 | `components/session/session-detail-page-content.tsx`, `components/session/debate-group-panel.tsx`, `components/session/presentation-view.tsx` |
| `Live` | `Ended` | 토론 종료, 스테이션 종료, 발표 마지막 종료 | `components/session/session-detail-page-content.tsx`, `app/station/page.tsx`, `components/session/presentation-view.tsx` |
| `Pending` | `Ended` | UI에서 직접 차단 없음(종료 트리거가 호출되면 가능) | `setStatus`가 범용 setter로 노출됨 |

### Status-Driven Route Branching
- Teacher 세션 목록 상세 버튼 분기:
  - `Pending` → `/teacher/sessions/create?sessionId=...`
  - `Live` → `/teacher/sessions/{id}`
  - `Ended` → `/teacher/sessions/{id}/report`
  - Source: `app/teacher/sessions/page.tsx`

### Status-Driven UI Branching
- Session Detail:
  - `Ended`면 토론 관리 조작 비활성/읽기 전용 안내
  - Source: `components/session/session-detail-page-content.tsx`
- Presentation View:
  - `Pending`: 시작 화면
  - `Live`: 타이머 진행 화면
  - `Ended`: AI 키워드 요약 테이블
  - Source: `components/session/presentation-view.tsx`

---

## 2) Debate Runtime State Model

### Debate Mode
- `Ordered` / `Free`
- 영향:
  - `Free`: 즉시 종료 가능, 자유토론 UI/리포트 컬럼 사용
  - `Ordered`: 단계+발언자 순차 진행 후 종료
  - Source: `lib/domain/session/index.ts`, `components/station/live-debate-screen.tsx`

### Ordered Phase State
- Phase 순서:
  - `Opening` → `Rebuttal` → `Rerebuttal` → `FinalSummary`
- 종료 조건:
  - 마지막 단계 + 마지막 발언자 도달 시 `finalSpeechCompleted=true`
- 종료 가능 함수:
  - `Free`는 즉시 종료 가능
  - `Ordered`는 `finalSpeechCompleted=true`일 때만 종료 가능
  - Source: `lib/domain/session/index.ts`

### Group Runtime Local State (세션 상세/스테이션)
- `phase`
- `currentSpeakerIndex`
- `isSpeechRunning`
- `finalSpeechCompleted`
- 저장 위치:
  - 컴포넌트 메모리 상태 (`useSessionFlow`)
  - 페이지 새로고침 시 초기화
  - Source: `hooks/use-session-flow.ts`

---

## 3) Session Creation Flow State Model

### Create Step (Debate)
- `roster` → `arrange` → `cards`
- 이동 조건:
  - `arrange` 진입: 학급 선택 + 학생 1명 이상
  - `cards` 진입: 배치 완료 조건(`debateReady`)
  - Source: `components/session/create-session-page-content.tsx`

### Debate Ready Condition
- 선택 학생 수 > 0
- 선택 학생 전원이 배치 완료 (`assignedIds.size === selectedCount`)
- Source: `hooks/use-debate-assignment.ts`

### Cards Ready Condition
- 활성(`enabled`) 카드 중 제목/주장 입력 완료 카드가 3개 이상
- Source: `hooks/use-debate-cards.ts`

### Teacher Guided Mode Impact
- `guided`면 `group-1` 진행자 슬롯 1칸은 교사 고정 슬롯 처리
- Source: `lib/domain/session/debate-assignment.ts`, `components/session/create-session-page-content.tsx`

---

## 4) Station/Report View State

### Station Page View State
- `waiting` / `live`
- `waiting`에서 `입장` 클릭 시 `live`
- Source: `app/station/page.tsx`

### Station Report View State (Query)
- `view=report` / `view=manage`
- 단, `source=station`이면 강제로 `report` 사용
- Source: `app/station/report/page.tsx`

---

## 5) Persistence / Refresh Behavior
- 세션 데이터는 `localStorage(classflow.mock.sessions.v1)`에 저장됨.
- 새로고침 후 세션/목록/상태는 복원됨.
- 단, 토론 진행 중 런타임 상태(현재 발언자/타이머/패널 open 등)는 메모리 상태로 새로고침 시 초기화.
- Source: `lib/mock-session-store.ts`, `hooks/use-mock-sessions.ts`, `hooks/use-session-flow.ts`

---

## 6) Empty / Error / Exception States (State 관점)
- 세션 없음:
  - `/teacher/sessions/{id}`에서 "세션을 찾을 수 없습니다."
  - `/station`에서 "진행 가능한 토론 세션이 없습니다."
- 학생 없음:
  - `/teacher/students/{id}`는 `notFound()` 처리
- 리포트 데이터 파싱 실패:
  - `/station/report`에서 logs/groupLayout JSON 파싱 실패 시 빈 데이터 fallback
- 로딩:
  - `useMockSessions().hydrated` 전에는 각 페이지에서 로딩 메시지 노출
