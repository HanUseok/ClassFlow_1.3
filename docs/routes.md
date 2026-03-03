# Routes Inventory (App Router)

## Scan Basis
- Command: `rg --files app -g "**/page.tsx"`
- Scope: `app/**/page.tsx`, related `layout.tsx`
- Date: 2026-03-03

## Route Table
| Route Path | Page File | Layout Chain | Role (UX) | Screen Purpose | Query Params (Observed) | Notes |
|---|---|---|---|---|---|---|
| `/` | `app/page.tsx` | `app/layout.tsx` | System entry | 초기 진입 시 Teacher 영역으로 자동 이동 | 없음 | `redirect("/teacher")` |
| `/teacher` | `app/teacher/page.tsx` | `app/layout.tsx` → `app/teacher/layout.tsx` | Teacher | 대시보드(빠른 시작, 대기 세션, 최근 세션) | 없음 | 상단 `TeacherNav` 공통 |
| `/teacher/sessions` | `app/teacher/sessions/page.tsx` | `app/layout.tsx` → `app/teacher/layout.tsx` | Teacher | 세션 목록/필터/검색/삭제/상태별 진입 | 없음 | 상태별 진입 링크 분기 |
| `/teacher/sessions/create` | `app/teacher/sessions/create/page.tsx` | `app/layout.tsx` → `app/teacher/layout.tsx` | Teacher | 세션 생성/수정(토론/발표) | `type`, `sessionId` | `type=presentation|debate`, `sessionId` 있으면 수정 모드 |
| `/teacher/sessions/[id]` | `app/teacher/sessions/[id]/page.tsx` | `app/layout.tsx` → `app/teacher/layout.tsx` | Teacher | 세션 상세/진행(토론 or 발표) | 동적 세그먼트 `id` | 세션 미존재 시 안내 메시지 |
| `/teacher/sessions/[id]/report` | `app/teacher/sessions/[id]/report/page.tsx` | `app/layout.tsx` → `app/teacher/layout.tsx` | Teacher | 세션 결과 리포트(교사용 뷰) | 동적 세그먼트 `id` | 토론 세션 아니면 안내 메시지 |
| `/teacher/students` | `app/teacher/students/page.tsx` | `app/layout.tsx` → `app/teacher/layout.tsx` | Teacher | 학생 목록 조회/검색/학급 필터 | 없음 | 학생 카드 클릭으로 상세 이동 |
| `/teacher/students/[id]` | `app/teacher/students/[id]/page.tsx` | `app/layout.tsx` → `app/teacher/layout.tsx` | Teacher | 학생별 세션/발언 이벤트 조회 | 동적 세그먼트 `id` | 학생 미존재 시 `notFound()` |
| `/teacher/settings` | `app/teacher/settings/page.tsx` | `app/layout.tsx` → `app/teacher/layout.tsx` | Teacher | 명단/스테이션 설정 탭 | 없음 | UI 편집은 로컬 상태 중심 |
| `/station` | `app/station/page.tsx` | `app/layout.tsx` → `app/station/layout.tsx` | Station (학생 측) | 스테이션 대기/입장/토론 진행/기록 | 없음 | 활성 토론 자동 선택 로직 포함 |
| `/station/report` | `app/station/report/page.tsx` | `app/layout.tsx` → `app/station/layout.tsx` | Station + Teacher | 토론 리포트(보고 view) + 관리 view | `round`, `phase`, `logs`, `names`, `sessionId`, `teacherGuided`, `sessionTitle`, `sessionStatus`, `groupCount`, `groupLayout`, `view`, `source` | `source=station`이면 보고 view 강제 |

## Layout Mapping
- Root layout: `app/layout.tsx`
- Teacher layout: `app/teacher/layout.tsx` (상단 `TeacherNav` + 메인 컨테이너)
- Station layout: `app/station/layout.tsx` (중앙 정렬 컨테이너)

## Access/Role Findings
- 로그인/권한 검증 로직은 라우트 단에서 확인되지 않음.
- Teacher/Station 구분은 URL 구획(` /teacher`, `/station`)과 화면 기능으로만 분리됨.
