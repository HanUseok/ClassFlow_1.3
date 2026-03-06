# Navigation Map (From -> To)

## Scan Basis
- Scope: `app`, `components`, `hooks`, `lib` 내 `href`, `redirect`, `router.push`, `router.back`
- Verified Date: 2026-03-06

## Global
| From | To | Trigger | Condition |
|---|---|---|---|
| `/` | `/teacher` | `redirect()` | 항상 |
| `Any /teacher/*` | `/teacher` | 상단 로고 클릭 | 항상 |
| `Any /teacher/*` | `/teacher/sessions` | 상단 메뉴 클릭 | 항상 |
| `Any /teacher/*` | `/teacher/students` | 상단 메뉴 클릭 | 항상 |
| `Any /teacher/*` | `/teacher/settings` | 상단 메뉴 클릭 | 항상 |

## Teacher Dashboard (`/teacher`)
| From | To | Trigger | Condition |
|---|---|---|---|
| `/teacher` | `/teacher/sessions/create?type=debate` | 새 세션 생성 | Pending 세션이 없을 때 |
| `/teacher` | `/teacher/sessions/{id}` | 대기중 세션 이어하기 | Pending 세션이 있을 때 |
| `/teacher` | same page (status update) | 세션 종료하기 | Pending 세션이 있을 때 |
| `/teacher` | `/teacher/sessions` | 전체보기 | 항상 |
| `/teacher` | `/teacher/students/{id}` | 관찰 필요 학생 클릭 | 목록 표시 시 |
| `/teacher` | `/teacher/students/{id}` | 최근 근거/즉시 활용 근거의 학생 상세 버튼 | 카드 표시 시 |

## Teacher Dashboard In-Page Actions (`/teacher`)
- `대표사례 지정`: 즉시 활용 근거 카드에서 featured evidence store 업데이트
- 최근 근거/즉시 활용 근거는 라우트 이동 없이 same page state만 갱신 가능

## Session List (`/teacher/sessions`)
| From | To | Trigger | Condition |
|---|---|---|---|
| `/teacher/sessions` | `/teacher/sessions/create?type=presentation` | 발표 생성 | 항상 |
| `/teacher/sessions` | `/teacher/sessions/create?type=debate` | 토론 생성 | 항상 |
| `/teacher/sessions` | `/teacher/sessions/create?sessionId={id}&type={...}` | 확인/수정 | 상태 `Pending` |
| `/teacher/sessions` | `/teacher/sessions/{id}` | 세션 진입 | 상태 `Live` |
| `/teacher/sessions` | `/teacher/sessions/{id}/report` | 레포트 확인 | 상태 `Ended` |

## Session Create (`/teacher/sessions/create`)
| From | To | Trigger | Condition |
|---|---|---|---|
| `/teacher/sessions/create` | 이전 페이지 | Back (`router.back`) | 항상 |
| `/teacher/sessions/create` | `/teacher/sessions/{id}` | 세션 실행 | 생성/수정 성공 |
| `/teacher/sessions/create` | `/teacher/sessions` | 저장 | 생성/수정 성공 |

## Session Detail (`/teacher/sessions/{id}`)
| From | To | Trigger | Condition |
|---|---|---|---|
| `/teacher/sessions/{id}` | `/teacher/sessions` | 목록으로 돌아가기 | 항상 |
| `/teacher/sessions/{id}` | `/teacher/sessions/create?sessionId={id}&type=debate` | 세션 설정으로 가기 | Debate + Pending |
| `/teacher/sessions/{id}` | `/station/report?...` | 토론 종료 | Debate 종료 처리 시 |

## Teacher Report (`/teacher/sessions/{id}/report`)
| From | To | Trigger | Condition |
|---|---|---|---|
| `/teacher/sessions/{id}/report` | `/teacher/sessions` | 상단 뒤로가기 | 항상 |

## Teacher Report In-Page Actions (`/teacher/sessions/{id}/report`)
- 학생 프로필 목록 클릭 -> same page detail panel 변경
- Debate mode에 따라 `입론/반론/재반론/마무리` 또는 `매핑 1~4` detail 표시

## Students
| From | To | Trigger | Condition |
|---|---|---|---|
| `/teacher/students` | `/teacher/students/{id}` | 학생 카드 클릭 | 항상 |
| `/teacher/students/{id}` | `/teacher/students` | 학생 목록으로 | 항상 |

## Student Detail In-Page Actions (`/teacher/students/{id}`)
- `세특 작성 모드` 토글 -> same page draft panel 노출/숨김
- `대표 사례로 지정` -> same page featured evidence store 업데이트
- `더보기/접기` -> same page featured 사례 수 조정
- `전체/토론/발표` 필터 -> same page session history 필터
- 세션 아코디언 헤더 클릭 -> same page expand/collapse

## Station (`/station`)
| From | To | Trigger | Condition |
|---|---|---|---|
| `/station` | same page (`landing -> identity`) | 입장 버튼 | active debate session 존재 |
| `/station` | same page (`identity -> group`) | 이름 선택 다음 | 학생 선택됨 |
| `/station` | same page (`group -> waiting`) | 조 선택 | 조 선택 완료 |
| `/station` | same page (`waiting -> live`) | 배치 완료 | waiting 상태 |
| `/station` | `/station/report?...&source=station` | 토론 종료 | live 상태 |

## Station Report (`/station/report`)
| From | To | Trigger | Condition |
|---|---|---|---|
| `/station/report?...` | same route (`view=report`) | 보고 탭 | `source != station` |
| `/station/report?...` | same route (`view=manage`) | 관리 탭 | `source != station` |
| `/station/report?...` | `/station` | 스테이션 처음 화면으로 | `source=station` |
| `/station/report?...` | `/teacher/sessions` | 상단 뒤로가기 | `source != station` and `sessionId` 존재 |

## In-Page State Switches
- Session detail: `viewMode` (`progress`/`manage`) 토글
- Station page: `landing/identity/group/waiting/live` 전환
- Station report: query 기반 `view` 전환
