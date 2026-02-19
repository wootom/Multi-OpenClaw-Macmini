# 사용자 메뉴얼
## OpenClaw Lab — 운영 및 사용 가이드

**버전:** 1.0
**작성일:** 2026-02-19

---

## 1. 빠른 시작

### 1.1 서비스 접속 주소

#### LAN (같은 Wi-Fi 네트워크)
| 사용자 | 주소 |
|--------|------|
| userA | `http://192.168.219.102:3101` |
| userB | `http://192.168.219.102:3102` |
| userC | `http://192.168.219.102:3103` |

#### Tailscale VPN (외부 네트워크, Tailscale 설치 필요)
| 사용자 | 주소 |
|--------|------|
| userA | `http://100.87.101.74:3101` |
| userB | `http://100.87.101.74:3102` |
| userC | `http://100.87.101.74:3103` |

#### Cloudflare Tunnel (누구나, 인터넷)
> 서버 재시작마다 URL이 변경됩니다. `./start-tunnels.sh` 실행 후 출력된 URL을 사용하세요.

### 1.2 최초 접속 방법
새 기기 또는 브라우저에서 처음 접속할 때는 URL에 `?token=...`을 붙여야 합니다.

| 사용자 | 최초 접속 URL 예시 (LAN 기준) |
|--------|-------------------------------|
| userA | `http://192.168.219.102:3101/?token=dcbff7abdd32e8eed48c7cb9892a1aa1` |
| userB | `http://192.168.219.102:3102/?token=f5546ec8a816e8a3dc598ab1286044d4` |
| userC | `http://192.168.219.102:3103/?token=5f9f8f0dfdeca96779dc0ffa1ee56bec` |

> 한 번 접속하면 브라우저 쿠키에 저장되어 이후엔 토큰 없이 접속됩니다.

---

## 2. 일상 운영

### 2.1 컨테이너 상태 확인
```bash
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
```
모든 컨테이너가 `Up` 상태여야 합니다.

### 2.2 컨테이너 시작/재시작
```bash
cd ~/Documents/Code/OpenClaw/openclaw-lab

# 전체 재시작
docker compose -f docker-compose.userA.yml restart
docker compose -f docker-compose.userB.yml restart
docker compose -f docker-compose.userC.yml restart

# 특정 사용자만 재시작
docker compose -f docker-compose.userA.yml restart
```

### 2.3 Cloudflare Tunnel 시작
서버 재시작 후 또는 외부 공개 URL이 필요할 때:
```bash
cd ~/Documents/Code/OpenClaw/openclaw-lab
./start-tunnels.sh
```
실행 완료 후 각 사용자의 공개 URL (토큰 포함)이 출력됩니다.

### 2.4 로그 확인
```bash
# 실시간 로그
docker compose -f docker-compose.userA.yml logs -f

# 최근 50줄
docker compose -f docker-compose.userA.yml logs --tail=50
```

---

## 3. 문제 해결

### 3.1 대화 응답이 없을 때 (세션 오염)
**증상:** 메시지를 보내도 응답이 없거나 에러 메시지만 표시됨

**원인:** 세션 히스토리 오염

**해결:**
```bash
# 해당 사용자의 세션 클리어 (예: userA)
SESSION_DIR="./users/userA/workspace/.state/agents/main/sessions"
rm -f "$SESSION_DIR"/*.jsonl
echo '{"sessions":[]}' > "$SESSION_DIR/sessions.json"

# 컨테이너 재시작
docker compose -f docker-compose.userA.yml restart
```

**3명 모두 클리어:**
```bash
cd ~/Documents/Code/OpenClaw/openclaw-lab
for user in userA userB userC; do
  SESSION_DIR="./users/${user}/workspace/.state/agents/main/sessions"
  rm -f "$SESSION_DIR"/*.jsonl 2>/dev/null
  echo '{"sessions":[]}' > "$SESSION_DIR/sessions.json"
done
docker compose -f docker-compose.userA.yml restart
docker compose -f docker-compose.userB.yml restart
docker compose -f docker-compose.userC.yml restart
```

### 3.2 접속이 안 될 때 (ERR_CONNECTION_REFUSED)
1. 컨테이너 상태 확인: `docker ps`
2. 컨테이너가 없으면 시작:
   ```bash
   docker compose -f docker-compose.userA.yml up -d
   ```
3. Cloudflare Tunnel 접속 실패 시 `./start-tunnels.sh` 재실행

### 3.3 인증 오류 (disconnected 1008: device identity required)
URL에 토큰이 빠진 경우입니다. 아래 주소로 재접속:
- userA: `.../?token=dcbff7abdd32e8eed48c7cb9892a1aa1`
- userB: `.../?token=f5546ec8a816e8a3dc598ab1286044d4`
- userC: `.../?token=5f9f8f0dfdeca96779dc0ffa1ee56bec`

### 3.4 K-Dexter 도구가 작동하지 않을 때
K-Dexter 서버(포트 3000)가 실행 중인지 확인:
```bash
curl http://localhost:3000/health 2>/dev/null || echo "K-Dexter 서버 꺼져있음"
```
K-Dexter 서버를 먼저 시작한 후 다시 시도하세요.

---

## 4. 설정 변경

