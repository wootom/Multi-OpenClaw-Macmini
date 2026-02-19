# Multi-OpenClaw Mac Mini

> 개인용 다중 AI 에이전트 플랫폼 — Mac Mini 위에서 3명의 독립 AI를 운영합니다

---

## 전체 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                         외부 사용자 접속                              │
│                                                                     │
│   브라우저  ──→  Cloudflare Tunnel (HTTPS, 누구나)                   │
│   브라우저  ──→  Tailscale VPN    (내 계정 기기만)                   │
│   브라우저  ──→  LAN              (같은 Wi-Fi만)                     │
│   텔레그램  ──→  Telegram Bot API (userA만)                          │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                    Mac Mini (192.168.x.x / Tailscale)               │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      Docker Engine                            │  │
│  │                                                               │  │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │  │
│  │  │  openclaw   │   │  openclaw   │   │  openclaw   │        │  │
│  │  │   userA     │   │   userB     │   │   userC     │        │  │
│  │  │  port 3101  │   │  port 3102  │   │  port 3103  │        │  │
│  │  │  GPT-4o     │   │  GPT-4o     │   │  GPT-4o     │        │  │
│  │  │  Telegram ✓ │   │  Telegram ✗ │   │  Telegram ✗ │        │  │
│  │  │  KIS/Poly ✓ │   │  KIS/Poly ✗ │   │  KIS/Poly ✗ │        │  │
│  │  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘        │  │
│  └─────────┼─────────────────┼─────────────────┼───────────────┘  │
│            └─────────────────┴─────────────────┘                  │
│                              │ host.docker.internal:3000            │
│  ┌───────────────────────────▼─────────────────────────────────┐   │
│  │                   K-Dexter Server (port 3000)                │   │
│  │      국내/미국 주식 데이터 중계 서버 (별도 실행 필요)          │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                      외부 API 연동                                   │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  OpenAI      │  │  KIS (한투)  │  │  Polygon.io  │             │
│  │  GPT-4o      │  │  주식 API    │  │  미국 주식   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 사용자별 구성

| 항목 | userA | userB | userC |
|------|:-----:|:-----:|:-----:|
| 포트 | 3101 | 3102 | 3103 |
| AI 모델 | GPT-4o | GPT-4o | GPT-4o |
| Telegram | ✅ | ❌ | ❌ |
| KIS API | ✅ | ❌ | ❌ |
| Polygon API | ✅ | ❌ | ❌ |
| K-Dexter Bridge | ✅ | ✅ | ✅ |
| 에이전트 | main + dev | main | main |
| 페르소나 구성 | 완료 | 템플릿 | 템플릿 |

---

## 빠른 시작

### 1. 사전 준비
```bash
# Docker Desktop 실행 확인
docker --version

# K-Dexter 서버 실행 (포트 3000)
# → 별도 프로젝트에서 먼저 시작
```

### 2. 환경변수 설정
```bash
# .env.example을 복사하여 실제 값 입력
cp users/userA/env/.env.example users/userA/env/.env
cp users/userB/env/.env.example users/userB/env/.env
cp users/userC/env/.env.example users/userC/env/.env

# 각 .env 파일에 API 키 입력 (아래 '외부 API 연동' 섹션 참고)
```

### 3. 컨테이너 시작
```bash
# Docker 이미지 빌드 (최초 1회)
docker build -t openclaw-lab:latest .

# 모든 사용자 시작
docker compose -f docker-compose.userA.yml up -d
docker compose -f docker-compose.userB.yml up -d
docker compose -f docker-compose.userC.yml up -d

# 상태 확인
docker ps
```

### 4. 외부 접속 (선택)
```bash
# Cloudflare Tunnel으로 공개 URL 발급
./start-tunnels.sh
# → 각 사용자의 공개 URL이 출력됨
```

---

## 접속 방법

### LAN (같은 네트워크)
| 사용자 | 주소 |
|--------|------|
| userA | `http://[Mac IP]:3101` |
| userB | `http://[Mac IP]:3102` |
| userC | `http://[Mac IP]:3103` |

