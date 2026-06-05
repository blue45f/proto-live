# ProtoLive 상용 배포 가이드

웹 + API를 분리 배포하는 2-tier 구성이다. API는 `DATABASE_URL`이 있으면 **Postgres**, 없으면
**JSON 파일 스토어**로 동작한다(드라이버 자동 선택). 비용 최소 운영은 아래 "비용 구조" 참고.

| 레이어 | 스택             | 호스트(비용 최소)              | 산출물                                         |
| ------ | ---------------- | ------------------------------ | ---------------------------------------------- |
| 프론트 | Vite + React SPA | **Vercel**(무료)               | `apps/web/dist` (정적) + `/api` 프록시 rewrite |
| API    | NestJS           | **단일 VM**(AWS Free Tier/OCI) | `node apps/api/dist/src/main.js` (Docker)      |
| DB     | Postgres / 파일  | **컨테이너 Postgres**(같은 VM) | `DATABASE_URL` / `PROJECT_STORE_PATH`          |

> **왜 `/api` 프록시인가** — 프론트는 `VITE_API_BASE_URL=/api`(상대경로)로 빌드된다. `vercel.json`의
> rewrite가 `/api/*`를 Render API로 프록시하면 브라우저는 단일 오리진 → **CORS·교차도메인 쿠키 문제 없음**.
> API는 전역 프리픽스 `/api`를 쓰므로 `/api/projects` → `https://<api>/api/projects`로 정확히 매핑된다.

> **도커 자체 호스팅 대안** — 클라우드 대신 직접 호스팅하려면 `docs/DEPLOYMENT.md`(web nginx + api 컨테이너 +
> `docker-compose.yml`)를 따른다. 아래는 Vercel + Render 매니지드 경로다.

> **권장: 단일 VM 백엔드(API + Postgres + Caddy 자동 HTTPS).** API는 `DATABASE_URL`이 있으면
> **Postgres**로, 없으면 JSON 파일로 영속한다(드라이버 자동 선택). 두 가지 클라우드 패키지를 제공한다:
>
> - **AWS EC2** — [`deploy/aws/README.md`](./deploy/aws/README.md). EC2 user-data가 부팅 시 전부 자동배포
>   (Docker·스왑·클론·`.env`/시크릿 생성·`docker compose up`·쇼케이스 시드)하고 `<공인IP>.sslip.io`로
>   Caddy 자동 TLS를 받는다. 별도 도메인 불필요. (ap-southeast-2 기준)
> - **OCI Always-Free ARM** — [`deploy/oci/README.md`](./deploy/oci/README.md). webtoon-index 패턴.
>
> 둘 다 프로비저닝 후 §2의 `vercel.json` `/api`(및 `/sitemap.xml`) rewrite 대상을 그 백엔드 도메인으로
> 바꾸면 프론트와 연결된다.

---

## 비용 구조 — 백엔드를 프론트만큼(또는 더) 싸게

목표: **프론트 ≤ 백엔드 비용 역전 없이, 백엔드를 프론트(무료)와 동급 $0** 으로. 핵심은 **관리형 서비스를 안 쓰는 것**.

| 레이어     | 선택                                                      | 월 비용                                            |
| ---------- | --------------------------------------------------------- | -------------------------------------------------- |
| 프론트     | **Vercel Hobby**(정적 CDN)                                | **$0**                                             |
| 백엔드 VM  | **AWS EC2 Free Tier** t3.micro/t2.micro 750h              | **$0 (12개월)** → 이후 ≈$7~8 + EBS ← 권장(현 운영) |
| 백엔드 VM  | OCI Always-Free ARM (OCI 계정 있을 때만)                  | **$0 (영구)** — 대안                               |
| DB         | **컨테이너 Postgres(`postgres:16-alpine`, 같은 VM 볼륨)** | **$0** (관리형 DB 미사용)                          |
| TLS/도메인 | **Caddy 자동 HTTPS + `<공인IP>.sslip.io`**                | **$0** (도메인 구매 불필요)                        |

