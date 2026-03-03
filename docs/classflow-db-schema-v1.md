# ClassFlow DB 스키마 초안 (v1.0)

## 1. 설계 원칙
- 트랜잭션 경계: 세션 제어/기록 입력 분리.
- 멱등성: `event_client_id` 유니크 보장.
- 감사 추적: 강제 시작, 잠금 해제, 무효 처리 로그 필수.

## 2. ERD (텍스트)
- `classroom 1 - N session`
- `session 1 - N team`
- `session 1 - N slot_template`
- `session 1 - N slot_assignment`
- `session 1 - N station_invite`
- `session 1 - N station_presence`
- `session 1 - N record_event`
- `student N - N team` (`team_member`)
- `student 1 - N consent`
- `student 1 - N special_bundle`
- `special_bundle 1 - N special_bundle_event`
- `session 1 - N audit_log`

## 3. 테이블 정의

### 3.1 classroom
- `id` PK
- `school_id` NOT NULL
- `name` NOT NULL
- `grade` SMALLINT
- `homeroom_teacher_id` NOT NULL
- `created_at`, `updated_at`

### 3.2 student
- `id` PK
- `class_id` FK -> classroom.id
- `student_no`
- `name` NOT NULL
- `active` BOOLEAN DEFAULT true
- `created_at`, `updated_at`
- 인덱스: `(class_id, active)`, `(class_id, student_no)`

### 3.3 session
- `id` PK
- `type` ENUM(`debate`, `presentation`) NOT NULL
- `class_id` FK -> classroom.id
- `topic` VARCHAR(255)
- `status` ENUM(`draft`, `ready`, `live`, `paused`, `ended`) DEFAULT `draft`
- `round_count` SMALLINT NOT NULL
- `record_window_sec` SMALLINT DEFAULT 60
- `slot_assignment_mode` ENUM(`manual`, `rotation`) DEFAULT `rotation`
- `force_started` BOOLEAN DEFAULT false
- `started_at`, `ended_at`
- `created_by`, `updated_by`
- `created_at`, `updated_at`
- 인덱스: `(class_id, type, status, created_at DESC)`, `(status, started_at DESC)`

### 3.4 team
- `id` PK
- `session_id` FK -> session.id
- `team_no` SMALLINT NOT NULL
- `side` ENUM(`pro`, `con`) NOT NULL
- `is_active` BOOLEAN DEFAULT true
- `created_at`, `updated_at`
- 유니크: `(session_id, team_no)`
- 인덱스: `(session_id, side)`

### 3.5 team_member
- `team_id` FK -> team.id
- `student_id` FK -> student.id
- `joined_at`
- PK: `(team_id, student_id)`

### 3.6 slot_template
- `id` PK
- `session_id` FK -> session.id
- `slot_order` SMALLINT NOT NULL
- `side` ENUM(`pro`, `con`) NOT NULL
- `speech_type` ENUM(`claim`, `rebuttal`, `re-rebuttal`, `summary`, `custom`) NOT NULL
- `duration_sec` SMALLINT NOT NULL
- 유니크: `(session_id, slot_order)`

### 3.7 slot_assignment
- `id` PK
- `session_id` FK -> session.id
- `round_no` SMALLINT NOT NULL
- `slot_order` SMALLINT NOT NULL
- `student_id` FK -> student.id
- `assigned_by` VARCHAR(36)
- `created_at`, `updated_at`
- 유니크: `(session_id, round_no, slot_order)`
- 인덱스: `(session_id, student_id)`

### 3.8 station
- `id` PK
- `device_fingerprint` VARCHAR(128) UNIQUE
- `device_name` VARCHAR(120)
- `status` ENUM(`pending`, `approved`, `blocked`) DEFAULT `pending`
- `approved_by`
- `approved_at`
- `created_at`, `updated_at`

### 3.9 station_invite
- `id` PK
- `session_id` FK -> session.id
- `role` VARCHAR(20) NOT NULL  // desk, team:1 ...
- `invite_token` VARCHAR(96) UNIQUE NOT NULL
- `expires_at` NOT NULL
- `issued_by` NOT NULL
- `created_at`
- 인덱스: `(session_id, role, expires_at)`

