# ProtoLive 테스트 계정(로컬)

본 파일은 로컬 개발/QA에서 사용하는 테스트 계정/샘플 데이터 정보입니다. 로컬 앱은 테스트 계정 파일을 기반으로 이메일+비밀번호 로그인으로 역할을 식별합니다.

기본 시드 반영:
```bash
npm run seed:test-accounts
```

실제 테스트용 프로젝트/제안/이벤트까지 한 번에 반영:
```bash
npm run seed:test-data
```

실데이터 반영 없이 예정 변경만 확인:
```bash
npm run seed:test-accounts -- --dry-run
```

```bash
npm run seed:test-data -- --dry-run
```

`backend/fixtures/test-accounts.json`은 계정 시드 전용이며,
`backend/fixtures/test-data.json`은 계정 + 프로젝트 + 제안 + 이벤트(총괄 테스트 데이터)를 제공합니다.
두 파일 모두 `backend/data/protolive-store.json`(혹은 `PROJECT_STORE_PATH`)에 반영됩니다.

## 파일 위치
- `backend/fixtures/test-accounts.json`

## 기본 규칙
- 실제 운영용 계정/비밀번호로 사용하지 마세요.
- 현재 앱은 테스트 계정의 **이메일 + 비밀번호** 조합을 확인합니다.
- 로그인 후에도 메이커/투자자 역할이 고정되어 동작합니다.
- 관리자 영역은 상단 메뉴 또는 `?view=admin`, 또는 `/admin` 경로로 진입할 수 있습니다.

## 계정 목록

| 구분 | 이메일 | password | 역할 | 용도 |
| --- | --- | --- | --- | --- |
| 테스트 메이커 A | `maker-a@protolive.local` | `pass-mock-01` | `maker` | 신규 프로젝트 등록/수정/이벤트 흐름 확인 |
| 테스트 메이커 B | `maker-b@protolive.local` | `pass-mock-02` | `maker` | 다중 메이커 비교와 중복처리 확인 |
| 테스트 투자자 A | `investor-a@protolive.local` | `pass-mock-03` | `investor` | 매칭 제안/관심신호 수집 확인 |
| 테스트 투자자 B | `investor-b@protolive.local` | `pass-mock-04` | `investor` | 투자자 분산 지표 및 수익 시뮬레이션 테스트 |
| 테스트 메이커 C | `maker-c@protolive.local` | `pass-mock-05` | `maker` | 다중 소유자/스크린 테스트용 |
| 테스트 투자자 C | `investor-c@protolive.local` | `pass-mock-06` | `investor` | 고빈도 제안 시나리오 검증용 |

## 사용 가이드
1. 로그인 후 프로젝트 등록·관리는 메이커 계정만 사용합니다.
2. 로그인 모달 내에 `테스트 계정` 빠른 선택 버튼을 이용해 이메일/비밀번호를 한 번에 채울 수 있습니다.
3. 메이커/투자자 역할 테스트는 같은 계정을 사용해 로그인 반복 시 동일 세션 규칙이 적용되는지 확인합니다.
3. 운영용 DB/비밀번호 정책 적용 전에는 로컬 전용 목 데이터로만 사용합니다.
