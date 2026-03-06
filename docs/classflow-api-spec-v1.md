# ClassFlow API Spec v1 (현행 구현 기준)

## 상태
- Verified Date: 2026-03-06
- 현재 프로젝트는 Next.js 클라이언트 앱이며 백엔드 API가 구현되어 있지 않음
- 이 문서는 현재 내부 서비스 계약과 향후 HTTP API 전환 기준을 함께 정의함

## 1) 현재 구현된 내부 서비스 계약 (Application Layer)

### Session Service (`lib/application/session-service.ts`)
- `listSessions()`
- `getSession(sessionId)`
- `createSession(input)`
- `startSession(sessionId)`
- `endSession(sessionId)`
- `setSessionStatus(sessionId, status)`
- `updateSessionBasics(sessionId, input)`
- `overwriteSessionFromInput(sessionId, input)`
- `assignGroups(sessionId, groups)`
- `assignTeams(sessionId, teams)`
- `deleteSession(sessionId)`
- `deleteAllSessions()`
- `subscribeSessionChanges(listener)`
- `completeStationDebate(params)`

### Roster Service (`lib/application/roster-service.ts`)
- `listClasses()`
- `listStudents()`
- `listStations()`
- `listDebateEvents()`

## 2) 현재 데이터 전달 방식
- Session/Student/Station 데이터: `mock-data` + `localStorage`
- 리포트: `/station/report` query string 직렬화 방식

## 3) 향후 HTTP API 전환 시 최소 엔드포인트 제안
- `GET /api/v1/sessions`
- `POST /api/v1/sessions`
- `PATCH /api/v1/sessions/{id}`
- `POST /api/v1/sessions/{id}/status`
- `GET /api/v1/students`
- `GET /api/v1/students/{id}`
- `GET /api/v1/sessions/{id}/report`

## 4) 발표 리포트 계약 추정

### 목적
- Presentation 세션 종료 후, 발표자별 키워드 테이블을 API 응답이나 내부 service 결과로 직렬화할 때의 기준 모델

### Suggested Response Shape
```json
{
  "sessionId": "sess-123",
  "sessionType": "Presentation",
  "rows": [
    {
      "presenterOrder": 1,
      "studentId": "s1",
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
  ]
}
```

### Suggested Endpoint
- `GET /api/v1/sessions/{id}/presentation-report`

### Notes
- 현재 코드에는 실제 HTTP API가 없음
- 위 응답의 키워드 배열은 현재 구현 기준으로는 규칙 기반 계산 결과에 가까움
- 서버 전환 시 `presentation.presenters[]`는 저장 데이터, `rows[]`는 계산 결과 또는 별도 저장 테이블로 분리하는 편이 안전함

## 5) 비고
- 위 HTTP 엔드포인트는 제안 단계이며 현재 코드에는 미구현
- 실제 도입 시 현재 service 함수 시그니처를 우선 호환 대상으로 삼는 것을 권장
