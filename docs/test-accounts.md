# ProtoLive 테스트 계정(로컬)

본 파일은 로컬 개발/QA에서 사용하는 테스트 계정 정보입니다. 실제 인증 시스템이 붙지 않는 현재 버전에서는 이메일만으로 메이커/투자자 역할이 구분됩니다.

로컬 스토어 반영:
```bash
npm run seed:test-accounts
```

`backend/fixtures/test-accounts.json`에 있는 계정은 `backend/data/protolive-store.json`(혹은 `PROJECT_STORE_PATH`) 사용자 목록에 반영됩니다.

## 파일 위치
- `backend/fixtures/test-accounts.json`

## 기본 규칙
- 실제 운영용 계정/비밀번호로 사용하지 마세요.
- 현재 앱은 이메일(텍스트 입력) 기반으로 역할이 전환되며 비밀번호는 화면에서 요구되지 않습니다.
- 관리자 영역은 상단 메뉴 또는 `?view=admin`, 또는 `/admin` 경로로 진입할 수 있습니다.

## 계정 목록

| 구분 | 이메일 | password | 역할 | 용도 |
| --- | --- | --- | --- | --- |
| 테스트 메이커 A | `maker-a@protolive.local` | `pass-mock-01` | `maker` | 신규 프로젝트 등록/수정/이벤트 흐름 확인 |
| 테스트 메이커 B | `maker-b@protolive.local` | `pass-mock-02` | `maker` | 다중 메이커 비교와 중복처리 확인 |
| 테스트 투자자 A | `investor-a@protolive.local` | `pass-mock-03` | `investor` | 매칭 제안/관심신호 수집 확인 |
| 테스트 투자자 B | `investor-b@protolive.local` | `pass-mock-04` | `investor` | 투자자 분산 지표 및 수익 시뮬레이션 테스트 |

## 사용 가이드
1. 앱에서 프로젝트 등록 시 `이메일` 입력란에 위 주소 중 하나를 사용합니다.
2. 메이커/투자자 역할 테스트는 같은 이메일을 반복 사용해 유저가 재사용되는지 확인합니다.
3. 운영용 DB/비밀번호 정책 적용 전에는 로컬 전용 목 데이터로만 사용합니다.