**비용 최소화 원칙(반드시 회피):** 관리형 DB(RDS·Neon 유료·Render 유료 PG), 로드밸런서(ALB/NLB), NAT Gateway, Fargate·App Runner·ECS(시간당 과금). → 백엔드는 **단일 VM 한 대에 API+Postgres+Caddy를 Docker로** 올려 고정·최소 비용으로 운영한다(현 `deploy/aws`·`deploy/oci`가 이 구조).

- **현 운영 권장 = AWS Free Tier(12개월 $0)**. OCI Always-Free는 OCI 계정이 있을 때만 $0 영구 대안.
- DB는 절대 관리형으로 빼지 말 것 — 컨테이너 Postgres가 VM에 함께 떠서 별도 과금이 없다.
- Render 무료 API + 파일스토어(`render.yaml`)는 **데모/임시용**(유휴 시 슬립·재시작 시 데이터 휘발). 영속·저비용 운영은 위 VM 경로를 쓴다.

---

## 0. 준비물

- [Render](https://render.com) 계정, [Vercel](https://vercel.com) 계정
- 로컬: Node 22, `corepack enable`(pnpm 11.4)
- (CI 자동배포용, 선택) Vercel 토큰

## 1. API 배포 (Render)

레포에 `render.yaml` Blueprint가 있다.

1. Render → **New → Blueprint** → 이 레포 선택 → `render.yaml` 자동 감지.
2. 환경변수:
   - `PROTOLIVE_SESSION_SECRET` — Render가 자동 생성(`generateValue`).
   - `CORS_ORIGINS` — 2단계 후 Vercel 도메인으로 입력(쉼표 구분). `/api` 프록시만 쓰면 사실상 불필요하나 명시 권장.
   - `PROJECT_STORE_PATH` — 기본 `/tmp`(휘발성, 데모용). 영속하려면 Render Disk를 `/data`에 마운트하고 `/data/protolive-store.json`로 변경.
3. 배포 후 **API URL 확보**(예: `https://protolive-api.onrender.com`).
4. 헬스체크 `GET /api/health/ready` 200이면 정상.

> free 플랜은 15분 무요청 시 슬립 + 디스크 휘발(재시작 시 데이터 초기화). 상용은 Starter 이상 + Disk 권장.

## 2. 프론트 배포 (Vercel)

1. **배포 전** `vercel.json`의 `/api` rewrite destination 플레이스홀더
   **`CHANGE-ME-protolive-api.onrender.com`을 1단계 Render API URL로 교체**한다. 남아 있으면 모든 API 호출이 깨진다.
   ```jsonc
   { "source": "/api/:path*", "destination": "https://protolive-api.onrender.com/api/:path*" }
   ```
2. 최초 1회는 로컬에서 링크: `pnpm i -g vercel` → `vercel`(프리뷰 + 프로젝트 링크) → `vercel --prod`.
   - 설정은 `vercel.json`이 제공(빌드 `pnpm --filter protolive-frontend build`, 출력 `apps/web/dist`, `VITE_API_BASE_URL=/api`).
3. 배포 후 **프론트 도메인 확보**(예: `https://protolive.vercel.app`).

## 3. (선택) CI 자동 배포

`.github/workflows/deploy-vercel.yml`은 `VERCEL_TOKEN` 시크릿이 있으면 main push 시 프론트를 자동 배포한다(없으면 스킵).
GitHub → Settings → Secrets → `VERCEL_TOKEN` 등록.

## 4. URL 정합

- Render `CORS_ORIGINS` = Vercel 공개 도메인.
- (선택) 커스텀 도메인 연결 후 동일하게 갱신.

## 5. 배포 후 점검

- [ ] 프론트 도메인 접속 → 피드/카드 표시(`/api` 프록시 정상)
- [ ] `GET https://<프론트>/api/health/ready` 200
- [ ] 로그인(테스트 계정) → 업보트/리뷰 동작, 세션 쿠키 유지
- [ ] `/projects/:id`, `/makers/:id`, `/admin` 직접 진입 시 SPA 폴백 정상
