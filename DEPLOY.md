# ProtoLive 상용 배포 가이드

웹 + API를 분리 배포하는 2-tier 구성이다. ProtoLive는 외부 DB 없이 원자적 JSON 파일 스토어를
쓰므로 webtoon-index 대비 DB/OAuth 레이어가 없어 더 단순하다.

| 레이어 | 스택             | 호스트               | 산출물                                         |
| ------ | ---------------- | -------------------- | ---------------------------------------------- |
| 프론트 | Vite + React SPA | **Vercel**           | `apps/web/dist` (정적) + `/api` 프록시 rewrite |
| API    | NestJS           | **Render**(상시구동) | `node apps/api/dist/src/main.js`               |
| 저장소 | 원자적 JSON 파일 | API 디스크           | `PROJECT_STORE_PATH`                           |

> **왜 `/api` 프록시인가** — 프론트는 `VITE_API_BASE_URL=/api`(상대경로)로 빌드된다. `vercel.json`의
> rewrite가 `/api/*`를 Render API로 프록시하면 브라우저는 단일 오리진 → **CORS·교차도메인 쿠키 문제 없음**.
> API는 전역 프리픽스 `/api`를 쓰므로 `/api/projects` → `https://<api>/api/projects`로 정확히 매핑된다.

> **도커 자체 호스팅 대안** — 클라우드 대신 직접 호스팅하려면 `docs/DEPLOYMENT.md`(web nginx + api 컨테이너 +
> `docker-compose.yml`)를 따른다. 아래는 Vercel + Render 매니지드 경로다.

> **권장: OCI Always-Free 백엔드(API + Postgres + Caddy)** — webtoon-index(툰스펙트럼)와 동일하게
> OCI ARM VM 한 대에 NestJS API + Postgres + Caddy(자동 HTTPS)를 올리는 경로를 추가했다. API는 이제
> `DATABASE_URL`이 있으면 **Postgres**로, 없으면 JSON 파일로 영속한다(드라이버 자동 선택).
> 절차는 [`deploy/oci/README.md`](./deploy/oci/README.md) 참고. 프로비저닝 후 §2의 `vercel.json`
> `/api` rewrite 대상을 OCI 도메인(`https://{DOMAIN}/api/:path*`)으로 바꾸면 된다.

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
