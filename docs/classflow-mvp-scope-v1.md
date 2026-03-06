# ClassFlow MVP Scope (현재 코드 기준)

## 문서 목적
- 현재 저장소에서 실제 동작하는 MVP 범위를 고정

## 기준
- Verified Date: 2026-03-06
- 데이터 소스: `mock-data` + `localStorage`

## 1) MVP 포함 범위

### Teacher
- 대시보드
- Pending 세션 이어가기/종료
- 세특 준비 상태/관찰 필요 학생/최근 근거
- 세션 목록
- 타입/상태/검색 필터
- 세션 삭제/전체 삭제
- 상태별 진입
- 세션 생성/수정
- Debate/Presentation 생성
- Debate mode(Ordered/Free), guided/unguided
- 슬롯/배치/논거 카드 설정
- Debate 녹음 대상 선택(`recordingStudentIds`)
- 세션 상세
- Debate 진행/종료
- Teacher guided 진행/관리 화면 전환
- 녹음 제외 참여자에 대한 기록 UI 제한
- Presentation 진행(타이머)
- 학생
- 목록/검색/학급 필터
- 학생별 근거 워크스페이스
- 대표 사례 지정
- 설정
- 명단/스테이션 설정 UI

### Station
- 입장 플로우: `landing -> identity -> group -> waiting -> live`
- 조 배치 후 live 전환
- LiveDebateScreen + QuickAddScreen
- 종료 시 `/station/report` 이동

### Report
- `/station/report`
- Ordered/Free 리포트 렌더링
- `view=report/manage` 전환
- `source=station`일 때 report 강제
- `/teacher/sessions/[id]/report`
- 교사용 세션 리포트

## 2) 현재 구현 제약
- 인증/권한 시스템 없음
- 서버 DB/API 없음 (클라이언트 저장)
- 토론 런타임 상태는 새로고침 시 유지되지 않음
- STT/실시간 음성 분석/외부 LMS 연동 없음

## 3) 데이터/아키텍처
- `domain` / `application` / `infrastructure` 레이어 분리
- Repository port + local 구현체(`localSessionRepository`) 사용
- 테스트는 domain/application 유닛 테스트 중심

## 4) 다음 릴리즈 후보
- 서버 영속화(세션/근거/대표사례)
- 인증 및 역할 기반 접근 제어
- 토론 런타임 상태 복구(새로고침/다중 탭)
- 리포트 편집/내보내기 강화
