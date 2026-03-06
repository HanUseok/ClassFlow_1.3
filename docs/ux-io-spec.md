# UX I/O Spec (프로토타입 기준)

- Verified Date: 2026-03-06
- 범위: 현재 구현된 Teacher/Station UX 전체 플로우의 입력/출력 데이터

## 1) 루트 진입 (`/`)
### Input
- 없음

### Output
- `/teacher` 리다이렉트

## 2) Teacher 대시보드 (`/teacher`)
### Input
- `Session[]`
- `Student[]`
- `DebateEvent[]`
- `FeaturedEvidenceMap`
- `DEADLINES[]`

### Output
- Pending 세션 요약
- 준비 상태 집계: `withEvidence`, `withoutEvidence`, `withFeatured`
- 관찰 필요 학생 목록
- 최근 근거 digest
- report kind 집계(`presentation`, `free-debate`, `ordered-debate`)
- `readyNowEvidence[]`
- quality badge 계산 결과

### Example
```json
{
  "prepared": { "withEvidence": 18, "withoutEvidence": 4, "withFeatured": 9 },
  "watchGroups": {
    "noEvidence": [{ "studentId": "s13", "name": "문서현" }],
    "noRepresentative": [{ "studentId": "s2", "name": "이서준" }]
  },
  "readyNowEvidence": [
    {
      "studentId": "s1",
      "speechType": "Claim",
      "quality": "구체적"
    }
  ]
}
```

## 3) 세션 목록 (`/teacher/sessions`)
### Input
- 필터: `type`, `status`, `query`
- `Session[]`

### Output
- 필터링된 세션 리스트
- 상태별 라우팅 대상

### Example
```json
{
  "filters": { "type": "Debate", "status": "Live", "query": "기후" },
  "resultCount": 1
}
```

## 4) 세션 생성/수정 (`/teacher/sessions/create`)
### Debate Input
- `topic`, `classId`, `selectedStudentIds`
- `debateMode`, `teacherGuided`, `orderedStages`
- `groupCount`, `affirmativeSlots`, `negativeSlots`, `moderatorSlots`
- `groupAssignments`, `groupSlotAdjust`
- `argumentCards[]`
- `recordingStudentIds`
- 규칙: 선택 학생 전원이 녹음 대상이면 cards 단계 생략 가능

### Debate Output
- `CreateSessionInput` 생성
- `Session` 생성/수정 후 상세 화면 이동
- `debate.assignmentConfig.recordingStudentIds` 저장

### Debate Example
```json
{
  "type": "Debate",
  "topic": "AI가 교수법을 대체해야 하는가",
  "debate": {
    "mode": "Ordered",
    "teacherGuided": true,
    "assignmentConfig": {
      "groupCount": 2,
      "affirmativeSlots": 2,
      "negativeSlots": 2,
      "moderatorSlots": 1,
      "selectedStudentIds": ["s1", "s2", "s3", "s4"]
    }
  }
}
```

### Presentation Input
- `presenters[]`
- `presentationMinutesPerStudent`
- `recordingEnabled` per presenter

### Presentation Output
- `presentation.secondsPerPresenter`
- `Session` 생성/수정 후 상세 화면 이동
- 발표 리포트 row 생성을 위한 presenter 메타 저장

### Presentation Example
```json
{
  "type": "Presentation",
  "presentation": {
    "secondsPerPresenter": 300,
    "presenters": [
      { "studentId": "s1", "recordingEnabled": true },
      { "studentId": "s2", "recordingEnabled": false }
    ]
  }
}
```

## 5) 세션 상세 (`/teacher/sessions/[id]`)
### Debate Input
- 세션 상태/그룹/모드
- 진행 액션: 시작/종료/이전/다음/순서변경/단계변경

### Debate Output
- 상태 전이: `Pending -> Live -> Ended`
- 그룹/발언 순서 갱신
- 종료 시 `/station/report` payload 생성
- Free mode에서는 `speechType` (`질문/반박/동의`)를 로그에 포함 가능

### Presentation Input
- 발표 순서, 발표 시간, 녹음 여부
- 액션: start/end/next

### Presentation Output
- 상태 전이
- 종료 후 요약 테이블 렌더(현재 규칙 기반)
- 발표자별 리포트 row 계산
- 발표자 프로필 목록 + 선택 발표자 상세 리포트 렌더

