# SB 기능정의서 (UX 관점)

## 문서 범위
- 대상: 현재 레포에서 실제 노출되는 기능(Teacher/Station 중심)
- 기준: 라우트 + 사용자 액션 + 화면 상태 + 규칙
- 비포함: API/DB/코드 아키텍처 구현 상세

---

## 모듈 A. 인증/진입

### 기능 A-1. 초기 진입 라우팅
1) 목적/배경: 사용자가 루트 URL로 접근했을 때 기본 업무 화면으로 진입시킨다.  
2) 사용자/접근 조건: 모든 사용자(권한 분기 없음).  
3) 진입점: 브라우저에서 `/` 접근.  
4) 사용자 시나리오: 사용자가 `/` 접속 → 시스템이 즉시 `/teacher`로 이동.  
5) 화면/정보: 별도 화면 없이 즉시 전환.  
6) 입력/행동: 사용자 입력 없음.  
7) 시스템 반응: 성공 시 `/teacher` 렌더링. 실패 케이스 별도 정의 없음.  
8) 규칙/제약: 항상 동일 경로(`/teacher`)로 이동.  
9) 관련 화면/연결: `/`, `/teacher`.  
10) 추적 이벤트: `entry_root_redirected`, `entry_root_redirect_failed(unknown)`.

### 기능 A-2. 역할 접근 정책
1) 목적/배경: Teacher/Station 경험 분리를 전제로 URL 공간 분리.  
2) 사용자/접근 조건: Teacher(`/teacher/*`), Station(`/station/*`)로 UX 분리.  
3) 진입점: 직접 URL 진입 또는 링크 이동.  
4) 사용자 시나리오: URL 경로에 따라 해당 역할 화면 사용.  
5) 화면/정보: Teacher 상단 네비 / Station 중앙 단일 화면 레이아웃.  
6) 입력/행동: URL 선택/링크 클릭.  
7) 시스템 반응: 해당 섹션 렌더링.  
8) 규칙/제약: 로그인/권한 검사 UI는 구현되지 않음(unknown).  
9) 관련 화면/연결: `app/teacher/layout`, `app/station/layout`.  
10) 추적 이벤트: `role_area_entered_teacher`, `role_area_entered_station`, `unauthorized_access_blocked(unknown)`.

---

## 모듈 B. Teacher 공통 네비게이션

### 기능 B-1. 상단 글로벌 네비
1) 목적/배경: Teacher 핵심 메뉴로 빠른 전환.  
2) 사용자/접근 조건: `/teacher/*` 진입 사용자.  
3) 진입점: Teacher 레이아웃 로드 시 자동 노출.  
4) 사용자 시나리오: 메뉴 클릭 → 해당 페이지로 이동.  
5) 화면/정보: 로고(ClassFlow), 메뉴 4개(메인/세션/학생/설정), 현재 메뉴 활성 상태.  
6) 입력/행동: 메뉴 클릭.  
7) 시스템 반응: 즉시 라우팅, 활성 메뉴 스타일 갱신.  
8) 규칙/제약: `/teacher`는 정확히 일치, 나머지는 `startsWith`로 활성 처리.  
9) 관련 화면/연결: `/teacher`, `/teacher/sessions`, `/teacher/students`, `/teacher/settings`.  
10) 추적 이벤트: `teacher_nav_click`, `teacher_nav_active_changed`.

---

## 모듈 C. Teacher 대시보드

### 기능 C-1. 빠른 시작(세션 생성 진입)
1) 목적/배경: 토론/발표 세션 신규 생성 단축.  
2) 사용자/접근 조건: Teacher.  
3) 진입점: `/teacher` 상단 빠른 시작 영역.  
4) 사용자 시나리오: 토론/발표 버튼 클릭 → 생성 화면 진입.  
5) 화면/정보: 버튼 2개(토론 세션, 발표 세션).  
6) 입력/행동: 버튼 클릭.  
7) 시스템 반응: `type` 쿼리 포함 생성 화면 이동.  
8) 규칙/제약: 토론=`type=debate`, 발표=`type=presentation`.  
9) 관련 화면/연결: `/teacher/sessions/create?...`.  
10) 추적 이벤트: `dashboard_quickstart_debate_click`, `dashboard_quickstart_presentation_click`.

