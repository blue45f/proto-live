# 배포 가이드 (Docker)

ProtoLive는 두 개의 컨테이너로 구성됩니다.

- **web** — Vite + React 정적 빌드를 비루트 nginx(`nginx-unprivileged`)로 서빙
- **api** — NestJS 서버. 외부 DB 없이 원자적 JSON 파일 스토어를 사용

두 앱은 하나의 **pnpm 워크스페이스**(루트 `pnpm-workspace.yaml` + `pnpm-lock.yaml`, `packageManager: pnpm@11.4.0`)로 묶여 있으며, Dockerfile은 각 앱 디렉터리에 있지만 **빌드 컨텍스트는 리포지토리 ROOT**입니다(워크스페이스 매니페스트 + 잠금 파일 + 모든 apps가 컨텍스트에 있어야 `pnpm install --frozen-lockfile`이 재현 가능하게 동작).

- `apps/api/Dockerfile` — `node:22-alpine` 멀티스테이지(deps → build → 비루트 runtime), corepack `pnpm@11.4.0` + `pnpm install --frozen-lockfile` + `pnpm --filter protolive-backend --prod --legacy deploy`, `node dist/src/main.js`
- `apps/web/Dockerfile` — `node:22-alpine`로 pnpm 정적 빌드 후 `nginx-unprivileged`(8080)로 서빙
- `apps/web/nginx.conf` — SPA 폴백(`try_files ... /index.html`) + 캐시 정책 + `/healthz`
- `docker-compose.yml` — web + api를 로컬 풀스택으로 빌드/실행

## 로컬 풀스택 실행 (권장)

```bash
docker compose up --build
```

| 서비스 | 컨테이너 포트 | 호스트 URL |
| --- | --- | --- |
| web | 8080 (nginx) | http://localhost:4174 |
| api | 3003 | http://localhost:3003/api |

중지/정리:

```bash
docker compose down          # 컨테이너 중지 (데이터 볼륨 유지)
docker compose down -v       # 데이터 볼륨까지 삭제
```

> `PROTOLIVE_SESSION_SECRET`을 직접 지정하려면:
> `PROTOLIVE_SESSION_SECRET=$(openssl rand -base64 32) docker compose up --build`

## 환경 변수

| 변수 | 대상 | 기본값(compose) | 설명 |
| --- | --- | --- | --- |
| `PORT` | api | `3003` | API 리슨 포트 |
| `PROJECT_STORE_PATH` | api | `/data/protolive-store.json` | JSON 스토어 파일 경로. named volume 디렉터리 하위 |
| `CORS_ORIGINS` | api | `http://localhost:4174,http://127.0.0.1:4174` | 쉼표 구분 허용 origin. 운영에서는 실제 웹 도메인으로 교체 |
| `PROTOLIVE_SESSION_SECRET` | api | `local-dev-only-change-me` | 세션 쿠키 서명 키. **`NODE_ENV=production`에서 필수**, 운영에서 반드시 교체 |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` | api | `60000` / `120` | 레이트 리밋 |
| `VITE_API_BASE_URL` | web (빌드 타임) | `http://localhost:3003/api` | 브라우저 번들에 박히는 API 주소. `--build-arg`로 주입 |

`VITE_API_BASE_URL`은 **빌드 타임** 변수입니다. 값이 바뀌면 web 이미지를 다시 빌드해야 합니다.
미지정 시 브라우저는 현재 origin의 `:3003/api`를 추정합니다(`apps/web/src/api.ts`).

## 데이터 영속화

API는 외부 데이터베이스를 쓰지 않고 `PROJECT_STORE_PATH`가 가리키는 JSON 파일에 원자적으로
기록합니다. Compose는 named volume `api-data`를 컨테이너의 `/data`에 마운트하므로 컨테이너를
재생성해도 로컬 데이터가 유지됩니다. 초기화하려면 `docker compose down -v`로 볼륨을 제거하세요.

> 참고: 리포지토리의 `db/` 디렉터리에는 PostgreSQL 스키마/시드가 있으나, 이는 **향후 DB
> 전환용** 리소스이며 현재 런타임 API는 사용하지 않습니다. 그래서 Compose에 postgres
> 서비스를 추가하지 않았습니다. 실제 Postgres로 전환할 때 `postgres:16-alpine` 서비스와
> `DATABASE_URL` 배선을 추가하면 됩니다.

## 개별 이미지 빌드

빌드 컨텍스트는 **리포지토리 ROOT**(`.`)이며 Dockerfile 경로는 `-f`로 지정합니다.

```bash
# API 이미지 (빌드 컨텍스트 = 리포 ROOT)
docker build -f apps/api/Dockerfile -t protolive-api .

# Web 이미지 (빌드 컨텍스트 = 리포 ROOT, 공개 API 주소 주입)
docker build -f apps/web/Dockerfile \
  --build-arg VITE_API_BASE_URL=https://api.your-domain.com/api \
  -t protolive-web .
```

각 이미지의 빌드 컨텍스트는 **리포지토리 ROOT**입니다(pnpm 워크스페이스 잠금 파일과
워크스페이스 매니페스트가 컨텍스트에 있어야 하므로). 호스트의 `node_modules`/`dist`는
루트 `.dockerignore`로 제외되어 이미지 내부에서 재설치·재빌드됩니다.

## 컨테이너 호스트 배포 (Render / Cloud Run / Fly.io 등)

위 두 이미지는 컨테이너를 받는 어떤 호스트에든 그대로 올릴 수 있습니다.

1. **api 서비스**
   - 이미지: `apps/api/Dockerfile` 빌드 결과
   - 리슨 포트: `PORT`(기본 3003). **Cloud Run처럼 호스트가 `PORT`를 주입하면 그대로 따릅니다.**
   - 영속 디스크를 `/data`(또는 `PROJECT_STORE_PATH`의 상위 디렉터리)에 마운트하세요
     (예: Render Disk, Fly Volume). 영속 스토리지가 없으면 JSON 데이터는 재배포 시 사라집니다.
   - `PROTOLIVE_SESSION_SECRET`을 시크릿으로 설정하세요(미설정 시 프로덕션에서 기동 실패).
   - `CORS_ORIGINS`에 실제 웹 도메인을 설정하세요.
2. **web 서비스**
   - 이미지: `apps/web/Dockerfile` 빌드 결과. `--build-arg VITE_API_BASE_URL=<공개 API 주소>`로 빌드.
   - 리슨 포트: `8080`(nginx-unprivileged, 비루트). 호스트가 컨테이너 포트를 묻는다면 `8080`.
   - 정적 자산만 서빙하므로 영속 스토리지가 필요 없습니다.

> 단일 오리진으로 묶으려면 web 앞단(또는 별도 리버스 프록시)에서 `/api`를 api 서비스로
> 포워딩하고, web 이미지를 그에 맞는 `VITE_API_BASE_URL`로 빌드하면 됩니다.
