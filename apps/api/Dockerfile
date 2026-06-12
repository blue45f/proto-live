# syntax=docker/dockerfile:1
#
# ProtoLive API (NestJS) — 멀티스테이지 프로덕션 이미지 (pnpm 워크스페이스)
#
# 빌드 컨텍스트는 **리포지토리 ROOT**여야 한다(워크스페이스 매니페스트 +
# pnpm-lock.yaml + pnpm-workspace.yaml + 모든 apps가 컨텍스트에 있어야
# `pnpm install --frozen-lockfile`이 재현 가능하게 동작).
#
#   docker build -f apps/api/Dockerfile -t protolive-api .
#   docker run -p 3003:3003 -e PROTOLIVE_SESSION_SECRET=... protolive-api

# --------------------------------------------------------------------------
# 1. deps — 잠금 파일 기준으로 워크스페이스 전체 설치(레이어 캐싱 위해 매니페스트 먼저)
# --------------------------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
# 워크스페이스 매니페스트 + 잠금 파일 먼저 복사(소스 변경과 무관하게 캐시 재사용).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# --------------------------------------------------------------------------
# 2. build — NestJS 빌드(dist/src/main.js) 후 prod 전용 번들로 prune
# --------------------------------------------------------------------------
FROM deps AS build
WORKDIR /repo
COPY apps/api apps/api
RUN pnpm --filter protolive-backend build
# `pnpm deploy`는 워크스페이스 링크를 풀어 자체 완결적인 prod 전용 번들을 /app에
# 만든다(node_modules + package.json). pnpm 10+는 워크스페이스 deploy에 --legacy 필요.
RUN pnpm --filter protolive-backend --prod --legacy deploy /app
# dist + 시드/리셋 스크립트와 그 기준 데이터(fixtures)도 함께 제공(선택적 사용).
RUN cp -R /repo/apps/api/dist /app/dist \
 && cp -R /repo/apps/api/scripts /app/scripts \
 && cp -R /repo/apps/api/fixtures /app/fixtures

# --------------------------------------------------------------------------
# 3. runtime — 최소 prod 이미지, 비루트
# --------------------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# prod 번들: package.json, node_modules, dist/, scripts/, fixtures/.
COPY --from=build /app ./

# JSON 스토어가 기록할 데이터 디렉터리(기본 PROJECT_STORE_PATH=/data/...).
# 비루트 사용자가 쓸 수 있도록 소유권을 넘긴다. 실제 영속화는 볼륨 마운트로 처리.
RUN mkdir -p /data && chown -R node:node /app /data
USER node

# PORT는 런타임 env로 주입(기본 3003). 호스트(Cloud Run 등)가 PORT를 주면 그대로 따른다.
ENV PORT=3003
EXPOSE 3003

CMD ["node", "dist/src/main.js"]
