# syntax=docker/dockerfile:1
#
# ProtoLive Web (Vite + React) — 멀티스테이지 프로덕션 이미지 (pnpm 워크스페이스)
#
# 빌드 컨텍스트는 **리포지토리 ROOT**여야 한다(pnpm-lock.yaml +
# pnpm-workspace.yaml + 워크스페이스 매니페스트가 컨텍스트에 있어야
# `pnpm install --frozen-lockfile`이 재현 가능하게 동작).
#
#   docker build -f apps/web/Dockerfile \
#     --build-arg VITE_API_BASE_URL=https://api.example.com/api -t protolive-web .
#   docker run -p 4174:8080 protolive-web
#
# 정적 빌드를 비루트 nginx(nginx-unprivileged, 8080 리슨)로 서빙한다.

# --------------------------------------------------------------------------
# 1. deps — 잠금 파일 기준으로 워크스페이스 전체 설치(레이어 캐싱 위해 매니페스트 먼저)
# --------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# --------------------------------------------------------------------------
# 2. build — Vite 정적 번들 생성(apps/web/dist)
# --------------------------------------------------------------------------
FROM deps AS build
WORKDIR /repo
COPY apps/web apps/web
# 브라우저 번들에 박히는 빌드 타임 API 주소. 미지정 시 런타임에 브라우저
# origin 기준으로 :3003/api를 추정한다(apps/web/src/api.ts 참고).
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm --filter protolive-frontend build

# --------------------------------------------------------------------------
# 3. runtime — 비루트 정적 서버
# nginx-unprivileged: 마스터/워커 모두 비루트(uid 101)로 동작, 기본 8080 리슨
# --------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

# SPA 폴백 + 캐시 정책이 담긴 설정으로 교체
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 산출물 배치
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html

EXPOSE 8080
# 베이스 이미지가 비루트(USER 101)와 적절한 CMD를 이미 설정해 둠
