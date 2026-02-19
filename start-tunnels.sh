#!/bin/zsh

CLOUDFLARED="/Users/woojanghoon/.local/bin/cloudflared"
LOG_DIR="/tmp/cf-tunnels"
mkdir -p "$LOG_DIR"

# 기존 터널 프로세스 종료
pkill -f "cloudflared tunnel" 2>/dev/null
sleep 1

# 터널 시작
nohup "$CLOUDFLARED" tunnel --url http://localhost:3101 --no-autoupdate > "$LOG_DIR/userA.log" 2>&1 &
nohup "$CLOUDFLARED" tunnel --url http://localhost:3102 --no-autoupdate > "$LOG_DIR/userB.log" 2>&1 &
nohup "$CLOUDFLARED" tunnel --url http://localhost:3103 --no-autoupdate > "$LOG_DIR/userC.log" 2>&1 &

echo "터널 시작 중... (10초 대기)"
sleep 10

declare -A TOKENS
TOKENS[userA]="dcbff7abdd32e8eed48c7cb9892a1aa1"
TOKENS[userB]="f5546ec8a816e8a3dc598ab1286044d4"
TOKENS[userC]="5f9f8f0dfdeca96779dc0ffa1ee56bec"

echo ""
echo "=== 공개 URL (최초 접속용 - token 포함) ==="
for user in userA userB userC; do
  url=$(grep -m1 "trycloudflare.com" "$LOG_DIR/$user.log" 2>/dev/null | grep -o 'https://[^ ]*')
  token=${TOKENS[$user]}
  echo "$user: ${url}/?token=${token}"
done
