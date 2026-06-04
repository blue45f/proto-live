# ProtoLive OCI 백엔드 배포

프론트엔드는 **Vercel**(무료 글로벌 CDN), 백엔드는 **OCI Always-Free ARM VM 한 대**에
**NestJS API + Postgres + Caddy(자동 HTTPS)**로 올린다. webtoon-index(툰스펙트럼)와 동일한 패턴.

```
브라우저 ──▶ Vercel(정적 SPA)
            └─ /api/* ──(vercel.json rewrite)──▶ https://{DOMAIN}/api/* ──▶ Caddy ──▶ api:3003 ──▶ Postgres
```

동일 출처(`/api` 프록시)라 브라우저 CORS·쿠키가 단순해진다.

## 1. VM 생성 (OCI 콘솔)

- Always-Free **Ampere A1 (arm64)**, Ubuntu 22.04/24.04, 부팅 볼륨 기본.
- 네트워킹: VCN 의 보안 목록(또는 NSG)에서 **80/443 인그레스 허용**.
- "고급 옵션 → Cloud-init 스크립트"에 [`cloud-init.yaml`](./cloud-init.yaml) 붙여넣기
  (Docker 설치 + 방화벽 + 레포 클론 `/opt/protolive`).

## 2. DNS

- `DOMAIN`(예: `api.proto-live.example.com`)의 A 레코드 → VM 공인 IP.

## 3. 배포 (SSH 접속 후)

```bash
cd /opt/protolive/deploy/oci
cp .env.example .env
vi .env   # DOMAIN, ACME_EMAIL, POSTGRES_PASSWORD, PROTOLIVE_SESSION_SECRET 채우기
          #   openssl rand -base64 24   # POSTGRES_PASSWORD
          #   openssl rand -base64 32   # PROTOLIVE_SESSION_SECRET

docker compose up -d --build
docker compose logs -f api      # 부팅 확인(스키마는 부팅 시 자동 생성)
```

헬스 체크:

```bash
curl https://{DOMAIN}/api/health/ready   # {"status":"ready","store":"ok",...}
```

## 4. Vercel 프록시 연결

`vercel.json` 의 `/api` rewrite 대상을 OCI 도메인으로 바꾼다:

```json
{ "source": "/api/:path*", "destination": "https://{DOMAIN}/api/:path*" }
```

커밋·배포하면 `https://proto-live.vercel.app` 의 `/api` 가 OCI 백엔드로 연결된다.

## 5. 샘플 데이터 시딩(선택)

```bash
# VM 에서, DATABASE_URL 을 내부 db 로 지정해 시드 스크립트 실행
cd /opt/protolive
DATABASE_URL="postgres://protolive:<PW>@127.0.0.1:5432/protolive" \
  pnpm seed:demo-data    # fixtures/test-data.json → Postgres
```

> 참고: 시드 스크립트는 파일 스토어 경로(`PROJECT_STORE_PATH`)에 쓰므로, DB 시딩은 API 를 통해
> 적재하거나 `fixtures` 를 로드하는 방식을 사용한다. 자세한 건 상위 `DEPLOY.md` 참고.

## 운영 메모

- **백업**: `docker compose exec db pg_dump -U protolive protolive > backup.sql`
- **업데이트**: `git pull && docker compose up -d --build`
- **스키마**: API 부팅 시 idempotent DDL 로 보장(별도 마이그레이션 단계 없음). per-entity 쿼리로
  이전할 때 `drizzle-kit` 마이그레이션 도입 가능.
- **데이터 영속**: `pgdata` 도커 볼륨(VM 블록 스토리지). 컨테이너 재시작에도 보존.
