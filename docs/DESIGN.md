# 시스템 설계서
## OpenClaw Lab — 아키텍처 및 구성 명세

**버전:** 1.0
**작성일:** 2026-02-19

---

## 1. 시스템 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                        Mac Mini (Host)                       │
│                    192.168.219.102                           │
│                    100.87.101.74 (Tailscale)                 │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Docker Engine                       │  │
│  │                                                       │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │  │
│  │  │ openclaw-   │ │ openclaw-   │ │ openclaw-   │    │  │
│  │  │   userA     │ │   userB     │ │   userC     │    │  │
│  │  │  :3101      │ │  :3102      │ │  :3103      │    │  │
│  │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘    │  │
│  └─────────┼───────────────┼───────────────┼───────────┘  │
│            │               │               │               │
│  ┌─────────▼───────────────▼───────────────▼───────────┐  │
│  │              K-Dexter Server (:3000)                 │  │
│  │         (host.docker.internal:3000)                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Cloudflare Tunnel (cloudflared)             │  │
│  │   userA → trycloudflare.com/... (임시 URL)           │  │
│  │   userB → trycloudflare.com/... (임시 URL)           │  │
│  │   userC → trycloudflare.com/... (임시 URL)           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

접근 경로:
  LAN:        http://192.168.219.102:3101~3103
  Tailscale:  http://100.87.101.74:3101~3103
  Public:     https://<random>.trycloudflare.com
  Telegram:   @bot → userA 컨테이너
```

---

## 2. 컨테이너 구성

### 2.1 공통 사항
| 항목 | 값 |
|------|-----|
| 베이스 이미지 | `openclaw-lab:latest` (node:22-alpine 기반) |
| OpenClaw 버전 | 2026.2.15 |
| 내부 포트 | 3100 |
| 재시작 정책 | `unless-stopped` |
| 실행 명령 | `openclaw gateway --port 3100 --bind lan --allow-unconfigured` |

### 2.2 사용자별 포트 매핑
| 컨테이너 | 호스트 포트 | 내부 포트 |
|----------|------------|---------|
| openclaw-userA | 3101 | 3100 |
| openclaw-userB | 3102 | 3100 |
| openclaw-userC | 3103 | 3100 |

### 2.3 볼륨 마운트 (사용자별)
```yaml
volumes:
  - ./users/userX/workspace:/workspace          # 워크스페이스 (페르소나, 대화, 파일)
  - ./users/userX/env/.env:/app/.env             # 환경변수 (API 키 등)
  - ./users/userX/extensions/k-dexter-bridge:   # K-Dexter 확장 (읽기전용)
      /usr/local/lib/node_modules/openclaw/extensions/k-dexter-bridge:ro
```

---

## 3. 디렉토리 구조

```
openclaw-lab/
├── docker-compose.userA.yml          # userA 컨테이너 정의
├── docker-compose.userB.yml          # userB 컨테이너 정의
├── docker-compose.userC.yml          # userC 컨테이너 정의
├── Dockerfile                         # openclaw-lab 이미지 빌드
├── start-tunnels.sh                   # Cloudflare Tunnel 시작 스크립트
├── users.json                         # 사용자-포트 매핑
├── docs/                              # 문서
│   ├── PRD.md
│   ├── DESIGN.md
│   └── MANUAL.md
└── users/
    ├── userA/
    │   ├── env/.env                   # API 키 및 환경변수
    │   ├── extensions/
    │   │   └── k-dexter-bridge/       # 금융 도구 확장
    │   │       ├── package.json
    │   │       ├── openclaw.plugin.json
    │   │       └── index.ts
    │   └── workspace/
    │       ├── SOUL.md                # 에이전트 영혼/성격 정의
    │       ├── IDENTITY.md            # 에이전트 정체성
    │       ├── AGENTS.md              # 에이전트 구성
    │       ├── TOOLS.md               # 도구 메모
    │       ├── USER.md                # 사용자 정보
    │       ├── HEARTBEAT.md           # 주기적 작업
    │       ├── BOOTSTRAP.md           # 초기화 설정
    │       ├── MEMORY.md              # 에이전트 기억
    │       └── .state/
    │           ├── openclaw.json      # OpenClaw 런타임 설정
    │           ├── agents/
    │           │   └── main/
    │           │       └── sessions/  # 대화 히스토리 (JSONL)
    │           └── canvas/            # 캔버스 데이터
    ├── userB/                         # userA와 동일 구조 (금융 자격증명 제외)
    └── userC/                         # userA와 동일 구조 (금융 자격증명 제외)
