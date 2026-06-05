#!/usr/bin/env bash
# ProtoLive AWS EC2 부팅 자동배포 (Ubuntu 22.04/24.04). EC2 시작 시 "고급 세부 정보 → 사용자 데이터"에 붙여넣는다.
# 한 번에: 스왑 생성(t3.micro 빌드 OOM 방지) → Docker 설치 → 레포 클론 → 공인 IP로 .env/시크릿 생성
# → docker compose up(API+Postgres+Caddy 자동 HTTPS) → Postgres에 쇼케이스 5개 시드.
# 로그: /var/log/protolive-bootstrap.log  (배포 후 확인: sudo tail -f /var/log/protolive-bootstrap.log)
set -euxo pipefail
exec > >(tee -a /var/log/protolive-bootstrap.log) 2>&1
export DEBIAN_FRONTEND=noninteractive

# 1) 스왑 2GB (1GB t3.micro 에서 모노레포 빌드 OOM 방지)
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 2) Docker(공식) + compose 플러그인
apt-get update -y
apt-get install -y ca-certificates curl git gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

# 3) 레포 클론(공개 repo). private 면 deploy key 로 바꿀 것.
rm -rf /opt/protolive
git clone https://github.com/blue45f/proto-live.git /opt/protolive
cd /opt/protolive/deploy/aws

# 4) 공인 IP (IMDSv2) → sslip.io 도메인 + 랜덤 시크릿으로 .env 생성
TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
PUBIP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)
DASH_IP=${PUBIP//./-}
PG_PW=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9')
SESSION_SECRET=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9')
cat > .env <<EOF
DOMAIN=${DASH_IP}.sslip.io
ACME_EMAIL=admin@${DASH_IP}.sslip.io
POSTGRES_USER=protolive
POSTGRES_PASSWORD=${PG_PW}
POSTGRES_DB=protolive
PROTOLIVE_SESSION_SECRET=${SESSION_SECRET}
CORS_ORIGINS=https://proto-live.vercel.app
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=120
EOF

# 5) 빌드 + 기동(API 부팅 시 스키마 자동 생성)
docker compose up -d --build

# 6) API healthy 대기 후 Postgres에 쇼케이스 5개 시드(api 컨테이너 내부에서 내부 db로 적재)
for i in $(seq 1 60); do
  if docker compose exec -T api node -e "require('http').get('http://127.0.0.1:3003/api/health/ready',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))" 2>/dev/null; then
    break
  fi
  sleep 5
done
docker compose exec -T api sh -c "cd /repo && DATABASE_URL='postgres://protolive:${PG_PW}@db:5432/protolive' pnpm seed:demo-data" || true

echo "ProtoLive 백엔드 준비 완료 → https://${DASH_IP}.sslip.io/api/health/ready"
echo "이 도메인을 Vercel vercel.json 의 /api rewrite 대상으로 설정하면 프론트와 연결된다."