### 3.10 station_presence
- `id` PK
- `session_id` FK -> session.id
- `station_id` FK -> station.id
- `role` VARCHAR(20) NOT NULL
- `status` ENUM(`joined`, `active`, `readonly`, `left`) DEFAULT `joined`
- `last_heartbeat_at`
- `joined_at`
- `left_at`
- 유니크: `(session_id, station_id)`
- 인덱스: `(session_id, role, status)`, `(session_id, last_heartbeat_at DESC)`

### 3.11 record_event
- `id` PK
- `session_id` FK -> session.id
- `team_id` FK -> team.id
- `round_no` SMALLINT NOT NULL
- `slot_order` SMALLINT NOT NULL
- `side` ENUM(`pro`, `con`) NOT NULL
- `speech_type` ENUM(`claim`, `rebuttal`, `re-rebuttal`, `summary`, `custom`) NOT NULL
- `speaker_id` FK -> student.id
- `strategy_tag` ENUM(`evidence`, `logic`, `ethos`, `pathos`, `counterexample`, `questioning`, `framing`, `synthesis`) NOT NULL
- `event_client_id` VARCHAR(64) NOT NULL
- `created_by_station_id` FK -> station.id
- `is_invalidated` BOOLEAN DEFAULT false
- `invalidated_reason` VARCHAR(255)
- `created_at`, `updated_at`
- 유니크: `(session_id, event_client_id)`
- 인덱스: `(session_id, team_id, round_no)`, `(speaker_id, created_at DESC)`
- 체크: 라운드당 팀 이벤트 수 <= 6 (DB 트리거 또는 서비스 레이어 제약)

### 3.12 consent
- `id` PK
- `student_id` FK -> student.id
- `recording_consent` BOOLEAN NOT NULL
- `effective_from` NOT NULL
- `effective_to`
- `updated_by`
- `created_at`
- 인덱스: `(student_id, effective_from DESC)`

### 3.13 special_bundle
- `id` PK
- `student_id` FK -> student.id
- `bundle_type` ENUM(`primary`, `alt`) NOT NULL
- `bundle_rank` SMALLINT DEFAULT 1
- `status` ENUM(`draft`, `finalized`) DEFAULT `draft`
- `auto_generated` BOOLEAN DEFAULT true
- `score_meta` JSONB
- `created_by`
- `created_at`, `updated_at`
- 인덱스: `(student_id, bundle_type, bundle_rank)`, `(student_id, created_at DESC)`

### 3.14 special_bundle_event
- `bundle_id` FK -> special_bundle.id
- `record_event_id` FK -> record_event.id
- `sort_order` SMALLINT NOT NULL
- PK: `(bundle_id, record_event_id)`

### 3.15 audit_log
- `id` PK
- `session_id` FK -> session.id
- `actor_id` NOT NULL
- `actor_role` ENUM(`teacher`, `desk_station`, `team_station`)
- `action` VARCHAR(60) NOT NULL
- `payload` JSONB
- `created_at` NOT NULL
- 인덱스: `(session_id, created_at DESC)`, `(action, created_at DESC)`

## 4. 무결성/운영 규칙
- `session.status=live` 전환 시:
  - desk 역할 presence 1건 이상 active.
  - 활성 team 수만큼 team 역할 presence active 존재 또는 force_start.
- `record_window` 잠금 중에는 team_station 이벤트 삽입 차단.
- consent=false 학생은 발표 세션의 녹음 이벤트 생성 차단.
- 오입장 재배정 시 station_presence.role만 갱신, 기존 event는 유지.

## 5. 초기 인덱스 우선순위
1. `record_event(session_id, team_id, round_no)`
2. `station_presence(session_id, role, status)`
3. `session(class_id, type, status, created_at DESC)`
4. `special_bundle(student_id, bundle_type, bundle_rank)`