### Tailscale VPN
```
http://[Tailscale IP]:3101~3103
```

### 최초 접속 (토큰 필요)
새 기기에서 처음 접속할 때는 URL에 토큰을 붙입니다:
```
http://[주소]:3101/?token=[GATEWAY_TOKEN]
```
> 이후에는 브라우저 쿠키에 저장되어 자동 인증됩니다.

---

## 외부 API 연동 상세

### 1. OpenAI API
| 항목 | 내용 |
|------|------|
| 모델 | `gpt-4o` |
| 용도 | AI 에이전트 대화 처리 |
| 발급처 | [platform.openai.com](https://platform.openai.com) |
| 환경변수 | `OPENAI_API_KEY` |
| 형식 | `sk-proj-...` |

```bash
# .env 설정
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxx
MODEL=openai/gpt-4o
```

> ⚠️ `gpt-5.2-chat-latest`는 reasoning token 멀티턴 버그로 사용 불가. GPT-4o 사용 권장.

---

### 2. 한국투자증권 (KIS) API — userA 전용
| 항목 | 내용 |
|------|------|
| 용도 | 국내/미국 주식 실시간 시세, OHLCV |
| 발급처 | [apiportal.koreainvestment.com](https://apiportal.koreainvestment.com) |
| 환경변수 | `KIS_APP_KEY`, `KIS_APP_SECRET`, `KIS_ENV` |

```bash
# .env 설정
KIS_APP_KEY=PSxxxxxxxxxxxxxxxxxx
KIS_APP_SECRET=xxxxxx...
KIS_ENV=prod        # prod(실거래) 또는 vts(모의투자)
```

**제공 기능:**
| AI 도구 | K-Dexter 엔드포인트 | 설명 |
|---------|-------------------|------|
| `get_kr_current_price` | `GET /kr/price?ticker=005930` | 국내 주식 현재가 |
| `get_kr_daily_ohlcv` | `GET /kr/ohlcv?ticker=005930&period=30` | 국내 일봉 데이터 |
| `get_kr_investor_trend` | `GET /kr/investors?ticker=005930` | 투자자 동향 |
| `get_us_current_price` | `GET /us/price?ticker=AAPL&exchange=NAS` | 미국 주식 현재가 |
| `get_us_daily_ohlcv` | `GET /us/ohlcv?ticker=AAPL&period=30` | 미국 일봉 데이터 |

---

### 3. Polygon.io — userA 전용
| 항목 | 내용 |
|------|------|
| 용도 | 미국 주식 보조 데이터 |
| 발급처 | [polygon.io](https://polygon.io) |
| 환경변수 | `POLYGON_API_KEY` |
| 무료 플랜 | 15분 지연 데이터 제공 |

```bash
# .env 설정
POLYGON_API_KEY=xxxxxxxxxxxxxxxx
```

---

### 4. K-Dexter Bridge (로컬 서버)
| 항목 | 내용 |
|------|------|
| 역할 | KIS/Polygon API를 OpenClaw 도구로 중계 |
| 위치 | Mac Mini 로컬 (`localhost:3000`) |
| Docker 내부 접근 | `http://host.docker.internal:3000` |
| 확장 위치 | `users/userX/extensions/k-dexter-bridge/` |

**기술적 분석 도구:**
| AI 도구 | 엔드포인트 | 지표 |
|---------|-----------|------|
| `analyze_kr_technical` | `GET /kr/technical?ticker=005930` | MA, RSI, MACD, Bollinger Bands |
| `analyze_us_technical` | `GET /us/technical?ticker=AAPL` | MA, RSI, MACD, Bollinger Bands |

---

### 5. Telegram Bot API — userA 전용
| 항목 | 내용 |
|------|------|
| 용도 | 텔레그램 채팅으로 AI 에이전트와 대화 |
| 발급처 | Telegram [@BotFather](https://t.me/BotFather) |
| 환경변수 | `openclaw.json` → `channels.telegram.botToken` |

**설정 방법:**
1. Telegram에서 `/newbot` 명령으로 봇 생성
2. 발급된 토큰을 `openclaw.json`에 입력:
```json
"channels": {
  "telegram": {
    "dmPolicy": "pairing",
    "botToken": "1234567890:AAxxxxxxxxxxxxxxxxxxxxxx",
    "groupPolicy": "allowlist",
    "streamMode": "partial"
  }
}
```
3. 컨테이너 재시작 후 봇에 DM 전송

> userB, userC는 봇 토큰 미설정 (별도 발급 후 입력 가능)

---

### 6. Cloudflare Tunnel
| 항목 | 내용 |
|------|------|
| 용도 | 인터넷에서 누구나 접속 가능한 공개 URL 발급 |
| 계정 | 불필요 (임시 URL) / Cloudflare 계정 필요 (영구 URL) |
| 설치 경로 | `~/.local/bin/cloudflared` |

```bash
# 터널 시작 (임시 URL)
./start-tunnels.sh

# 출력 예시
# userA: https://xxxx-xxxx.trycloudflare.com/?token=...
# userB: https://yyyy-yyyy.trycloudflare.com/?token=...
# userC: https://zzzz-zzzz.trycloudflare.com/?token=...
```

> ⚠️ 서버 재시작 시 URL이 변경됩니다. 영구 URL은 Cloudflare 계정 필요.

---

## 디렉토리 구조

```
openclaw-lab/
├── Dockerfile                      # openclaw-lab 이미지
├── docker-compose.userA.yml        # userA 컨테이너 (port 3101)
├── docker-compose.userB.yml        # userB 컨테이너 (port 3102)
├── docker-compose.userC.yml        # userC 컨테이너 (port 3103)
├── start-tunnels.sh                # Cloudflare Tunnel 시작 스크립트
├── users.json                      # 사용자-포트 매핑
├── docs/
│   ├── PRD.md                      # 제품 요구사항 정의서
│   ├── DESIGN.md                   # 시스템 설계서
│   └── MANUAL.md                   # 운영 메뉴얼
└── users/
    └── userX/
        ├── env/
        │   ├── .env                # 실제 API 키 (git 제외)
        │   └── .env.example        # 환경변수 템플릿
        ├── extensions/
        │   └── k-dexter-bridge/    # 금융 도구 확장
        │       ├── index.ts        # 도구 구현
        │       ├── package.json
        │       └── openclaw.plugin.json
        └── workspace/
            ├── .state/
            │   └── openclaw.json   # OpenClaw 런타임 설정
            ├── SOUL.md             # 에이전트 성격/가치관
            ├── IDENTITY.md         # 에이전트 정체성
            ├── USER.md             # 사용자 정보
            ├── AGENTS.md           # 에이전트 운영 설정
            ├── TOOLS.md            # 도구 메모
            ├── HEARTBEAT.md        # 주기적 작업
            ├── BOOTSTRAP.md        # 세션 초기화
            └── MEMORY.md           # 장기 기억
```

---

## 트러블슈팅

### 대화 응답 없음 (세션 오염)
```bash
for user in userA userB userC; do
  DIR="./users/${user}/workspace/.state/agents/main/sessions"
  rm -f "$DIR"/*.jsonl 2>/dev/null
  echo '{"sessions":[]}' > "$DIR/sessions.json"
done
docker compose -f docker-compose.userA.yml restart
docker compose -f docker-compose.userB.yml restart
docker compose -f docker-compose.userC.yml restart
```

### 인증 오류 (disconnected 1008)
URL에 토큰 추가: `?token=[GATEWAY_TOKEN]`

### K-Dexter 도구 오류
```bash
curl http://localhost:3000/health
# K-Dexter 서버가 실행 중인지 확인
```

---

## 관련 문서

- [PRD.md](docs/PRD.md) — 제품 요구사항 정의서
- [DESIGN.md](docs/DESIGN.md) — 시스템 설계서 및 아키텍처
- [MANUAL.md](docs/MANUAL.md) — 운영 및 사용 가이드