```

---

## 4. OpenClaw 설정 명세 (openclaw.json)

### 4.1 userA 설정
```json
{
  "agents": {
    "defaults": {
      "workspace": "/workspace",
      "skipBootstrap": true,        // 부트스트랩 스킵 (페르소나 구성 완료)
      "maxConcurrent": 4,
      "subagents": { "maxConcurrent": 8 }
    },
    "list": [
      { "id": "main", "model": "openai/gpt-4o" },
      { "id": "dev",  "model": "openai/gpt-4o", "agentDir": "/workspace/.state/agents/dev/agent" }
    ]
  },
  "channels": {
    "telegram": {
      "dmPolicy": "pairing",
      "botToken": "<configured>",
      "groupPolicy": "allowlist",
      "streamMode": "partial"
    }
  },
  "gateway": {
    "bind": "lan",
    "controlUi": { "dangerouslyDisableDeviceAuth": true }
  },
  "plugins": {
    "entries": {
      "telegram": { "enabled": true },
      "k-dexter-bridge": { "enabled": true }
    }
  }
}
```

### 4.2 userB / userC 설정 (차이점)
```json
{
  "agents": {
    "defaults": { "skipBootstrap": false },  // 첫 대화 시 부트스트랩 실행
    "list": [{ "id": "main", "model": "openai/gpt-4o" }]  // 에이전트 1개
  },
  "channels": {
    "telegram": { "botToken": "" }   // 미구성
  }
}
```

---

## 5. 환경변수 명세

### 5.1 공통 환경변수
| 변수 | 설명 | 예시 |
|------|------|------|
| `OPENAI_API_KEY` | OpenAI API 키 | `sk-proj-...` |
| `MODEL` | 기본 AI 모델 | `openai/gpt-4o` |
| `PORT` | 컨테이너 내부 포트 | `3100` |
| `OPENCLAW_GATEWAY_TOKEN` | 접속 인증 토큰 | `dcbff7...` |
| `OPENCLAW_GATEWAY_AUTH_MODE` | 인증 모드 | `none` |
| `OPENCLAW_STATE_DIR` | 상태 저장 경로 | `/workspace/.state` |

### 5.2 userA 전용 환경변수
| 변수 | 설명 |
|------|------|
| `KIS_APP_KEY` | 한국투자증권 API 앱키 |
| `KIS_APP_SECRET` | 한국투자증권 API 시크릿 |
| `KIS_ENV` | KIS 환경 (`prod` / `vts`) |
| `POLYGON_API_KEY` | Polygon.io 미국 주식 데이터 API 키 |

---

## 6. K-Dexter Bridge 확장

### 6.1 아키텍처
```
컨테이너 내부                          호스트
┌──────────────────────┐              ┌──────────────────┐
│  OpenClaw Agent      │              │  K-Dexter Server │
│                      │  HTTP 호출   │  (:3000)         │
│  k-dexter-bridge  ──────────────────→  /kr/price       │
│  (index.ts)          │  (host.docker│  /kr/ohlcv       │
│                      │  .internal)  │  /kr/investors   │
└──────────────────────┘              │  /kr/technical   │
                                      │  /us/price       │
                                      │  /us/ohlcv       │
                                      │  /us/technical   │
                                      └──────────────────┘
```

### 6.2 등록된 도구 목록
| 도구 ID | 엔드포인트 | 파라미터 |
|---------|-----------|---------|
| `get_kr_current_price` | `/kr/price` | ticker (종목코드) |
| `get_kr_daily_ohlcv` | `/kr/ohlcv` | ticker, period |
| `get_kr_investor_trend` | `/kr/investors` | ticker, period |
| `analyze_kr_technical` | `/kr/technical` | ticker |
| `get_us_current_price` | `/us/price` | ticker, exchange |
| `get_us_daily_ohlcv` | `/us/ohlcv` | ticker, period |
| `analyze_us_technical` | `/us/technical` | ticker |

---

## 7. 네트워크 접근 구조

### 7.1 접근 경로별 특성
| 경로 | URL 형식 | 인증 | 가용성 |
|------|---------|------|--------|
| LAN | `http://192.168.219.102:310X` | 토큰 (최초) | 항상 |
| Tailscale | `http://100.87.101.74:310X` | 토큰 (최초) | Tailscale 연결 시 |
| Cloudflare | `https://<random>.trycloudflare.com` | 토큰 (최초) | 터널 실행 중 |

### 7.2 Gateway Token 정보
| 사용자 | 토큰 | URL 패턴 |
|--------|------|---------|
| userA | `dcbff7abdd32e8eed48c7cb9892a1aa1` | `?token=dcbff7abdd32e8eed48c7cb9892a1aa1` |
| userB | `f5546ec8a816e8a3dc598ab1286044d4` | `?token=f5546ec8a816e8a3dc598ab1286044d4` |
| userC | `5f9f8f0dfdeca96779dc0ffa1ee56bec` | `?token=5f9f8f0dfdeca96779dc0ffa1ee56bec` |

---

## 8. 알려진 기술적 제약

| 이슈 | 원인 | 해결 방법 |
|------|------|---------|
| GPT-5.2 멀티턴 실패 | OpenAI Responses API reasoning token 누적 버그 | GPT-4o 사용 |
| Cloudflare URL 변경 | 임시(Quick) 터널 사용 | 재시작 후 `./start-tunnels.sh` 실행 |
| K-Dexter 연결 | Docker 내부에서 `localhost` 불가 | `host.docker.internal:3000` 사용 |
| 세션 오염 | reasoning token orphan 누적 | 세션 JSONL + sessions.json 삭제 후 컨테이너 재시작 |