### 기능 C-2. 대기 세션 카드
1) 목적/배경: 아직 시작되지 않은 세션(Pending)을 즉시 관리/진입.  
2) 사용자/접근 조건: Teacher, Pending 세션 존재 시.  
3) 진입점: 대시보드 "대기중 세션" 섹션.  
4) 사용자 시나리오: 카드 확인 → `수정` 또는 `진입하기` 클릭.  
5) 화면/정보: 제목, 주제, 학급, 날짜, 상태(Pending).  
6) 입력/행동: 수정 클릭 / 진입 클릭.  
7) 시스템 반응: 수정은 생성페이지(수정 모드), 진입은 상세페이지로 이동.  
8) 규칙/제약: Pending 세션만 노출.  
9) 관련 화면/연결: `/teacher/sessions/create?sessionId=...`, `/teacher/sessions/{id}`.  
10) 추적 이벤트: `dashboard_pending_edit_click`, `dashboard_pending_enter_click`.

### 기능 C-3. 최근 세션/최근 활동 빈 상태
1) 목적/배경: 최근 작업 컨텍스트 제공.  
2) 사용자/접근 조건: Teacher.  
3) 진입점: `/teacher`.  
4) 사용자 시나리오: 최근 세션 카드 클릭 또는 전체보기 클릭.  
5) 화면/정보: 최근 4개 세션 카드, 최근 활동 영역(현재 비어 있음).  
6) 입력/행동: 카드 클릭, 전체보기 클릭.  
7) 시스템 반응: 상세/목록 이동. 데이터 없으면 빈 상태 메시지.  
8) 규칙/제약: hydrated 이전엔 로딩 문구 표시.  
9) 관련 화면/연결: `/teacher/sessions`, `/teacher/sessions/{id}`.  
10) 추적 이벤트: `dashboard_recent_session_click`, `dashboard_recent_view_all_click`, `dashboard_recent_empty_view`.

---

## 모듈 D. 세션 목록/관리

### 기능 D-1. 목록 조회/필터/검색/정렬
1) 목적/배경: 대량 세션 탐색성 제공.  
2) 사용자/접근 조건: Teacher.  
3) 진입점: `/teacher/sessions`.  
4) 사용자 시나리오: 유형/상태/검색어 설정 → 목록 즉시 갱신.  
5) 화면/정보: 제목, 주제, 날짜, 상태, 액션 버튼.  
6) 입력/행동: 유형 필터, 상태 필터, 검색 입력.  
7) 시스템 반응: 조건 만족 세션만 표시, 날짜 내림차순 정렬.  
8) 규칙/제약: 로딩/빈 상태 별도 메시지 노출.  
9) 관련 화면/연결: 동일 페이지 내 필터 결과 반영.  
10) 추적 이벤트: `session_list_filter_changed`, `session_list_search_changed`, `session_list_empty_result`.

### 기능 D-2. 상태별 상세 진입 분기
1) 목적/배경: 상태에 맞는 다음 액션으로 이동.  
2) 사용자/접근 조건: Teacher.  
3) 진입점: 목록 각 행의 메인 버튼.  
4) 사용자 시나리오: 버튼 클릭 시 상태별 화면으로 이동.  
5) 화면/정보: 버튼 라벨(`확인/수정`, `세션 진입`, `레포트 확인`).  
6) 입력/행동: 버튼 클릭.  
7) 시스템 반응: 상태에 맞는 URL로 라우팅.  
8) 규칙/제약: Pending/Live/Ended 매핑 고정.  
9) 관련 화면/연결: create/detail/report.  
10) 추적 이벤트: `session_list_primary_action_click`.

### 기능 D-3. 삭제/전체삭제
1) 목적/배경: 불필요 세션 정리.  
2) 사용자/접근 조건: Teacher.  
3) 진입점: 목록 행 `삭제`, 상단 `전체삭제`.  
4) 사용자 시나리오: 삭제 클릭 → confirm → 목록 반영.  
5) 화면/정보: confirm 브라우저 팝업.  
6) 입력/행동: 확인/취소.  
7) 시스템 반응: 확인 시 데이터 제거, 취소 시 유지.  
8) 규칙/제약: 전체삭제는 세션이 0개면 동작 없음.  
9) 관련 화면/연결: 동일 페이지 유지.  
10) 추적 이벤트: `session_delete_confirmed`, `session_delete_cancelled`, `session_delete_all_confirmed`.

---

## 모듈 E. 세션 생성/수정

