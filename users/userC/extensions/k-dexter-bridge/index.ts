/**
 * K-Dexter Bridge — OpenClaw Plugin Extension
 *
 * Bridges K-Dexter's financial analysis tools (KIS stock API, DART disclosures,
 * technical analysis) into OpenClaw's agent via the Plugin Extension system.
 *
 * K-Dexter must be running at http://host.docker.internal:3000 for tools to function.
 */

const K_DEXTER_URL = "http://host.docker.internal:3000";

async function callKDexter(tool, args) {
    const res = await fetch(`${K_DEXTER_URL}/api/tools/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, args }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`K-Dexter error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    if (!data.ok) {
        throw new Error(`K-Dexter tool error: ${data.error}`);
    }

    return typeof data.result === "string" ? data.result : JSON.stringify(data.result, null, 2);
}

export default function (api) {

    // ──────────────────────────────────────────────────────────────────
    // 🇰🇷 Korean Market Tools
    // ──────────────────────────────────────────────────────────────────

    api.registerTool({
        name: "get_kr_current_price",
        description: "한국 주식 실시간 현재가 조회 (KIS API). 종목코드 입력 (예: 005930=삼성전자, 000660=SK하이닉스). 현재가, 전일대비, 등락률, 거래량 등 반환.",
        parameters: {
            type: "object",
            properties: {
                symbol: { type: "string", description: "종목코드 (예: 005930)" },
            },
            required: ["symbol"],
        },
        async execute(_id, params) {
            const text = await callKDexter("get_kr_current_price", params);
            return { content: [{ type: "text", text }] };
        },
    });

    api.registerTool({
        name: "get_kr_daily_ohlcv",
        description: "한국 주식 일봉(OHLCV) 데이터 조회. 시가/고가/저가/종가/거래량 데이터 반환.",
        parameters: {
            type: "object",
            properties: {
                symbol: { type: "string", description: "종목코드 (예: 005930)" },
                period: { type: "number", description: "조회 기간 (일수, 기본: 60)" },
            },
            required: ["symbol"],
        },
        async execute(_id, params) {
            const text = await callKDexter("get_kr_daily_ohlcv", params);
            return { content: [{ type: "text", text }] };
        },
    });

    api.registerTool({
        name: "get_kr_investor_trend",
        description: "한국 주식 투자자별 매매동향 조회. 개인/외국인/기관 순매수량 제공.",
        parameters: {
            type: "object",
            properties: {
                symbol: { type: "string", description: "종목코드 (예: 005930)" },
            },
            required: ["symbol"],
        },
        async execute(_id, params) {
            const text = await callKDexter("get_kr_investor_trend", params);
            return { content: [{ type: "text", text }] };
        },
    });

    api.registerTool({
        name: "analyze_kr_technical",
        description: "한국 주식 기술적 분석. MA(5/20/60), RSI, MACD, 볼린저밴드 지표를 계산하고 매수/매도/중립 시그널 제공. 종목코드만 입력.",
        parameters: {
            type: "object",
            properties: {
                symbol: { type: "string", description: "종목코드 (예: 005930)" },
                period: { type: "number", description: "분석 기간 (일수, 기본: 60)" },
            },
            required: ["symbol"],
        },
        async execute(_id, params) {
            const text = await callKDexter("analyze_kr_technical", params);
            return { content: [{ type: "text", text }] };
        },
    });

    // ──────────────────────────────────────────────────────────────────
    // 🇺🇸 US Market Tools
    // ──────────────────────────────────────────────────────────────────

    api.registerTool({
        name: "get_us_current_price",
        description: "미국 주식 현재가 조회 (KIS API). 티커 심볼과 거래소 입력.",
        parameters: {
            type: "object",
            properties: {
                symbol: { type: "string", description: "티커 (예: AAPL, TSLA, NVDA)" },
                exchange: { type: "string", enum: ["NAS", "NYS", "AMS"], description: "거래소 (NAS=나스닥, NYS=뉴욕, AMS=아멕스)" },
            },
            required: ["symbol"],
        },
        async execute(_id, params) {
            const text = await callKDexter("get_us_current_price", params);
            return { content: [{ type: "text", text }] };
        },
    });

    api.registerTool({
        name: "get_us_daily_ohlcv",
        description: "미국 주식 일봉(OHLCV) 데이터 조회. 기술적 분석에 사용.",
        parameters: {
            type: "object",
            properties: {
                symbol: { type: "string", description: "티커 (예: AAPL)" },
                exchange: { type: "string", enum: ["NAS", "NYS", "AMS"], description: "거래소" },
                period: { type: "number", description: "조회 기간 (일수, 기본: 120)" },
            },
            required: ["symbol"],
        },
        async execute(_id, params) {
            const text = await callKDexter("get_us_daily_ohlcv", params);
            return { content: [{ type: "text", text }] };
        },
    });

    api.registerTool({
        name: "analyze_us_technical",
        description: "미국 주식 기술적 분석 (MA/RSI/MACD/볼린저밴드). 매수/매도/중립 시그널 제공.",
        parameters: {
            type: "object",
            properties: {
                symbol: { type: "string", description: "티커 (예: AAPL)" },
                exchange: { type: "string", enum: ["NAS", "NYS", "AMS"], description: "거래소 (기본: NAS)" },
                period: { type: "number", description: "분석 기간 (기본: 60)" },
            },
            required: ["symbol"],
        },
        async execute(_id, params) {
            const text = await callKDexter("analyze_us_technical", params);
            return { content: [{ type: "text", text }] };
        },
    });
}
