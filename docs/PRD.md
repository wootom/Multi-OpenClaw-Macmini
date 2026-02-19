# 제품 요구사항 정의서 (PRD)
## OpenClaw Lab — 개인용 다중 AI 에이전트 플랫폼

**버전:** 1.0
**작성일:** 2026-02-19
**상태:** 운영 중

---

## 1. 제품 개요

### 1.1 목적
OpenClaw Lab은 OpenClaw 엔진 기반의 개인화된 AI 에이전트를 다수의 독립된 사용자에게 제공하는 셀프-호스팅 플랫폼이다. 각 사용자는 자신만의 격리된 AI 인스턴스를 가지며, 웹 UI 또는 텔레그램을 통해 AI 에이전트와 대화할 수 있다. 에이전트는 한국 및 미국 주식 시장 데이터 조회와 기술적 분석 도구를 내장하고 있어 금융 의사결정 보조 역할을 수행한다.

### 1.2 배경
- 기존: OpenClaw 네이티브 설치(단일 사용자) 방식으로 운영
- 현재: Docker 컨테이너 기반 다중 사용자 격리 환경으로 마이그레이션
- 목표: 복수의 사용자가 동일 서버에서 독립적인 AI 에이전트를 운영

### 1.3 대상 사용자
- **userA**: 주요 운영자. 금융 분석 도구(KIS, Polygon) 완전 구성. Telegram 연동 완료.
- **userB**: 보조 사용자. 기본 AI 대화 기능. Telegram 미구성.
- **userC**: 보조 사용자. 기본 AI 대화 기능. Telegram 미구성.

---

## 2. 핵심 기능 요구사항

### 2.1 AI 에이전트 대화 [필수]
| 항목 | 내용 |
|------|------|
| 모델 | OpenAI GPT-4o |
| 대화 방식 | 멀티턴 (대화 히스토리 유지) |
| 채널 | 웹 UI (Control UI), Telegram (userA만) |
| 페르소나 | 사용자별 독립 커스터마이징 가능 |
| 동시 에이전트 | 최대 4개 (서브에이전트 최대 8개) |

### 2.2 금융 데이터 도구 [필수 - userA / 선택 - userB, userC]
| 도구 | 기능 |
|------|------|
| `get_kr_current_price` | 국내 주식 실시간 현재가 (KIS API) |
| `get_kr_daily_ohlcv` | 국내 주식 일봉 OHLCV 데이터 |
| `get_kr_investor_trend` | 투자자별 거래 동향 (개인/외국인/기관) |
| `analyze_kr_technical` | 국내 주식 기술적 분석 (MA, RSI, MACD, 볼린저밴드) |
| `get_us_current_price` | 미국 주식 실시간 현재가 (KIS API) |
| `get_us_daily_ohlcv` | 미국 주식 일봉 OHLCV 데이터 |
| `analyze_us_technical` | 미국 주식 기술적 분석 |

### 2.3 접근성 [필수]
| 접근 방법 | 대상 | 비고 |
|-----------|------|------|
| LAN (192.168.x.x) | 동일 네트워크 기기 | 항상 사용 가능 |
| Tailscale VPN | Tailscale 계정 보유자 | 계정 필요 |
| Cloudflare Tunnel | 누구나 (공개 인터넷) | 임시 URL, 재시작 시 변경 |

### 2.4 사용자 격리 [필수]
- 각 사용자는 독립된 Docker 컨테이너에서 실행
- 워크스페이스, 대화 히스토리, 설정이 완전히 분리
- 사용자 간 데이터 접근 불가

### 2.5 인증 [필수]
- 최초 접속 시 Gateway Token (`?token=...`) 필요
- 이후 브라우저 쿠키 기반 자동 인증
- 사용자별 고유 토큰

---

## 3. 비기능 요구사항

### 3.1 가용성
- Docker `restart: unless-stopped` 정책으로 서버 재시작 후 자동 복구
- Cloudflare Tunnel은 수동 재시작 필요 (`./start-tunnels.sh`)

### 3.2 확장성
- 신규 사용자 추가: `docker-compose.userX.yml` 파일 및 사용자 디렉토리 생성으로 수평 확장 가능
- 포트 범위: 3101 ~ (순차 할당)

### 3.3 보안
- 사용자별 독립 Gateway Token
- API 키는 `.env` 파일로 컨테이너에 주입 (컨테이너 내부에서만 접근 가능)
- Cloudflare Tunnel HTTPS 자동 적용

### 3.4 성능
- 모델: GPT-4o (reasoning token 없음, 안정적 멀티턴 대화)
- 응답 지연: 네트워크 + OpenAI API 레이턴시에 종속

---

## 4. 제약 사항

| 제약 | 내용 |
|------|------|
| K-Dexter 서버 | 동일 Mac에서 포트 3000으로 실행 중이어야 함 |
| Cloudflare Tunnel URL | 재시작마다 변경됨 (임시 URL) |
| Telegram | userA만 구성됨. userB/C는 봇 토큰 별도 발급 필요 |
| GPT-5.2 미사용 | reasoning token 멀티턴 버그로 인해 GPT-4o 사용 |

---

## 5. 향후 개선 사항

- [ ] Cloudflare 영구 터널 구성 (계정 기반)
- [ ] userB, userC Telegram 봇 토큰 구성
- [ ] 자동 세션 클리어 스크립트 (세션 오염 시 자동 복구)
- [ ] 서버 재시작 시 Cloudflare Tunnel 자동 시작 (launchd 등록)
- [ ] 사용자별 API 키 분리 (현재 userA 키 공유)
