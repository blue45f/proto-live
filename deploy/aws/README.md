# ProtoLive AWS 백엔드 배포 (EC2)

OCI 대신 **AWS EC2 한 대**에 **NestJS API + Postgres + Caddy(자동 HTTPS)** 를 올린다. 프론트는 Vercel 유지.
별도 도메인 없이 **`<공인IP>.sslip.io`** 로 Caddy가 Let's Encrypt 인증서를 받는다.

```
브라우저 ─▶ Vercel(정적 SPA)
            └ /api/* ─(vercel.json rewrite)─▶ https://<ip>.sslip.io/api/* ─▶ Caddy ─▶ api:3003 ─▶ Postgres
```

앱 코드는 호스트 무관이다(`DATABASE_URL` 있으면 Postgres). 컨테이너 스택은 `deploy/oci`와 동일.

## 1. EC2 인스턴스 시작 (콘솔, ap-southeast-2 시드니)

EC2 → **Launch instance**:

- **AMI**: Ubuntu Server 24.04 LTS (또는 22.04)
- **Instance type**: **`t3.micro`(Free Tier, 12개월 $0)** 권장 — user-data가 2GB 스왑을 만들어 1GB에서도 빌드 OOM을 막는다. 빌드를 더 빠르고 여유 있게 하려면 `t3.small`(2GB, 유료). 비용 최소가 목적이면 t3.micro.
- **Key pair**: 디버깅용 SSH 키 하나 선택(없으면 생성).
- **Network / 보안 그룹 인바운드**: **HTTP 80**, **HTTPS 443** 를 `0.0.0.0/0` 허용 (SSH 22는 본인 IP만 권장).
- **고급 세부 정보 → 사용자 데이터(User data)**: [`user-data.sh`](./user-data.sh) 내용 전체 붙여넣기.
- 시작.

> user-data가 부팅 시 자동으로: 스왑 → Docker → 레포 클론 → 공인 IP로 `.env`/시크릿 생성 → `docker compose up --build` → Postgres에 쇼케이스 5개 시드까지 수행한다. (약 3~6분)

## 2. 기동 확인

- 인스턴스의 **퍼블릭 IPv4** 확인(예: `13.54.1.23`). 도메인은 점을 하이픈으로: `13-54-1-23.sslip.io`.
- 몇 분 뒤:
  ```
  curl https://<dash-ip>.sslip.io/api/health/ready    # {"status":"ready","store":"ok",...}
  curl "https://<dash-ip>.sslip.io/api/projects?limit=3"   # 시드 5개 중 일부
  ```
- 안 뜨면 SSH 후: `sudo tail -f /var/log/protolive-bootstrap.log`

> **퍼블릭 IP 고정**: 인스턴스 stop/start 시 IP가 바뀐다. **Elastic IP**를 할당·연결하면 도메인이 고정된다(권장). EIP 변경 시 `.env`의 DOMAIN을 새 IP로 바꾸고 `docker compose up -d` 재기동.

## 3. Vercel 연결

`vercel.json` 의 `/api` rewrite 대상을 이 도메인으로 바꾼다:

```json
{ "source": "/api/:path*", "destination": "https://<dash-ip>.sslip.io/api/:path*" }
{ "source": "/sitemap.xml", "destination": "https://<dash-ip>.sslip.io/api/sitemap.xml" }
```

커밋·배포하면 `https://proto-live.vercel.app/api` 가 EC2 백엔드로 연결된다. (공인 IP만 알려주면 이 단계는 대신 처리 가능.)

## 운영 메모

- **재배포**: `cd /opt/protolive && git pull && docker compose -f deploy/aws/docker-compose.yml up -d --build`
- **백업**: `docker compose exec db pg_dump -U protolive protolive > backup.sql`
- **시드 재실행**: `docker compose exec -T api sh -c "cd /repo && DATABASE_URL=postgres://protolive:<PW>@db:5432/protolive pnpm seed:demo-data"`
- **데이터 영속**: `pgdata` 도커 볼륨(EBS). 인스턴스 종료(terminate) 시 EBS도 삭제되므로 백업 보관 권장.
- 스키마는 API 부팅 시 idempotent DDL로 자동 보장(별도 마이그레이션 단계 없음).