### Presentation Report Row Example
```json
{
  "presenterOrder": 1,
  "studentName": "김민준",
  "recording": true,
  "topicKeywords": ["지역경제", "디지털 전환", "공공성"],
  "problemKeywords": [],
  "researchMethodKeywords": ["설문 조사"],
  "analysisKeywords": ["적용 범위 확장", "원인-결과", "대안 제시"],
  "majorConnectionKeywords": ["교육학", "디자인"],
  "competencyKeywords": ["질문 설계"],
  "growthKeywords": []
}
```

## 6) Station (`/station`)
### Input
- 활성 Debate 세션
- `selectedStudentId`
- `selectedGroupIndex`
- 배치 drag/drop 데이터

### Output
- entry state 전이: `landing -> identity -> group -> waiting -> live`
- 발화 제어 결과 반영
- 참여자가 녹음 대상이 아니면 기록 제한 UI 반영
- 종료 시 `/station/report?...&source=station`

### Example
```json
{
  "entryState": "group",
  "selectedStudentId": "s4",
  "selectedGroupIndex": 1
}
```

## 7) Station 리포트 (`/station/report`)
### Input (query)
- `round`, `phase`, `logs`, `names`
- `sessionId`, `teacherGuided`, `sessionTitle`, `sessionStatus`
- `groupCount`, `groupLayout`
- `view=report|manage`, `source`

### Output
- Ordered/Free 리포트 렌더
- `source=station` 시 report view 강제
- query 파싱 실패 시 fallback 렌더

### Log Example
```json
{
  "phase": "Opening",
  "speaker": "찬성 1 김민준",
  "argumentCard": "1) 뇌 발달/중독 메커니즘",
  "thinkingCard": "적용",
  "argumentKeyword": "보상회로",
  "thinkingKeyword": "사례 연결"
}
```

## 8) Teacher 리포트 (`/teacher/sessions/[id]/report`)
### Input
- `sessionId`
- 세션 멤버/그룹 데이터

### Output
- Debate: 학생 프로필 목록 + 선택 학생 상세 리포트
- Presentation: 발표자 프로필 목록 + 선택 발표자 상세 리포트

### Presentation Report Table Example
```json
[
  {
    "presenterOrder": 1,
    "studentName": "김민준",
    "recording": true,
    "topicKeywords": ["지역경제", "디지털 전환", "공공성"],
    "problemKeywords": [],
    "researchMethodKeywords": ["설문 조사"],
    "analysisKeywords": ["적용 범위 확장", "원인-결과", "대안 제시"],
    "majorConnectionKeywords": ["교육학", "디자인"],
    "competencyKeywords": ["질문 설계"],
    "growthKeywords": []
  },
  {
    "presenterOrder": 2,
    "studentName": "이서준",
    "recording": true,
    "topicKeywords": ["지역경제", "디지털 전환", "공공성"],
    "problemKeywords": ["비용 부담", "격차 심화"],
    "researchMethodKeywords": ["설문 조사"],
    "analysisKeywords": ["가정 검증", "적용 범위 확장", "원인-결과"],
    "majorConnectionKeywords": [],
    "competencyKeywords": ["질문 설계"],
    "growthKeywords": ["탐구 태도 강화", "관점 전환", "표현 자신감"]
  }
]
```

## 9) 학생 (`/teacher/students`, `/teacher/students/[id]`)
### Input
- 검색어, 학급 필터, 학생 id
- `FeaturedEvidenceMap`
- `Session[]`
- `DebateEvent[]`

### Output
- 필터링된 학생 목록
- 학생별 세션/근거 히스토리
- 학생 목록 우선순위 정렬 결과
- `근거 없음`, `대표 사례 없음` badge 상태
- 학생 상세의 대표 사례 목록
- 세특 작성 모드용 참고 문장
- 역량별 근거 그룹(`academic`, `career`, `community`, `unclassified`)
- 최근 레포트 반영 근거
- 전체 기록 보기용 세션 아코디언

## 10) 설정 (`/teacher/settings`)
### Input
- 탭 선택
- 스테이션 역할 변경/삭제 액션

### Output
- UI 상태 변경(현재 서버 영속화 없음)

## 데이터 성격 구분
- 저장됨(persisted): `Session`, `debate.assignmentConfig`, `presentation.presenters`, featured evidence
- 계산됨(derived): 대시보드 집계, 관찰 필요 목록, Debate/Presentation 리포트 키워드 row, 학생 우선순위, quality badge, 역량 그룹핑
- 화면 전용(ui-local): Station entry state, 토론 런타임 state, 필터 입력값
