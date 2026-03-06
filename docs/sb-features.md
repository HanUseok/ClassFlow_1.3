# SB 기능 정의서 (현재 구현 기준)

- 기준일: 2026-03-06
- 범위: Teacher/Station 핵심 UX, 현재 코드에 존재하는 기능만 문서화
- 데이터 입출력 상세: `docs/ux-io-spec.md`

## A. 진입과 역할 분리
- `/` 접속 시 `/teacher`로 리다이렉트
- Teacher 영역: `/teacher/*`
- Station 영역: `/station/*`
- 인증/인가는 현재 미구현

## B. Teacher 공통 네비게이션
- 상단 네비에 `메인`, `세션`, `학생`, `설정` 제공
- 활성 메뉴는 `/teacher`는 정확 일치, 나머지는 `startsWith`로 판별

## C. Teacher 대시보드 (`/teacher`)
- Pending 세션이 있으면 우선 세션 안내와 빠른 진입 제공
- Pending 세션 없으면 새 세션 생성(토론) 제공
- 세특 준비 상태(근거 보유/미보유/대표사례) 요약
- 관찰 필요 학생(근거 없음, 대표 사례 없음) 노출
- 최근 근거/즉시 활용 근거 노출 및 대표사례 지정

## D. 세션 목록 (`/teacher/sessions`)
- 타입/상태/검색 필터
- 상태 기반 메인 액션
- `Pending`: 수정/확인 페이지로 이동
- `Live`: 세션 상세로 이동
- `Ended`: 세션 리포트로 이동
- 개별 삭제, 전체 삭제 지원

## E. 세션 생성/수정 (`/teacher/sessions/create`)
- `type`과 `sessionId` 쿼리로 생성/수정 모드 진입
- Debate
- `setup -> headcount -> cards` 단계
- 모드(Ordered/Free), guided 여부, 단계별 시간 설정
- 조별 배치/슬롯 조정/랜덤 배정
- 논거 카드 검수(유효 카드 수 조건)
- Presentation
- 발표 순서, 발표 시간, 녹음 여부 설정
- 저장 또는 즉시 세션 실행 지원

## F. 세션 상세 (`/teacher/sessions/[id]`)
- Debate/Presentation 타입별 실행 화면 분기
- Debate: 발언 순서/단계/종료 관리
- Presentation: 발표 진행과 타이머 기반 전개
- 세션 없음 또는 로딩 상태 안내

## G. Teacher 리포트 (`/teacher/sessions/[id]/report`)
- 교사용 토론 리포트 화면
- 세션 메타 정보와 학생별 매핑 결과 표시
- 목록으로 돌아가기 제공

## H. 학생 (`/teacher/students`, `/teacher/students/[id]`)
- 학생 목록: 검색 + 학급 필터
- 학생 상세: 세션/발언 기록, 타입 필터
- 존재하지 않는 학생 ID는 `notFound()` 처리

## I. 설정 (`/teacher/settings`)
- 명단 탭: 학급/학생 목록, CSV 업로드 버튼(UI)
- 스테이션 탭: 역할 변경/삭제(UI)

## J. Station (`/station`)
- 상태: `landing -> identity -> group -> waiting -> live`
- 활성 토론 세션 없으면 안내 메시지 표시
- live에서 Quick Add와 발언 제어 수행
- 종료 시 `/station/report?...&source=station`으로 이동

## K. Station 리포트 (`/station/report`)
- query 기반 리포트 렌더링
- `view=report|manage` 지원
- `source=station`이면 report view 강제
- query 파싱 실패 시 fallback 데이터 사용
