# ClassFlow 상태 전이 정의 (코드 기준 v3)

## 기준
- Verified Date: 2026-03-06
- 실제 구현 파일:
- `lib/mock-data.ts`
- `hooks/use-session-flow.ts`
- `hooks/station/use-station-entry-flow.ts`
- `lib/domain/session/index.ts`
- `app/station/page.tsx`
- `components/session/session-detail-page-content.tsx`

## 1) Session 상태 전이

### 상태 집합
- `Pending`
- `Live`
- `Ended`

### 전이
| 현재 | 이벤트 | 다음 | 비고 |
|---|---|---|---|
| 생성 | 세션 생성 | `Pending` | 기본값 |
| `Pending` | 세션 시작 | `Live` | Teacher/Station 가능 |
| `Live` | 세션 종료 | `Ended` | Teacher/Station 가능 |
| `Pending` | 세션 종료 | `Ended` | setter가 범용이라 코드상 가능 |

## 2) Debate 런타임 상태 전이

### 상태 필드
- `phase`
- `currentSpeakerIndex`
- `isSpeechRunning`
- `finalSpeechCompleted`

### Ordered 모드
| 조건 | 결과 |
|---|---|
| 같은 phase에서 다음 발언자 존재 | `currentSpeakerIndex + 1` |
| 마지막 발언자이고 다음 phase 존재 | 다음 phase로 이동, speaker=0 |
| `FinalSummary` 마지막 발언자 종료 | `finalSpeechCompleted = true` |

### Free 모드
- phase/speaker 완주 조건 강제 없음
- `canEndDebate()`는 speaker 수가 있으면 종료 가능 반환

## 3) Station Entry 상태 전이

### 상태 집합
- `landing`
- `identity`
- `group`
- `waiting`
- `live`

### 전이
| 현재 | 이벤트 | 다음 |
|---|---|---|
| `landing` | 입장 버튼 | `identity` |
| `identity` | 학생 선택 후 다음 | `group` |
| `group` | 조 선택 | `waiting` |
| `waiting` | 배치 완료 | `live` |
| `live` | 종료/완료 | `/station/report` 라우팅 |

## 4) Report view 전이

### 상태 집합
- `report`
- `manage`

### 규칙
- `source=station`이면 `report` 강제
- 그 외에는 query `view=report/manage`로 전환

## 5) 저장/복구
- 세션 데이터: localStorage 저장
- 토론 런타임 상태: 메모리 상태, 새로고침 시 초기화
- 토론 녹음 대상 목록: 세션의 `debate.assignmentConfig.recordingStudentIds`에 저장

## 6) Debate Recording Rule
- 녹음 대상 목록이 비어 있으면 모든 참여자 기록 가능
- 녹음 대상 목록이 있으면 목록에 포함된 참여자만 기록 가능
- 비대상 참여자는 Station live에서 기록 제한 UI를 보게 됨
