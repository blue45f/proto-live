# ProtoLive API (NestJS) — 멀티스테이지 프로덕션 이미지
# 빌드 컨텍스트: apps/api (이 디렉터리가 독립 npm 프로젝트, package-lock.json 보유)
#
#   docker build -t protolive-api apps/api
#   docker run -p 3003:3003 -e PROTOLIVE_SESSION_SECRET=... protolive-api

# ---- 1) deps + build ----
FROM node:22-alpine AS build
WORKDIR /app

# 잠금 파일 기준 재현 가능한 설치
COPY package.json package-lock.json ./
RUN npm ci

# 소스 복사 후 NestJS 빌드 → dist/src/main.js
COPY . .
RUN npm run build

# ---- 2) production deps only ----
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- 3) runtime (non-root) ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# 빌드 산출물 + 런타임 의존성만 가져온다(소스/devDeps 제외)
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# 시드/리셋 스크립트와 그 기준 데이터(fixtures)도 함께 제공(선택적 사용)
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/fixtures ./fixtures

# JSON 스토어가 기록할 데이터 디렉터리(기본 PROJECT_STORE_PATH=/data/...)
# 비루트 사용자가 쓸 수 있도록 소유권을 넘긴다. 실제 영속화는 볼륨 마운트로 처리.
RUN mkdir -p /data && chown -R node:node /app /data
USER node

# PORT는 런타임 env로 주입(기본 3003). 호스트(Cloud Run 등)가 PORT를 주면 그대로 따른다.
ENV PORT=3003
EXPOSE 3003

CMD ["node", "dist/src/main.js"]
