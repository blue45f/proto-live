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

`apps/web/src/data/test-accounts.json`은 로컬 로그인 모달이 읽는 계정 파일입니다.
`apps/api/fixtures/test-data.json`은 계정 + 프로젝트 + 제안 + 이벤트 + 리뷰 + 감사 로그(총괄 테스트 데이터)를 제공합니다.
두 파일 모두 `apps/api/data/protolive-store.json`(혹은 `PROJECT_STORE_PATH`)에 반영됩니다.

## 파일 위치

- `apps/api/fixtures/test-accounts.json`

## 기본 규칙

- 실제 운영용 계정/비밀번호로 사용하지 마세요.
- 현재 앱은 테스트 계정의 **이메일 + 비밀번호** 조합을 확인합니다.
- 로그인 후에도 메이커/투자자/일반 회원/운영자 역할이 고정되어 동작합니다.
- 관리자 영역은 운영자 계정으로 로그인한 뒤 상단 메뉴 또는 `?view=admin`, 또는 `/admin` 경로로 진입할 수 있습니다.

## 계정 목록

| 구분                | 이메일                              | password         | 역할       | 용도                                    |
| ------------------- | ----------------------------------- | ---------------- | ---------- | --------------------------------------- |
| 밀맵 팀             | `maker-mealmap@protolive.local`     | `pass-mock-01`   | `maker`    | 프로젝트 등록, 리뷰 답글 확인           |
| 케어루프 팀         | `maker-careloop@protolive.local`    | `pass-mock-02`   | `maker`    | 선별 공개 사이트 운영 확인              |
| 그로스 샘플 팀      | `maker-growth@protolive.local`      | `pass-mock-05`   | `maker`    | 다중 프로토타입 운영 확인               |
| 시드 투자자         | `investor-seed@protolive.local`     | `pass-mock-03`   | `investor` | 투자 관심, 법무/개인정보 동의 흐름 확인 |
| 임팩트 투자자       | `investor-impact@protolive.local`   | `pass-mock-04`   | `investor` | 성장 지원 의견과 제안 확인              |
| 커머스 투자자       | `investor-commerce@protolive.local` | `pass-mock-06`   | `investor` | 소비자 앱 리뷰/투자 관심 확인           |
| 학부모 회원         | `member-parent@protolive.local`     | `pass-member-01` | `member`   | 일반 사용자 리뷰와 별점 확인            |
| 러닝 초보 회원      | `member-runner@protolive.local`     | `pass-member-02` | `member`   | 일반 의견과 대댓글 확인                 |
| 쇼핑 사용자 회원    | `member-shopper@protolive.local`    | `pass-member-03` | `member`   | 커머스 프로토타입 리뷰 확인             |
| 프로토라이브 운영자 | `admin-ops@protolive.local`         | `pass-admin-01`  | `admin`    | 신고 리뷰 검토, 운영 감사 로그 확인     |

## 사용 가이드

1. 로그인 후 프로젝트 등록·관리는 메이커 계정만 사용합니다.
2. 로그인 모달 내에 `테스트 계정` 빠른 선택 버튼을 이용해 이메일/비밀번호를 한 번에 채울 수 있습니다.
3. 로그인 성공 시 백엔드가 httpOnly 세션 쿠키를 발급하며, 관리자/투자/리뷰 작성 권한은 이 서버 세션 기준으로 검증합니다.
4. 메이커/투자자/회원/운영자 역할 테스트는 로그아웃 후 다시 로그인해 세션 재발급과 권한 차단이 함께 동작하는지 확인합니다.
5. 운영용 DB/비밀번호 정책 적용 전에는 로컬 전용 목 데이터로만 사용합니다.