### 기능 E-1. 생성/수정 모드 진입
1) 목적/배경: 신규 생성과 기존 수정을 단일 화면에서 처리.  
2) 사용자/접근 조건: Teacher.  
3) 진입점: 신규(`type`), 수정(`sessionId`) 쿼리.  
4) 사용자 시나리오: 쿼리 기반으로 화면 모드와 초기값 로딩.  
5) 화면/정보: 제목(주제 입력), 모드 라벨(세션 수정/생성).  
6) 입력/행동: 주제 입력, 뒤로가기.  
7) 시스템 반응: 수정 대상 있으면 기존 값 하이드레이션.  
8) 규칙/제약: `sessionId`가 없거나 찾지 못하면 신규처럼 동작.  
9) 관련 화면/연결: `/teacher/sessions/create`.  
10) 추적 이벤트: `session_create_entered`, `session_edit_entered`, `session_edit_hydration_failed`.

### 기능 E-2. 토론 기본 설정(모드/진행 방식/단계)
1) 목적/배경: 토론 운영 방식을 사전 결정.  
2) 사용자/접근 조건: 토론 타입.  
3) 진입점: Debate Step 1(세션 설정).  
4) 사용자 시나리오: 순서토론/자유토론 선택, 교사주도 여부 선택, 순서 단계 ON/OFF 및 분 설정.  
5) 화면/정보: 모드 Select, 진행방식 Select, 단계 카드(라벨/순번/ONOFF/분).  
6) 입력/행동: Select 변경, 단계 카드 토글, 시간 숫자 입력.  
7) 시스템 반응: 값 즉시 반영, 유효성 미충족 시 에러 문구 표시.  
8) 규칙/제약: 순서토론은 활성 단계 최소 1개 + 각 단계 1분 이상 필요.  
9) 관련 화면/연결: 같은 페이지 Step 전환.  
10) 추적 이벤트: `debate_mode_changed`, `teacher_guided_changed`, `ordered_stage_toggled`, `ordered_stage_minutes_changed`.

### 기능 E-3. 학급/학생 선택
1) 목적/배경: 세션 참가 대상 확정.  
2) 사용자/접근 조건: 생성/수정 화면 공통.  
3) 진입점: 클래스 선택 영역.  
4) 사용자 시나리오: 학급 선택 → 학생 체크박스로 포함/제외.  
5) 화면/정보: 학급 Select, 학생 리스트 + 선택 수.  
6) 입력/행동: 학급 변경, 학생 토글.  
7) 시스템 반응: 선택 집합 갱신, 발표 순서/녹음 대상도 동기화.  
8) 규칙/제약: 학급 변경 시 배치/조정 데이터 초기화.  
9) 관련 화면/연결: 토론 Step 2 진입 가능 여부, 발표 설정 노출 여부에 영향.  
10) 추적 이벤트: `class_selected`, `student_selected`, `student_deselected`.

### 기능 E-4. 토론 조 배치(수동/랜덤)
1) 목적/배경: 찬성/반대/진행자 역할 배정 완성.  
2) 사용자/접근 조건: 토론 타입 + 학생 1명 이상.  
3) 진입점: Debate Step 2(조 배치).  
4) 사용자 시나리오: 미배치 학생 드래그 → 슬롯 배치, 슬롯 수 조정, 랜덤 배정으로 자동 분배.  
5) 화면/정보: 미배치 영역, 조별 슬롯(찬성/반대/진행자), 용량 정보, 랜덤 다이얼로그.  
6) 입력/행동: 드래그앤드롭, 수량 +/- 조정, 랜덤 셔플, 랜덤 확정.  
7) 시스템 반응: 중복 배치 제거, 유효하지 않은 학생 id 정리, 교사주도일 때 1조 진행자 슬롯 교사 고정.  
8) 규칙/제약: 모든 선택 학생이 배치 완료되어야 `debateReady`.  
9) 관련 화면/연결: Step 3(논거카드) 이동 버튼 활성 조건.  
10) 추적 이벤트: `debate_assignment_drop`, `debate_slot_count_changed`, `debate_random_opened`, `debate_random_applied`.

### 기능 E-5. 논거카드 검수/수정
1) 목적/배경: 토론 중 사용할 논거 카드 품질 확보.  
2) 사용자/접근 조건: 토론 타입, Step 3.  
3) 진입점: `논거카드 검수` 탭 버튼.  
4) 사용자 시나리오: AI 제안 카드 확인 → 활성/비활성, 진영, 제목, 주장 편집 → 카드 추가/삭제/재생성.  
5) 화면/정보: 카드 리스트, 로딩 상태, 카드별 필드.  
6) 입력/행동: 체크박스, Select, 텍스트 입력, 추가/삭제/재생성 클릭.  
7) 시스템 반응: force 재생성 시 로딩 후 카드 세트 교체.  
8) 규칙/제약: 활성 카드 중 제목+주장 완료 카드 3개 이상이어야 완료(`cardsReady`).  
9) 관련 화면/연결: 최종 `저장`/`세션 실행` 가능 조건에 포함.  
10) 추적 이벤트: `argument_card_regenerated`, `argument_card_added`, `argument_card_removed`, `argument_card_updated`.

