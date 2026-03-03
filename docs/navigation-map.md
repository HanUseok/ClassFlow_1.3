# Navigation Map (From → To)

## Scan Basis
- Command:
  - `rg -n "href=|router\\.push|router\\.replace|router\\.back|redirect\\(" app components hooks lib -g "*.ts" -g "*.tsx"`
- Date: 2026-03-03
- Rule: 실제 코드에서 확인된 이동만 기록

## Global / Automatic
| From | To | Trigger | Condition |
|---|---|---|---|
| `/` | `/teacher` | 자동 리다이렉트 (`redirect`) | 항상 |
| `Any /teacher/*` | `/teacher` | 상단 로고 클릭 | 항상 |
| `Any /teacher/*` | `/teacher`, `/teacher/sessions`, `/teacher/students`, `/teacher/settings` | 상단 네비 메뉴 클릭 | 항상 |

## Teacher Dashboard (`/teacher`)
| From | To | Trigger | Condition |
|---|---|---|---|
| `/teacher` | `/teacher/sessions/create?type=debate` | 빠른 시작 버튼(토론 세션) | 항상 |
| `/teacher` | `/teacher/sessions/create?type=presentation` | 빠른 시작 버튼(발표 세션) | 항상 |
| `/teacher` | `/teacher/sessions/create?sessionId={id}&type={debate/presentation}` | 대기 세션 카드의 수정 버튼 | 대기 세션(`Pending`) 목록에 존재 |
| `/teacher` | `/teacher/sessions/{id}` | 대기 세션 카드의 진입 버튼 | 대기 세션(`Pending`) 목록에 존재 |
| `/teacher` | `/teacher/sessions` | 최근 세션 섹션의 전체보기 링크 | 항상 |
| `/teacher` | `/teacher/sessions/{id}` | 최근 세션 카드 클릭 | 최근 세션 존재 |

## Session List (`/teacher/sessions`)
| From | To | Trigger | Condition |
|---|---|---|---|
| `/teacher/sessions` | `/teacher/sessions/create?type=presentation` | 발표 생성 버튼 | 항상 |
| `/teacher/sessions` | `/teacher/sessions/create?type=debate` | 토론 생성 버튼 | 항상 |
| `/teacher/sessions` | `/teacher/sessions/create?sessionId={id}&type={...}` | 목록 행의 `확인/수정` | 세션 상태 `Pending` |
| `/teacher/sessions` | `/teacher/sessions/{id}` | 목록 행의 `세션 진입` | 세션 상태 `Live` |
| `/teacher/sessions` | `/teacher/sessions/{id}/report` | 목록 행의 `레포트 확인` | 세션 상태 `Ended` |
| `/teacher/sessions` | (현재 페이지 유지) | `삭제` 버튼 | 확인창 `confirm=true`면 행 제거 |
| `/teacher/sessions` | (현재 페이지 유지) | `전체삭제` 버튼 | 확인창 `confirm=true`면 전체 제거 |

## Session Create/Edit (`/teacher/sessions/create`)
| From | To | Trigger | Condition |
|---|---|---|---|
| `/teacher/sessions/create` | 이전 페이지 | 상단 Back 버튼 (`router.back`) | 항상 |
| `/teacher/sessions/create` | `/teacher/sessions/{id}` | `세션 실행` 버튼 (`router.push`) | 입력 유효 + 생성/수정 성공 |
| `/teacher/sessions/create` | `/teacher/sessions` | `저장` 버튼 (`router.push`) | 입력 유효 후 저장 성공 |

## Session Detail (`/teacher/sessions/{id}`)
| From | To | Trigger | Condition |
|---|---|---|---|
| `/teacher/sessions/{id}` | `/teacher/sessions` | 상단 뒤로 링크 | 항상 |
| `/teacher/sessions/{id}` | `/teacher/sessions` | 세션 종료 후 읽기전용 안내의 버튼 | `Ended` 상태에서 표시 |
| `/teacher/sessions/{id}` | `/station/report?...` | 토론 종료 동작 후 `router.push(reportPath)` | 토론 세션 종료 트리거 |
| `/teacher/sessions/{id}` | `/teacher/sessions` | 세션 미존재 상태의 복귀 링크 | 세션 찾기 실패 |

## Teacher Report (`/teacher/sessions/{id}/report`)
| From | To | Trigger | Condition |
|---|---|---|---|
| `/teacher/sessions/{id}/report` | `/teacher/sessions` | 상단 뒤로 링크 | 항상 |
| `/teacher/sessions/{id}/report` | `/teacher/sessions` | 세션/토론 미존재 안내 링크 | 예외 상태 |

## Students
| From | To | Trigger | Condition |
|---|---|---|---|
| `/teacher/students` | `/teacher/students/{id}` | 학생 카드 클릭 | 필터 결과에 학생 존재 |
| `/teacher/students/{id}` | `/teacher/students` | 목록으로 링크 | 항상 |

## Station (`/station`)
| From | To | Trigger | Condition |
|---|---|---|---|
| `/station` | (현재 페이지 live 상태) | `입장` 버튼 | 활성 토론 세션 존재 |
| `/station` | `/station/report?...&source=station` | 토론 종료 동작 (`router.push`) | live 상태에서 `토론 종료` |

## Station Report (`/station/report`)
| From | To | Trigger | Condition |
|---|---|---|---|
| `/station/report?...` | `/teacher/sessions` | 상단 세션 목록 복귀 링크 | `source!=station`이고 `sessionId` 존재 |
| `/station/report?...` | `/station/report?...&view=report` | 상단 토글 `진행 화면/레포트` | `source!=station` |
| `/station/report?...` | `/station/report?...&view=manage` | 상단 토글 `관리 화면` | `source!=station` |
| `/station/report?...` | `/station` | `스테이션 처음 화면으로` | `source=station` |
| `/station/report?...` | `/station` | `Station으로 돌아가기` | `sessionId` 없음일 때 |

## In-Page View/State Changes (No Route Change)
- Session detail: teacher guided 모드에서 `진행 화면` ↔ `관리 화면`은 내부 상태 전환.
- Station page: `waiting` ↔ `live`는 내부 상태 전환.
- Station report: `view=report/manage`는 동일 라우트의 query 변경.
