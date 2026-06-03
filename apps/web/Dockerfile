# ProtoLive Web (Vite + React) — 멀티스테이지 프로덕션 이미지
# 빌드 컨텍스트: apps/web (독립 npm 프로젝트, package-lock.json 보유)
#
#   docker build -t protolive-web \
#     --build-arg VITE_API_BASE_URL=https://api.example.com/api apps/web
#   docker run -p 4174:8080 protolive-web
#
# 정적 빌드를 비루트 nginx(nginx-unprivileged, 8080 리슨)로 서빙한다.

# ---- 1) build (Vite 정적 번들) ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# 브라우저 번들에 박히는 빌드 타임 API 주소. 미지정 시 런타임에 브라우저
# origin 기준으로 :3003/api를 추정한다(apps/web/src/api.ts 참고).
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ---- 2) runtime (비루트 정적 서버) ----
# nginx-unprivileged: 마스터/워커 모두 비루트(uid 101)로 동작, 기본 8080 리슨
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

# SPA 폴백 + 캐시 정책이 담긴 설정으로 교체
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 산출물 배치
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
# 베이스 이미지가 비루트(USER 101)와 적절한 CMD를 이미 설정해 둠