### 기능 E-6. 발표 설정(순서/시간/녹음)
1) 목적/배경: 발표 세션 운영 파라미터 지정.  
2) 사용자/접근 조건: 발표 타입, 학생 선택 완료.  
3) 진입점: 생성 화면 발표 설정 섹션.  
4) 사용자 시나리오: 학생당 발표시간 입력, 발표 순서 Up/Down 조정, 녹음 여부 토글.  
5) 화면/정보: 발표자 순서 리스트, 녹음 체크, 시간 입력.  
6) 입력/행동: 숫자 입력, Up/Down 클릭, 체크박스 클릭.  
7) 시스템 반응: 순서/녹음 상태 즉시 반영.  
8) 규칙/제약: 발표시간 최소 1분, 선택 학생 수 1명 이상 필요.  
9) 관련 화면/연결: 세션 실행 시 발표 상세 화면에서 사용.  
10) 추적 이벤트: `presentation_minutes_changed`, `presentation_order_changed`, `presentation_recording_toggled`.

### 기능 E-7. 저장/실행
1) 목적/배경: 작성 결과를 보존하거나 즉시 진행 시작.  
2) 사용자/접근 조건: `canCreate=true`.  
3) 진입점: 하단 `저장`, `세션 실행`.  
4) 사용자 시나리오: 저장 클릭 시 목록 복귀, 실행 클릭 시 세션 상세 진입.  
5) 화면/정보: 버튼 2개.  
6) 입력/행동: 저장/실행 클릭.  
7) 시스템 반응: 신규면 create, 수정이면 overwrite 후 라우팅.  
8) 규칙/제약: 조건 미충족 시 버튼 disabled.  
9) 관련 화면/연결: `/teacher/sessions`, `/teacher/sessions/{id}`.  
10) 추적 이벤트: `session_saved`, `session_launched`, `session_create_validation_failed`.

---

## 모듈 F. 세션 상세/진행 (Teacher)

### 기능 F-1. 상세 공통/예외
1) 목적/배경: 세션 단건 관리의 중심 화면.  
2) 사용자/접근 조건: `id` 라우트 접근.  
3) 진입점: 목록/대시보드/생성 후 자동 진입.  
4) 사용자 시나리오: 로딩 후 세션 확인, 없으면 목록 복귀.  
5) 화면/정보: 제목, 주제, 상태/타입, 뒤로가기.  
6) 입력/행동: 뒤로가기 링크.  
7) 시스템 반응: hydrated 전 로딩, 미존재 시 예외 메시지.  
8) 규칙/제약: 세션 id가 local 데이터에 없으면 조작 불가.  
9) 관련 화면/연결: `/teacher/sessions`.  
10) 추적 이벤트: `session_detail_viewed`, `session_detail_not_found`.

### 기능 F-2. 토론 진행(교사주도/비주도)
1) 목적/배경: 토론 진행 제어, 발언 순서/단계 관리, 종료.  
2) 사용자/접근 조건: 세션 타입 Debate.  
3) 진입점: 세션 상세 진입 시 Debate 분기.  
4) 사용자 시나리오: 시작(Pending→Live) → 발언 시작/종료 반복 → 이전/다음/순서변경/단계변경 → 토론 종료.  
5) 화면/정보: 그룹 패널, 현재 단계/발언자, 진행상태, QuickAdd 기록 UI.  
6) 입력/행동: 토론 시작, 일시정지/재개, 이전/다음 발언자, 단계 선택, 순서 드래그, 토론 종료.  
7) 시스템 반응: 상태 전환, 그룹별 런타임 상태 갱신, 종료 시 리포트 URL로 이동.  
8) 규칙/제약:  
- `Ended` 상태면 읽기 전용.  
- teacher guided=true면 progress/manage 토글 노출.  
- Free 모드는 종료 가능 조건이 Ordered와 다름.  
9) 관련 화면/연결: `/station/report?...`.  
10) 추적 이벤트: `debate_started`, `speech_started`, `speech_ended`, `speaker_order_changed`, `debate_ended`.