### 4.1 AI 모델 변경
```bash
# openclaw.json 수정
# 예: users/userA/workspace/.state/openclaw.json
# "model": "openai/gpt-4o" 를 원하는 모델로 변경

# .env 파일도 동일하게 변경
# users/userA/env/.env
# MODEL=openai/gpt-4o

# 변경 후 컨테이너 재생성
docker compose -f docker-compose.userA.yml up -d
```

> ⚠️ **주의:** GPT-5.2-chat-latest는 멀티턴 대화 버그로 인해 사용하지 마세요.

### 4.2 Telegram 봇 연동 (userB, userC)
1. Telegram에서 @BotFather로 새 봇 생성 → 토큰 발급
2. `.state/openclaw.json`의 `channels.telegram.botToken` 에 입력:
   ```json
   "telegram": {
     "botToken": "YOUR_BOT_TOKEN_HERE"
   }
   ```
3. 컨테이너 재시작

### 4.3 페르소나 커스터마이징
각 사용자 워크스페이스의 마크다운 파일을 수정합니다:

| 파일 | 내용 |
|------|------|
| `SOUL.md` | 에이전트의 핵심 가치관, 성격 |
| `IDENTITY.md` | 이름, 역할, 자기소개 |
| `USER.md` | 대화 상대(사람)에 대한 정보 |
| `AGENTS.md` | 에이전트 운영 방식 |
| `TOOLS.md` | 사용 가능한 도구 메모 |
| `HEARTBEAT.md` | 주기적으로 실행할 작업 |
| `BOOTSTRAP.md` | 세션 시작 시 초기 설정 |
| `MEMORY.md` | 에이전트 장기 기억 |

> 파일 수정 후 대화를 새로 시작하면 반영됩니다.

---

## 5. 신규 사용자 추가

### 5.1 디렉토리 생성
```bash
cd ~/Documents/Code/OpenClaw/openclaw-lab
NEW_USER="userD"
NEW_PORT=3104

mkdir -p users/$NEW_USER/env
mkdir -p users/$NEW_USER/workspace/.state/agents/main/sessions
mkdir -p users/$NEW_USER/extensions

# 기존 사용자에서 복사
cp -r users/userB/workspace/*.md users/$NEW_USER/workspace/
cp -r users/userA/extensions/k-dexter-bridge users/$NEW_USER/extensions/
```

### 5.2 설정 파일 생성
```bash
# .env 파일
cat > users/$NEW_USER/env/.env << EOF
OPENAI_API_KEY=<API_KEY>
MODEL=openai/gpt-4o
PORT=3100
OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 16)
OPENCLAW_GATEWAY_AUTH_MODE=none
OPENCLAW_STATE_DIR=/workspace/.state
EOF

# openclaw.json
cp users/userB/workspace/.state/openclaw.json users/$NEW_USER/workspace/.state/openclaw.json
echo '{"sessions":[]}' > users/$NEW_USER/workspace/.state/agents/main/sessions/sessions.json
```

### 5.3 docker-compose 파일 생성
`docker-compose.userB.yml`을 복사하여 포트와 경로를 수정합니다.

### 5.4 컨테이너 시작
```bash
docker compose -f docker-compose.userD.yml up -d
```

### 5.5 start-tunnels.sh 업데이트
`start-tunnels.sh` 파일에 새 사용자 항목을 추가합니다.

---

## 6. 백업 및 복구

### 6.1 데이터 백업
중요한 데이터는 `workspace/` 디렉토리입니다:
```bash
tar czf openclaw-backup-$(date +%Y%m%d).tar.gz \
  users/userA/workspace \
  users/userB/workspace \
  users/userC/workspace
```

### 6.2 설정 백업
```bash
tar czf openclaw-config-$(date +%Y%m%d).tar.gz \
  docker-compose.*.yml \
  users/*/env/.env \
  users/*/workspace/.state/openclaw.json
```

---

## 7. 참조

### 7.1 주요 파일 경로
| 파일 | 경로 |
|------|------|
| 컨테이너 정의 | `openclaw-lab/docker-compose.userX.yml` |
| 환경변수 | `openclaw-lab/users/userX/env/.env` |
| OpenClaw 설정 | `openclaw-lab/users/userX/workspace/.state/openclaw.json` |
| 세션 데이터 | `openclaw-lab/users/userX/workspace/.state/agents/main/sessions/` |
| 페르소나 파일 | `openclaw-lab/users/userX/workspace/*.md` |
| K-Dexter 확장 | `openclaw-lab/users/userX/extensions/k-dexter-bridge/` |
| 터널 스크립트 | `openclaw-lab/start-tunnels.sh` |
| 터널 로그 | `/tmp/cf-tunnels/userX.log` |

### 7.2 포트 정리
| 서비스 | 포트 |
|--------|------|
| userA Control UI | 3101 |
| userB Control UI | 3102 |
| userC Control UI | 3103 |
| K-Dexter Server | 3000 |

### 7.3 Gateway 토큰
| 사용자 | 토큰 |
|--------|------|
| userA | `dcbff7abdd32e8eed48c7cb9892a1aa1` |
| userB | `f5546ec8a816e8a3dc598ab1286044d4` |
| userC | `5f9f8f0dfdeca96779dc0ffa1ee56bec` |
