# ClassFlow API 명세 초안 (v1.0)

## 1. 공통
- Base URL: `/api/v1`
- Auth: `Authorization: Bearer <token>`
- Time 기준: 서버 UTC 저장, 클라이언트는 KST 표시
- 응답 포맷
```json
{
  "data": {},
  "error": null,
  "meta": {}
}
```
- 오류 포맷
```json
{
  "data": null,
  "error": {
    "code": "INVALID_STATE",
    "message": "Session already started"
  },
  "meta": {}
}
```

## 2. 핵심 리소스
- `Session`: debate/presentation
- `Team`, `SlotTemplate`, `SlotAssignment`
- `StationInvite`, `StationPresence`
- `RecordEvent`
- `Consent`
- `SpecialBundle`

## 3. Teacher API

### 3.1 세션
- `POST /sessions`
  - 설명: 토론/발표 세션 생성
  - body:
```json
{
  "type": "debate",
  "class_id": "class_101",
  "topic": "교복 자율화",
  "student_ids": ["s1", "s2"],
  "round_count": 3,
  "record_window_sec": 60,
  "teams": [
    { "team_no": 1, "member_ids": ["s1"], "side": "pro" }
  ],
  "slot_templates": [
    { "order": 1, "side": "pro", "speech_type": "claim", "duration_sec": 90 }
  ],
  "slot_assignment_mode": "rotation"
}
```
- `GET /sessions`
  - query: `type`, `class_id`, `status`, `from`, `to`, `cursor`, `limit`
- `GET /sessions/{session_id}`
- `PATCH /sessions/{session_id}`
  - 설명: 시작 전 설정 수정
- `POST /sessions/{session_id}/start`
  - body: `{ "force_start": false, "reason": "" }`
- `POST /sessions/{session_id}/pause`
- `POST /sessions/{session_id}/resume`
- `POST /sessions/{session_id}/end`

### 3.2 로비/초대/입장 현황
- `POST /sessions/{session_id}/invites`
  - body: `{ "target_roles": ["desk", "team:1", "team:2"], "expire_hours": 24 }`
- `GET /sessions/{session_id}/presence`
  - 설명: 역할별 입장/heartbeat 현황
- `POST /sessions/{session_id}/reassign-station`
  - body: `{ "station_id": "st_2", "new_role": "team:3" }`

### 3.3 진행 제어
- `POST /sessions/{session_id}/advance-slot`
- `POST /sessions/{session_id}/rewind-slot`
- `POST /sessions/{session_id}/override-speaker`
  - body: `{ "round_no": 2, "slot_order": 3, "student_id": "s14" }`

### 3.4 종료 후 검토/승인
- `GET /sessions/{session_id}/summary`
- `POST /sessions/{session_id}/approve-all`
- `POST /sessions/{session_id}/events/{event_id}/invalidate`
  - body: `{ "reason": "오입력" }`
- `POST /sessions/{session_id}/record-window/reopen`
  - body: `{ "team_id": "t1", "duration_sec": 120, "reason": "교사 수정" }`

### 3.5 학생/세특
- `GET /students`
- `GET /students/{student_id}/timeline`
- `POST /students/{student_id}/special-bundles/recommend`
  - 설명: Primary 3~5 자동 추천 생성
- `GET /students/{student_id}/special-bundles`
- `PATCH /students/{student_id}/special-bundles/{bundle_id}`
  - body: `{ "selected_event_ids": ["e1", "e2"] }`
- `POST /students/{student_id}/special-bundles/{bundle_id}/finalize`

### 3.6 동의
- `PUT /students/{student_id}/consent`
  - body: `{ "recording_consent": true, "updated_by": "teacher_1" }`

## 4. Station API

### 4.1 등록/입장
- `POST /stations/register`
  - body: `{ "device_name": "iPad-2", "role_request": "team:1" }`
- `POST /stations/{station_id}/approve`
  - 설명: Teacher 승인 콜백용
- `GET /stations/{station_id}/invites`
- `POST /stations/{station_id}/join`
  - body: `{ "invite_token": "..." }`

### 4.2 실시간 상태
- `POST /stations/{station_id}/heartbeat`
  - body: `{ "session_id": "se1", "role": "team:1", "last_seq": 12 }`
- `GET /stations/{station_id}/live-state?session_id=se1`
  - 설명: 현재 라운드/슬롯/타이머/팀 제출현황

### 4.3 기록 입력
- `POST /sessions/{session_id}/events`
  - body:
```json
{
  "event_client_id": "cli-uuid",
  "team_id": "t1",
  "round_no": 1,
  "slot_order": 2,
  "side": "con",
  "speech_type": "rebuttal",
  "speaker_id": "s3",
  "strategy_tag": "evidence",
  "created_at_client": "2026-02-26T04:00:00Z"
}
```
- `POST /sessions/{session_id}/events/{event_id}/undo`
  - 제약: 생성 후 3초 이내, 작성자만.
- `GET /sessions/{session_id}/teams/{team_id}/events?round_no=1`

### 4.4 오프라인 큐 재전송
- `POST /sessions/{session_id}/events/batch`
  - 설명: 큐 이벤트 일괄 재전송(멱등 처리)

## 5. 상태/권한 규칙
- 시작 전(`draft`)에서만 팀/슬롯 구조 변경 가능.
- `live` 상태에서 Teacher만 `pause/resume/end/override`.
- 팀 스테이션은 자기 팀 이벤트만 작성 가능.
- 잠금 후 이벤트 수정은 Teacher 재오픈 윈도우 내에서만 가능.

## 6. 주요 에러 코드
- `INVITE_EXPIRED`
- `ROLE_CONFLICT`
- `SESSION_NOT_READY`
- `SESSION_ALREADY_STARTED`
- `RECORD_WINDOW_LOCKED`
- `UNDO_EXPIRED`
- `EVENT_LIMIT_REACHED`
- `CONSENT_REQUIRED`
- `FORBIDDEN_SCOPE`

## 7. 웹소켓 채널 (권장)
- `ws://.../sessions/{session_id}`
  - 이벤트:
    - `session.started`
    - `session.paused`
    - `session.resumed`
    - `slot.changed`
    - `record.window.opened`
    - `record.window.locked`
    - `team.submission.updated`
    - `station.presence.updated`