### 기능 F-3. 발표 진행
1) 목적/배경: 발표 세션 진행/타이머/종료 관리.  
2) 사용자/접근 조건: 세션 타입 Presentation.  
3) 진입점: 세션 상세에서 타입 분기.  
4) 사용자 시나리오: 시작(Pending) → 발표 진행(Live) → 발표자 전환 → 마지막 발표 후 종료(Ended).  
5) 화면/정보: 현재 발표자, 녹음 배지, 남은 시간, 순서 이동 버튼, 종료 후 요약표.  
6) 입력/행동: 발표 시작/끝내기, 다음 발표자, 순서 이전/다음.  
7) 시스템 반응: 타이머 감소, 시간 만료 시 자동 정지 및 다음 버튼 활성, 종료 후 AI 로딩 표시 후 표 노출.  
8) 규칙/제약: 실행 중 순서 이동 불가, 발표자 없으면 진행 불가.  
9) 관련 화면/연결: 동일 페이지 내 상태 전환.  
10) 추적 이벤트: `presentation_started`, `presentation_time_up`, `presentation_next_presenter`, `presentation_session_ended`.

---

## 모듈 G. Station 참여/기록

### 기능 G-1. Station 대기/입장
1) 목적/배경: 스테이션 참여자가 세션 시작 전 대기 후 진입.  
2) 사용자/접근 조건: `/station` 접근자.  
3) 진입점: Station 페이지.  
4) 사용자 시나리오: 대기 화면 정보 확인 → `입장` 클릭 → live 화면 진입.  
5) 화면/정보: 주제, 교사명, 생성시각, 멤버수, 발언순서 존재 여부.  
6) 입력/행동: 입장 버튼.  
7) 시스템 반응: waiting→live 로컬 상태 변경.  
8) 규칙/제약: 활성 토론 세션 없으면 입장 불가 메시지.  
9) 관련 화면/연결: `/station` 내부 상태 전환.  
10) 추적 이벤트: `station_waiting_viewed`, `station_join_clicked`, `station_no_active_session`.

### 기능 G-2. Station live 토론 + Quick Add
1) 목적/배경: 현장 발언 진행과 근거/사고 기록을 동시 수행.  
2) 사용자/접근 조건: Station live 상태.  
3) 진입점: 대기 화면 입장 이후.  
4) 사용자 시나리오: 발언자 선택/순서변경/단계변경 → 발언 시작 → 카드 선택 및 기록 → 발언 종료/저장 반복 → 토론 종료.  
5) 화면/정보: LiveDebateScreen + QuickAddScreen(슬롯, 카드 핸드, 타이머, 기록 이력).  
6) 입력/행동: 발언 시작/종료, 카드 드래그/탭, 카드 프리뷰, 토론 종료.  
7) 시스템 반응: 종료 시 세션 상태 Ended 전환 후 station report로 이동.  
8) 규칙/제약: Free 모드와 Ordered 모드 버튼/종료 동작 차이.  
9) 관련 화면/연결: `/station/report?...&source=station`.  
10) 추적 이벤트: `station_speech_start`, `station_card_equipped`, `station_speech_saved`, `station_debate_end`.

---

## 모듈 H. 리포트

### 기능 H-1. 통합 리포트 화면(`/station/report`)
1) 목적/배경: 토론 결과를 표 형태로 조회하고(보고), 관리 view 전환 제공.  
2) 사용자/접근 조건: report URL 쿼리 유입자(Teacher/Station).  
3) 진입점: 토론 종료 후 push, 혹은 링크로 직접 접근.  
4) 사용자 시나리오: 쿼리 파싱 → 자유토론/순서토론 분기 → 보고 표 확인 또는 관리 view 전환.  
5) 화면/정보: 세션 헤더, 상태배지, 발표자별 논거/사고/키워드 매핑 표.  
6) 입력/행동: report/manage 토글, 상단 복귀 버튼 클릭.  
7) 시스템 반응: source=station이면 report 강제, JSON 파싱 실패 시 빈 데이터 fallback.  
8) 규칙/제약: `view`는 query 기반, `source=station` 정책 우선.  
9) 관련 화면/연결: `/teacher/sessions`, `/station`, 동일 route query 전환.  
10) 추적 이벤트: `report_view_opened`, `report_view_switched`, `report_parse_failed`.

