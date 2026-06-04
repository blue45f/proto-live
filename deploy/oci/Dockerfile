# ProtoLive NestJS API — OCI Always-Free ARM(Ampere A1, arm64) 컨테이너.
# node:22 는 arm64 멀티아치라 Ampere A1 에서 그대로 동작한다. 모노레포 루트가 빌드 컨텍스트:
#   docker build -f deploy/oci/Dockerfile -t protolive-api .
# (apps/api 빌드 산출물은 dist/src/main.js — render.yaml startCommand 와 동일 경로)

FROM node:22-bookworm-slim AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
COPY . .
# pnpm-workspace.yaml 의 allowBuilds 가 @nestjs/core·esbuild 빌드를 승인(pg 는 순수 JS).
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm --filter protolive-backend build

FROM node:22-bookworm-slim AS runtime
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
ENV NODE_ENV=production
ENV PORT=3003
# 빌드 산출물 + 워크스페이스 node_modules(.pnpm 심링크 보존) 통째로 복사 — 무료 VM 이라 신뢰성 우선.
COPY --from=build /repo /repo
EXPOSE 3003
WORKDIR /repo/apps/api
# main.ts 가 PORT(기본 3003)에 바인딩. 컨테이너 env 로 DATABASE_URL/PROTOLIVE_SESSION_SECRET 등 주입.
CMD ["node", "dist/src/main.js"]
