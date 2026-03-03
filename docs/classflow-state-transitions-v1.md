# ClassFlow 상태 전이 정의 (v1.0)

## 1. Session 상태 (Debate)

| 현재 상태 | 이벤트 | 다음 상태 | 조건 | 실행 주체 |
|---|---|---|---|---|
| `draft` | 설정 검증 완료 | `ready` | 팀/슬롯/라운드 필수값 존재 | Teacher |
| `ready` | 시작 | `live` | 입장 조건 충족 또는 `force_start=true` | Teacher |
| `live` | 일시정지 | `paused` | 없음 | Teacher |
| `paused` | 재개 | `live` | 없음 | Teacher |
| `live`/`paused` | 종료 | `ended` | 없음 | Teacher |
| `ended` | 재오픈 요청 | `ended` | 세션 상태는 유지, record window만 재오픈 | Teacher |

입장 조건:
- desk 역할 `active` 1개 이상.
- 활성 team 수만큼 `team:*` 역할 `active` 1개 이상.

## 2. Session 상태 (Presentation)

| 현재 상태 | 이벤트 | 다음 상태 | 조건 | 실행 주체 |
|---|---|---|---|---|
| `draft` | 설정 검증 완료 | `ready` | 발표자 목록 1명 이상 | Teacher |
| `ready` | 시작 | `live` | 없음 | Teacher |
| `live` | 다음/이전 발표자 이동 | `live` | 순서 내 이동 | Teacher |
| `live` | 종료 | `ended` | 없음 | Teacher |

발표자별 집계 상태:
- `completed`: 동의 + 발표 완료
- `incomplete`: 동의 + 발표 미완료
- `consent_skipped`: 미동의

## 3. Station Presence 상태

| 현재 상태 | 이벤트 | 다음 상태 | 조건 |
|---|---|---|---|
| `joined` | heartbeat 수신 | `active` | heartbeat 정상 |
| `active` | 동일 역할 충돌 감지 | `readonly` | 최근 heartbeat 기기 아님 |
| `readonly` | 교사 재배정/재승인 | `active` | 역할 재확정 |
| `active`/`readonly` | 연결 종료 | `left` | timeout 또는 수동 퇴장 |

충돌 규칙:
- 같은 역할로 다중 기기 입장 시 최신 heartbeat 기기 1대만 `active`.

## 4. Record Window 상태

| 현재 상태 | 이벤트 | 다음 상태 | 조건 |
|---|---|---|---|
| `closed` | 라운드 종료 | `open` | 기본 60초 시작 |
| `open` | 타이머 만료 | `locked` | 자동 잠금 |
| `open` | 조기 잠금 | `locked` | Teacher 수동 |
| `locked` | 교사 재오픈 | `open` | 최대 120초, 사유 기록 |
| `open` | 세션 종료 | `locked` | 즉시 잠금 |

## 5. RecordEvent 상태

| 현재 상태 | 이벤트 | 다음 상태 | 조건 |
|---|---|---|---|
| `created` | 3초 내 되돌리기 | `undone` | 작성 스테이션 동일 |
| `created` | 교사 무효 처리 | `invalidated` | 사유 입력 |
| `created` | 확정 | `effective` | 잠금 또는 승인 시 |
| `invalidated` | 무효 해제 | `effective` | Teacher만 |

제약:
- 라운드당 팀별 최대 6건.
- `locked` 상태에서 team_station 신규 생성 불가.

## 6. SpecialBundle 상태

| 현재 상태 | 이벤트 | 다음 상태 | 조건 |
|---|---|---|---|
| `draft` | 자동 추천 생성 | `draft` | Primary 3~5건 |
| `draft` | 교사 수정 저장 | `draft` | 이벤트 선택 변경 |
| `draft` | 최종 확정 | `finalized` | Teacher 명시 확정 |
| `finalized` | 재편집 | `draft` | Teacher 재오픈 |

## 7. 권한 매트릭스 요약
- Teacher:
  - 세션 상태 전이 전부 가능.
  - record window 재오픈/무효 처리/강제 시작 가능.
- Desk Station:
  - 읽기/모니터링만.
- Team Station:
  - `open` 구간에서 자기 팀 이벤트 생성/3초 되돌리기만 가능.

## 8. 감사 로그 필수 이벤트
- `session.force_started`
- `session.paused`
- `session.resumed`
- `session.ended`
- `record_window.reopened`
- `record_event.invalidated`
- `station.role_reassigned`