### 기능 H-2. Teacher 전용 세션 리포트(`/teacher/sessions/[id]/report`)
1) 목적/배경: 세션 단위 결과 조회(교사 플로우 완결).  
2) 사용자/접근 조건: Teacher, 토론 세션 id 접근.  
3) 진입점: 세션 목록 `레포트 확인`.  
4) 사용자 시나리오: 세션/멤버 확인 → 표 형태 결과 확인 → 목록 복귀.  
5) 화면/정보: 세션 제목/주제, 전체 학생, 단계별/자유토론 매핑 테이블.  
6) 입력/행동: 목록 복귀 링크 클릭.  
7) 시스템 반응: 비토론/미존재 세션이면 오류 안내.  
8) 규칙/제약: 현재 표 데이터는 로그 기반이 아닌 fallback 생성 중심(코드 근거).  
9) 관련 화면/연결: `/teacher/sessions`.  
10) 추적 이벤트: `teacher_report_viewed`, `teacher_report_not_available`.

---

## 모듈 I. 학생 관리

### 기능 I-1. 학생 목록 조회
1) 목적/배경: 학생 단위 이력 확인 진입 제공.  
2) 사용자/접근 조건: Teacher.  
3) 진입점: `/teacher/students`.  
4) 사용자 시나리오: 검색/학급 필터 → 학생 카드 선택.  
5) 화면/정보: 이름, 학급, 아이콘 카드.  
6) 입력/행동: 검색 입력, 학급 선택, 카드 클릭.  
7) 시스템 반응: 조건 필터 즉시 반영, 빈 결과 시 빈 상태 메시지.  
8) 규칙/제약: 대소문자 무시 검색.  
9) 관련 화면/연결: `/teacher/students/[id]`.  
10) 추적 이벤트: `student_list_filter_changed`, `student_profile_entered`.

### 기능 I-2. 학생 상세 이력
1) 목적/배경: 학생 개인의 세션 참여/발언 기록 조회.  
2) 사용자/접근 조건: 유효한 학생 id.  
3) 진입점: 학생 목록 카드 클릭.  
4) 사용자 시나리오: 세션 리스트 펼침/접힘 → 이벤트 기록 확인.  
5) 화면/정보: 학생 프로필, 타입 필터(all/debate/presentation), 세션 카드, 이벤트(Claim/Rebuttal/Question).  
6) 입력/행동: 타입 탭 클릭, 세션 아코디언 토글.  
7) 시스템 반응: 타입별 필터링, 이벤트 없으면 세션별 안내 문구.  
8) 규칙/제약: 학생 id 무효 시 notFound(404).  
9) 관련 화면/연결: `/teacher/students` 복귀.  
10) 추적 이벤트: `student_detail_viewed`, `student_detail_filter_changed`, `student_session_expanded`.

---

## 모듈 J. 설정

### 기능 J-1. 명단 관리 탭
1) 목적/배경: 학급/학생 목록 조회 및 CSV 업로드 진입 UI 제공.  
2) 사용자/접근 조건: Teacher.  
3) 진입점: `/teacher/settings` 기본 탭 또는 클릭.  
4) 사용자 시나리오: 학급별 학생 수/목록 확인.  
5) 화면/정보: 학급 카드, 학생명, 학생 id, CSV 업로드 버튼.  
6) 입력/행동: 탭 전환, 업로드 버튼 클릭(UI만).  
7) 시스템 반응: 현재 업로드 실제 처리 없음(unknown).  
8) 규칙/제약: 읽기 중심 화면.  
9) 관련 화면/연결: 설정 내 탭 전환.  
10) 추적 이벤트: `settings_roster_tab_opened`, `settings_csv_upload_clicked`.

### 기능 J-2. 스테이션 관리 탭
1) 목적/배경: 스테이션 역할/연결 상태 운영 UI 제공.  
2) 사용자/접근 조건: Teacher.  
3) 진입점: 설정의 `스테이션 관리` 탭.  
4) 사용자 시나리오: 역할 Select 변경, 삭제 버튼으로 목록 제거.  
5) 화면/정보: 스테이션명, 연결상태, 역할 Select, 삭제 버튼.  
6) 입력/행동: 역할 변경, 삭제 클릭.  
7) 시스템 반응: 로컬 상태 즉시 반영(새로고침 시 유지 보장 없음).  
8) 규칙/제약: 서버 동기화/저장 정책 미확인(unknown).  
9) 관련 화면/연결: 설정 내 탭 화면.  
10) 추적 이벤트: `settings_station_role_changed`, `settings_station_deleted`.

