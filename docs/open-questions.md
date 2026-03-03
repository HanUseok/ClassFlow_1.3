# 누락/불확실성 목록 (확인 필요)

## Q1. 로그인/권한 체계 부재
- 불확실한 내용: Teacher/Station 역할 분리가 URL 기준만 존재하고 인증/인가 로직이 보이지 않음.
- UX 영향: 비인가 접근 제어, 역할별 랜딩 정책, 세션 데이터 보호 정책을 문서만으로 확정할 수 없음.
- 확인 파일/위치:
  - `app/**` 전반 (middleware/guard 부재)
  - `lib/**` (권한 검증 로직 부재)
- 결정 필요 선택지:
  - A) MVP는 무인증 유지
  - B) Teacher 로그인 필수, Station은 초대/코드 기반 진입
  - C) Teacher/Station 모두 인증

## Q2. Student 역할 정의 범위
- 불확실한 내용: 실제 사용자 역할이 Teacher/Station인지, Student가 별도 로그인 사용자로 존재하는지 불명확.
- UX 영향: 사용자 여정 맵(학생 앱/웹)을 어디까지 설계할지 달라짐.
- 확인 파일/위치:
  - `/station` 화면 및 `mock-data`의 `StationRole`
  - 학생 상세 페이지(`/teacher/students/[id]`)는 교사용 조회 화면임
- 결정 필요 선택지:
  - A) Student는 독립 사용자 아님(Station으로 대체)
  - B) Student 개별 사용자 플로우 추가

## Q3. 세션 상태 명칭 표준
- 불확실한 내용: 코드 상태값은 `Pending/Live/Ended`인데 요구 문구에서는 `Closed` 표현도 혼용 가능.
- UX 영향: 배지/필터/리포트 문구 통일 필요.
- 확인 파일/위치:
  - `lib/mock-data.ts` (`SessionStatus`)
  - `components/status-badge.tsx`, `app/teacher/sessions/page.tsx`
- 결정 필요 선택지:
  - A) `Ended` 유지
  - B) UI 문구만 `Closed`로 변경
  - C) 상태 enum 자체 변경

## Q4. 문자열 인코딩 깨짐(한글 라벨 일부)
- 불확실한 내용: 여러 파일에서 한글이 깨져 표시됨(의도된 텍스트 확인 불가).
- UX 영향: 화면 라벨/버튼/설명 문구 정의 정확도 저하, QA 기준 모호.
- 확인 파일/위치:
  - `app/layout.tsx`, `app/teacher/page.tsx`, `components/status-badge.tsx`
  - `hooks/use-create-session-flow.ts`, `docs/*.md` 일부
- 결정 필요 선택지:
  - A) UTF-8 표준으로 전체 정규화
  - B) 다국어 리소스 분리 후 문구 재정의

## Q5. Station Report의 `manage` 뷰 사용 주체
- 불확실한 내용: `/station/report`에서 `source=station`이면 `report` view 강제. Teacher가 manage view를 어디까지 사용해야 하는지 정책 불명확.
- UX 영향: 리포트 화면 권한/메뉴 구조 확정 어려움.
- 확인 파일/위치:
  - `app/station/report/page.tsx` (`activeView` 계산)
- 결정 필요 선택지:
  - A) manage view는 Teacher 전용
  - B) Station도 manage 허용

## Q6. 세션 데이터 저장 정책(영속/동기화)
- 불확실한 내용: 현재 localStorage 기반 mock 저장소 사용. 다중 사용자/기기 동기화 정책 없음.
- UX 영향: "저장됨" 기대와 실제 데이터 지속성 간 괴리 가능.
- 확인 파일/위치:
  - `lib/mock-session-store.ts`
  - `hooks/use-mock-sessions.ts`
- 결정 필요 선택지:
  - A) 프로토타입 한정 로컬 저장 고지
  - B) 서버 저장/동기화 UX 추가

## Q7. 에러 화면/복구 플로우 범위
- 불확실한 내용: `error.tsx`, `not-found.tsx`(공통) 부재. 일부 페이지만 자체 예외 UI 구현.
- UX 영향: 예외 발생 시 사용자 안내 일관성 부족.
- 확인 파일/위치:
  - `app/**` 내 `error|not-found|loading` 파일 부재
- 결정 필요 선택지:
  - A) 공통 에러/404/로딩 페이지 정의
  - B) 페이지별 개별 처리 유지

## Q8. 발표 종료 후 "AI 분석"의 실제성
- 불확실한 내용: 발표 종료 후 AI 분석 로딩/결과 테이블이 실제 AI 호출인지, 모의 데이터인지 코드상 모의 로직.
- UX 영향: 사용자 기대(실시간 AI 분석)와 실제 동작 차이.
- 확인 파일/위치:
  - `components/session/presentation-view.tsx` (`buildKeywordMap`, timeout 로딩)
- 결정 필요 선택지:
  - A) MVP 문구를 "모의 분석"으로 명시
  - B) 실제 AI 분석 연동 범위 확정

## Q9. 리포트 데이터 소스 일관성
- 불확실한 내용: Teacher 리포트(`/teacher/sessions/[id]/report`)는 fallback 기반, Station 리포트(`/station/report`)는 query logs 기반.
- UX 영향: 같은 세션의 리포트라도 진입 경로에 따라 결과가 다르게 보일 수 있음.
- 확인 파일/위치:
  - `components/session/session-report-page-content.tsx`
  - `app/station/report/page.tsx`
- 결정 필요 선택지:
  - A) 단일 리포트 소스 통합
  - B) "임시/요약 리포트"로 명시적 분리

