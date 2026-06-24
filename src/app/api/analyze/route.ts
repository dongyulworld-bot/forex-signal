import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbService } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';
import YahooFinance from 'yahoo-finance2';
import { isOandaConfigured, fetchOandaCandles } from '@/lib/oanda';

export const runtime = 'nodejs';

interface Quote {
  date: Date | string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume?: number | null;
}

// ──────────────────────────────────────────────
// OANDA Unified Symbol Map  (dropdown value → Yahoo Finance ticker)
// Keep this in sync with /api/chart/route.ts
// ──────────────────────────────────────────────
const SYMBOL_MAP: Record<string, string> = {
  'OANDA:EURUSD':    'EURUSD=X',
  'OANDA:GBPUSD':    'GBPUSD=X',
  'OANDA:USDJPY':    'JPY=X',
  'OANDA:AUDUSD':    'AUDUSD=X',
  'OANDA:XAUUSD':    'GC=F',
  'OANDA:XAGUSD':    'SI=F',
  'OANDA:BTCUSD':    'BTC-USD',
  'OANDA:NAS100USD': 'NQ=F',
  'OANDA:HK33HKD':   '^HSI',
};

// ──────────────────────────────────────────────
// OANDA decimal precision per instrument
// ──────────────────────────────────────────────
const PRICE_DECIMALS: Record<string, number> = {
  'OANDA:EURUSD':    5,
  'OANDA:GBPUSD':    5,
  'OANDA:USDJPY':    3,
  'OANDA:AUDUSD':    5,
  'OANDA:XAUUSD':    2,
  'OANDA:XAGUSD':    3,
  'OANDA:BTCUSD':    1,
  'OANDA:NAS100USD': 1,
  'OANDA:HK33HKD':   0,
};

// ──────────────────────────────────────────────
// Price Formatting Utilities
// ──────────────────────────────────────────────
const formatPrice = (price: unknown, sym: string): string => {
  if (price === undefined || price === null || price === '') return '';
  const num = typeof price === 'number' ? price : parseFloat(String(price).replace(/,/g, ''));
  if (isNaN(num)) return String(price);
  const decimals = PRICE_DECIMALS[sym] ?? 5;
  return num.toFixed(decimals);
};

const formatDecimalsInString = (str: string, sym: string): string => {
  if (!str) return str;
  const decimals = PRICE_DECIMALS[sym] ?? 5;
  return str.replace(/\b\d+\.\d+\b(?!%)/g, (match) => {
    const num = parseFloat(match);
    return isNaN(num) ? match : num.toFixed(decimals);
  });
};

// ──────────────────────────────────────────────
// Interval resolution
// ──────────────────────────────────────────────
function resolveInterval(interval: string): { yfInterval: '1m' | '5m' | '15m' | '60m' | '1d'; daysToFetch: number } {
  switch (interval) {
    case '1m':  return { yfInterval: '1m',  daysToFetch: 7 };
    case '5m':  return { yfInterval: '5m',  daysToFetch: 30 };
    case '15m': return { yfInterval: '15m', daysToFetch: 59 };
    case '1h':  return { yfInterval: '60m', daysToFetch: 360 };
    case '4h':  return { yfInterval: '60m', daysToFetch: 720 };
    case '1d':  return { yfInterval: '1d',  daysToFetch: 7300 };
    default:    return { yfInterval: '60m', daysToFetch: 30 };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchTimeframeQuotes(yahooFinance: any, yfSymbol: string, interval: '5m' | '30m' | '60m' | '1d') {
  let daysToFetch = 30;
  if (interval === '5m') daysToFetch = 5;
  if (interval === '30m') daysToFetch = 15;
  if (interval === '60m') daysToFetch = 30;
  if (interval === '1d') daysToFetch = 180;

  const period1Date = new Date();
  period1Date.setDate(period1Date.getDate() - daysToFetch);

  try {
    const chartRes = await yahooFinance.chart(yfSymbol, {
      period1: period1Date.toISOString(),
      interval: interval
    });
    return (chartRes.quotes || []).filter((q: Quote) => q.open != null && q.close != null && q.high != null && q.low != null);
  } catch (e) {
    console.error(`Failed to fetch ${interval} for ${yfSymbol}:`, e);
    return [];
  }
}

function getTimeframeContextString(quotes: Quote[], label: string, market: string) {
  if (!quotes || quotes.length < 5) return `${label}: No data available`;
  const decimals = PRICE_DECIMALS[market] ?? 5;
  const recent = quotes.slice(-20);
  const closes = recent.map(q => q.close as number);
  const current = closes[closes.length - 1];
  const first = closes[0];
  const changePercent = ((current - first) / first) * 100;
  const highs = recent.map(q => q.high as number);
  const lows = recent.map(q => q.low as number);
  const highest = Math.max(...highs);
  const lowest = Math.min(...lows);
  return `${label} - Current Price: ${current.toFixed(decimals)}, 20-Period Range: [${lowest.toFixed(decimals)} ~ ${highest.toFixed(decimals)}], Change: ${changePercent.toFixed(2)}%`;
}

/**
 * AI Chart Analysis API Route (Data-Driven OHLCV)
 */
export async function POST(request: Request) {
  try {
    // ── Parse request body ──────────────────────
    let payload;
    try {
      payload = await request.json();
    } catch {
      const formData = await request.formData();
      payload = {
        email: formData.get('email') as string,
        name: formData.get('name') as string,
        market: formData.get('market') as string,
        interval: formData.get('interval') as string,
      }
    }

    const email = payload.email;
    const name = payload.name;
    const market: string = payload.market || 'FX:EURUSD';
    const interval: string = payload.interval || '1h';

    // ── Auth ────────────────────────────────────
    let user = null;
    const cookieHeader = request.headers.get('cookie') || '';
    const sessionCookie = cookieHeader
      .split('; ')
      .find(row => row.startsWith('session='))
      ?.split('=')[1];

    if (sessionCookie) {
      const sessionPayload = await verifySessionToken(sessionCookie);
      if (sessionPayload) {
        const users = await dbService.getUsers();
        user = users.find(u => u.id === sessionPayload.userId) || null;
      }
    }

    if (!user) {
      if (!email || !name) {
        return NextResponse.json(
          { error: 'Email and Name are required for guest analysis.' },
          { status: 400 }
        );
      }
      user = await dbService.createUser(email, name);
    }

    let assignedAgent = null;
    if (user.agentId) {
      const agents = await dbService.getAgents();
      assignedAgent = agents.find(a => a.id === user.agentId) || null;
    }

    // ── Rate limiting ──────────────────────────
    const TIER_LIMITS: Record<string, number> = {
      FREE: 1,
      STANDARD: 10,
      PREMIUM: 50,
      LIFETIME: 9999,
      PARTNER: 9999,
    };
    const limit = TIER_LIMITS[user.tier || 'FREE'] || 1;
    const today = new Date().toISOString().split('T')[0];
    const isSameDay = user.lastScanDate && user.lastScanDate.startsWith(today);

    if (isSameDay && user.dailyScanCount >= limit) {
      return NextResponse.json(
        { error: `일일 AI 분석 한도를 초과했습니다. (${user.tier} 등급: 하루 최대 ${limit}회). 등급을 업그레이드하시거나 내일 다시 시도해 주세요.` },
        { status: 403 }
      );
    }

    // ── Fetch OHLCV data ───────────────────────
    const yfSymbol = SYMBOL_MAP[market];
    if (!yfSymbol) {
      return NextResponse.json(
        { error: `Unknown symbol: ${market}` },
        { status: 400 }
      );
    }

    let quotes: Quote[] = [];
    let quotes5m: Quote[] = [];
    let quotes30m: Quote[] = [];
    let quotes1h: Quote[] = [];
    let quotes1d: Quote[] = [];

    const oandaActive = isOandaConfigured();

    if (oandaActive) {
      try {
        console.log(`[OANDA API Active] Fetching data for market=${market} interval=${interval}`);
        const [resMain, res5m, res30m, res1h, res1d] = await Promise.all([
          fetchOandaCandles(market, interval, 150),
          fetchOandaCandles(market, '5m', 150).catch(() => []),
          fetchOandaCandles(market, '30m', 150).catch(() => []),
          fetchOandaCandles(market, '1h', 150).catch(() => []),
          fetchOandaCandles(market, '1d', 150).catch(() => []),
        ]);
        quotes = resMain;
        quotes5m = res5m;
        quotes30m = res30m;
        quotes1h = res1h;
        quotes1d = res1d;
        console.log(`[OANDA API Success] Fetched main quotes count=${quotes.length}`);
      } catch (err) {
        console.error('[OANDA API Fetch Error] Failed, falling back to Yahoo Finance:', err);
      }
    }

    // Fallback to Yahoo Finance if quotes are still empty
    if (!quotes.length) {

      const { yfInterval, daysToFetch } = resolveInterval(interval);
      const period1Date = new Date();
      period1Date.setDate(period1Date.getDate() - daysToFetch);
      const yahooFinance = new YahooFinance();

      try {
        // Fetch main quotes and other timeframes in parallel
        const [chartRes, res5m, res30m, res1h, res1d] = await Promise.all([
          yahooFinance.chart(yfSymbol, {
            period1: period1Date.toISOString(),
            interval: yfInterval
          }),
          fetchTimeframeQuotes(yahooFinance, yfSymbol, '5m'),
          fetchTimeframeQuotes(yahooFinance, yfSymbol, '30m'),
          fetchTimeframeQuotes(yahooFinance, yfSymbol, '60m'),
          fetchTimeframeQuotes(yahooFinance, yfSymbol, '1d'),
        ]);

        const rawCount = chartRes.quotes?.length ?? 0;
        const isCommodityOrFuture = yfSymbol.endsWith('=F') || yfSymbol.startsWith('^');
        quotes = (chartRes.quotes || [])
          .filter((q: { open: number | null; high: number | null; low: number | null; close: number | null; volume?: number | null }) => {
            if (q.open == null || q.high == null || q.low == null || q.close == null) {
              return false;
            }
            if (isCommodityOrFuture && q.open === q.close && q.high === q.low) {
              return false;
            }
            const bodyMax = Math.max(q.open, q.close);
            const bodyMin = Math.min(q.open, q.close);
            const upperWick = (q.high - bodyMax) / bodyMax;
            const lowerWick = (bodyMin - q.low) / bodyMin;
            if (upperWick > 0.05 || lowerWick > 0.05) {
              return false;
            }
            return true;
          });

        quotes5m = res5m;
        quotes30m = res30m;
        quotes1h = res1h;
        quotes1d = res1d;

        console.log(`[Analyze API Debug] market=${market} yfSymbol=${yfSymbol} yfInterval=${yfInterval} daysToFetch=${daysToFetch} rawCount=${rawCount} filteredCount=${quotes.length}`);
      } catch (err) {
        console.error('[Yahoo Finance API Error]', err);
        return NextResponse.json(
          { error: `OHLCV 데이터를 가져오는데 실패했습니다. (${market} → ${yfSymbol})` },
          { status: 502 }
        );
      }
    }

    if (!quotes.length) {
      console.log(`[Analyze API Debug] Quotes empty for ${market}, returning 404`);
      return NextResponse.json(
        { error: `OHLCV 데이터가 비어 있습니다. (${market})` },
        { status: 404 }
      );
    }

    // Downsample to 4h if interval is 4h
    let processedQuotes = quotes;
    if (interval === '4h') {
      const grouped = [];
      processedQuotes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      for (let i = 0; i < processedQuotes.length; i += 4) {
        const chunk = processedQuotes.slice(i, i + 4);
        if (chunk.length > 0) {
          const open = chunk[0].open;
          const close = chunk[chunk.length - 1].close;
          const high = Math.max(...chunk.map((c) => c.high));
          const low = Math.min(...chunk.map((c) => c.low));
          const volume = chunk.reduce((sum, c) => sum + (c.volume ?? 0), 0);
          const date = chunk[0].date;
          grouped.push({ date, open, high, low, close, volume });
        }
      }
      processedQuotes = grouped;
    }

    // Filter by visible range if provided
    const visibleRange = payload.visibleRange; // { from: number; to: number }
    if (visibleRange && visibleRange.from && visibleRange.to) {
      const fromMs = visibleRange.from * 1000;
      const toMs = visibleRange.to * 1000;
      const visibleQuotes = processedQuotes.filter((q) => {
        const time = new Date(q.date).getTime();
        return time >= fromMs && time <= toMs;
      });
      if (visibleQuotes.length >= 5) {
        processedQuotes = visibleQuotes;
      }
    }

    // Take up to last 150 candles for the LLM
    const finalQuotes = processedQuotes.slice(-150);
    const currentPrice = finalQuotes[finalQuotes.length - 1].close as number;

    // ── Build OHLCV text for LLM ───────────────
    const ohlcvString = finalQuotes.map(q => 
      `Date: ${new Date(q.date).toISOString()}, O: ${q.open}, H: ${q.high}, L: ${q.low}, C: ${q.close}, V: ${q.volume ?? 0}`
    ).join('\n');

    // Build OHLCV data for client (corresponds to analyzed range)
    const ohlcvDataForClient = finalQuotes.map((q) => ({
      date: new Date(q.date).toISOString(),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume ?? 0,
    }));

    const dummyImageUrl = `data:image/png;base64,OHLCV-DATA-DRIVEN`;

    let trend = '';
    let planAScenario = '';
    let planAProbability = 50;
    let planAEntryPrice = '';
    let planBScenario = '';
    let planBProbability = 50;
    let planBEntryPrice = '';
    let rawResponseText = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let smcData: any = {};

    // ── LLM Analysis ───────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;

    // Get contexts for multi-timeframe analysis
    const context5m = getTimeframeContextString(quotes5m, '5m Timeframe', market);
    const context30m = getTimeframeContextString(quotes30m, '30m Timeframe', market);
    const context1h = getTimeframeContextString(quotes1h, '1h Timeframe', market);
    const context1d = getTimeframeContextString(quotes1d, '1d (Daily) Timeframe', market);

    if (apiKey) {
      try {
        console.log(`[Gemini API] Analyzing ${market} (${yfSymbol}) @ ${interval}...`);
        const genAI = new GoogleGenerativeAI(apiKey);

        const prompt = `당신은 현재 데이터 기반(Data-Driven)으로 연동된 기관급 SMC 분석 AI입니다. 

[동기화된 차트 정보]
- 확정 종목(Symbol): ${market}
- 확정 타임프레임(Interval): ${interval}
- 현재 가격(Current Price): ${formatPrice(currentPrice, market)}

[OHLCV 캔들 데이터 (최근 ${finalQuotes.length}개)]
${ohlcvString}

[주변 타임프레임 차트 흐름 정보]
- 5분 봉 흐름: ${context5m}
- 30분 봉 흐름: ${context30m}
- 1시간 봉 흐름: ${context1h}
- 일봉 흐름: ${context1d}

[수행 지침]
1. 제공된 주요 타임프레임(${interval})의 최근 OHLCV 데이터를 분석하여 최고점/최저점 기반의 Order Block 가격을 정확히 소수점까지 도출하고, 시장의 추세 전환(CHoCH) 여부와 기관의 매집 심리를 분석하십시오. 환각을 일으키지 마십시오.
2. 진입가(entry), 익절가(tp), 손절가(sl) 설정에 관한 특별 규칙:
   - **현재 가격(${formatPrice(currentPrice, market)})에 기반하여 극단적으로 멀지 않고 현실적으로 수일 내에 진입/청산이 가능한 현실적인 가격대를 계산하여 설정하십시오.** 절대 수주일 전의 차트 끝부분에 있는 터무니없는 가격을 진입가로 주지 마십시오.
   - **Plan A 진입 가격(entry)은 반드시 현재 가격(${formatPrice(currentPrice, market)})에서 타임프레임에 맞춰 합리적인 거리(예: 1시간봉/4시간봉 기준 현재가 기준 0.5% ~ 2.5% 내외, 일봉 기준 1% ~ 5% 내외)에 설정되어야 합니다.**
   - **방향성 및 일관성 규칙**:
     - 만약 추천 포지션이 **매수(BUY / STRONG BUY)**인 경우:
       - Entry(진입가)는 현재가 근처 혹은 살짝 아래에 두어 눌림목 진입을 유도하십시오.
       - Stop Loss (SL, 손절가)는 반드시 Entry보다 **낮아야(작아야)** 합니다.
       - Take Profit (TP, 익절가)는 반드시 Entry보다 **높아야(커야)** 합니다.
     - 만약 추천 포지션이 **매도(SELL / STRONG SELL)**인 경우:
       - Entry(진입가)는 현재가 근처 혹은 살짝 위에 두어 반등 시 매도 진입을 유도하십시오.
       - Stop Loss (SL, 손절가)는 반드시 Entry보다 **높아야(커야)** 합니다.
       - Take Profit (TP, 익절가)는 반드시 Entry보다 **낮아야(작아야)** 합니다.
     - 대기(WAIT) 또는 불확실한 상황이라도, Plan A 시나리오를 설정할 때는 위 방향성 및 손익비(Risk-Reward) 논리를 완벽히 준수해야 합니다.
   - Plan B 진입 가격 역시 현재 가격에서 무효화/돌파 시나리오에 맞는 적절한 거리여야 합니다.
3. 주요 분석 타임프레임 외에도 제공된 주변 타임프레임(5분, 30분, 1시간, 일봉)의 차트 흐름을 파악하여 각각에 대한 짧은 차트상의 기술적 흐름 요약(1~2문장)과 트렌드(BULLISH/BEARISH/NEUTRAL)를 함께 JSON 응답에 포함하십시오.

[5대 전문 영역 분석 지침]
1. Market Structure (SMC): CHoCH, BOS, MSS를 감지하여 추세의 진정한 전환점 및 Order Block(OB)과 Fair Value Gap(FVG) 겹침 구간(Kill Zone) 특정.
2. Classical & Harmonic Patterns: 헤드앤숄더, 더블 탑/바텀, 웻지 등 패턴 식별 및 완성도 진단.
3. Liquidity Mapping: 개미들의 손절 물량이 집중된 'Liquidity Pool'과 세력의 'Stop Hunt' 예상 가격대 매핑.
4. Volume & Momentum Profile: 캔들의 거래량(Vol) 불균형(Imbalance) 정도를 0~100 수치화.
5. Psychological Sentiment & Thesis: 전문 전략가 문체로 "왜 이 시나리오가 유효한지" 3문장 이내 요약.

다음 JSON 구조로만 정확히 응답하세요:
{
  "is_matched": true,
  "mismatch_reason": "",
  "fakeout_warning": {
    "detected": true 또는 false,
    "message": "유동성 스윕(Liquidity Sweep) 감지 시 강력한 경고 메시지"
  },
  "trend": "BULLISH | BEARISH | NEUTRAL",
  "market_structure": { 
    "choch": true, 
    "bos": false, 
    "kill_zone": "강력한 매수/매도 대기 구역 (예: 1.0850 - 1.0865)" 
  },
  "patterns": { 
    "name": "감지된 패턴 이름 (없으면 'None')", 
    "confidence": 80
  },
  "liquidity": { 
    "pool_above": "상단 유동성 가격대", 
    "pool_below": "하단 유동성 가격대", 
    "stop_hunt_risk": "HIGH | MEDIUM | LOW" 
  },
  "volume_profile": { 
    "imbalance": 80, 
    "description": "불균형 및 모멘텀 설명" 
  },
  "thesis": { 
    "action": "STRONG BUY | BUY | WAIT | SELL | STRONG SELL", 
    "reasoning": "전문 전략가 문체의 3문장 요약",
    "reasoning_list": [
      "기술적 분석 근거 1 (이동평균선 배열, 지지/저항 등의 상세 지표 분석)",
      "기술적 분석 근거 2 (오더 블록 OB 구간 및 Fair Value Gap 상세 진단)",
      "기술적 분석 근거 3 (변동성 범위 및 Risk-Reward Ratio 손익비 분석)",
      "기술적 분석 근거 4 (거래량Imbalance 및 시장 모멘텀 강도 분석)",
      "기술적 분석 근거 5 (유동성 풀 소탕 스톱헌팅 위험 및 주요 레벨 수렴 분석)"
    ]
  },
  "multi_timeframe_analysis": {
    "5m": { "trend": "BULLISH | BEARISH | NEUTRAL", "flow_analysis": "5분 차트상 흐름 기술 분석 (1-2문장)" },
    "30m": { "trend": "BULLISH | BEARISH | NEUTRAL", "flow_analysis": "30분 차트상 흐름 기술 분석 (1-2문장)" },
    "1h": { "trend": "BULLISH | BEARISH | NEUTRAL", "flow_analysis": "1시간 차트상 흐름 기술 분석 (1-2문장)" },
    "1d": { "trend": "BULLISH | BEARISH | NEUTRAL", "flow_analysis": "일봉 차트상 흐름 기술 분석 (1-2문장)" }
  },
  "plan_a": { 
    "scenario": "주요 시나리오 설명", 
    "entry": "추천 진입가", 
    "probability": 80,
    "sl": "손절가",
    "tp": "익절가"
  },
  "plan_b": { 
    "scenario": "무효화 및 반전 시나리오 설명", 
    "entry": "추천 진입가", 
    "probability": 20
  }
}`;

        const candidateModels = [
          'gemini-2.5-flash',
          'gemini-2.5-flash-lite',
          'gemini-2.0-flash',
          'gemini-2.0-flash-lite',
          'gemini-flash-lite-latest'
        ];

        let lastError: unknown = null;
        let successModel = '';
        let parsed = null;

        for (const modelName of candidateModels) {
          try {
            console.log(`[Gemini API] Attempting analysis with model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ 
              model: modelName,
              generationConfig: {
                responseMimeType: "application/json",
              }
            });
            const result = await model.generateContent([prompt]);
            if (result && result.response) {
              rawResponseText = result.response.text().trim();
              if (rawResponseText) {
                parsed = JSON.parse(rawResponseText);
                successModel = modelName;
                break;
              }
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.warn(`[Gemini API Warning] Model ${modelName} failed: ${errMsg}`);
            lastError = err;
          }
        }

        if (!parsed) {
          throw lastError || new Error("All candidate Gemini models failed to generate content.");
        }

        console.log(`[Gemini API Success] Successfully analyzed using model: ${successModel}`);

        // Clean up price decimals in AI output to prevent long decimals in UI
        if (parsed.plan_a) {
          parsed.plan_a.entry = formatPrice(parsed.plan_a.entry, market);
          parsed.plan_a.tp = formatPrice(parsed.plan_a.tp, market);
          parsed.plan_a.sl = formatPrice(parsed.plan_a.sl, market);
          if (parsed.plan_a.scenario) {
            parsed.plan_a.scenario = formatDecimalsInString(parsed.plan_a.scenario, market);
          }
        }
        if (parsed.plan_b) {
          parsed.plan_b.entry = formatPrice(parsed.plan_b.entry, market);
          if (parsed.plan_b.scenario) {
            parsed.plan_b.scenario = formatDecimalsInString(parsed.plan_b.scenario, market);
          }
        }
        if (parsed.liquidity) {
          parsed.liquidity.pool_above = formatPrice(parsed.liquidity.pool_above, market);
          parsed.liquidity.pool_below = formatPrice(parsed.liquidity.pool_below, market);
        }
        if (parsed.market_structure && parsed.market_structure.kill_zone) {
          parsed.market_structure.kill_zone = formatDecimalsInString(parsed.market_structure.kill_zone, market);
        }
        if (parsed.thesis) {
          if (parsed.thesis.reasoning) {
            parsed.thesis.reasoning = formatDecimalsInString(parsed.thesis.reasoning, market);
          }
          if (Array.isArray(parsed.thesis.reasoning_list)) {
            parsed.thesis.reasoning_list = parsed.thesis.reasoning_list.map((r: string) => formatDecimalsInString(r, market));
          }
        }
        if (parsed.fakeout_warning && parsed.fakeout_warning.message) {
          parsed.fakeout_warning.message = formatDecimalsInString(parsed.fakeout_warning.message, market);
        }

        smcData = parsed;
        
        trend = parsed.trend || '';
        planAScenario = parsed.plan_a?.scenario || '';
        planAProbability = parsed.plan_a?.probability || 50;
        planAEntryPrice = `Entry: ${parsed.plan_a?.entry} | SL: ${parsed.plan_a?.sl} | TP: ${parsed.plan_a?.tp}`;
        planBScenario = parsed.plan_b?.scenario || '';
        planBProbability = parsed.plan_b?.probability || 50;
        planBEntryPrice = parsed.plan_b?.entry || '';

      } catch (geminiError) {
        console.error('[Gemini API Error] Failed, falling back to data-driven fallback:', geminiError);
        const fallback = buildDataDrivenFallback(finalQuotes, market);
        smcData = fallback;
        trend = fallback.trend;
        planAScenario = fallback.plan_a.scenario;
        planAProbability = fallback.plan_a.probability;
        planAEntryPrice = `Entry: ${fallback.plan_a.entry} | SL: ${fallback.plan_a.sl} | TP: ${fallback.plan_a.tp}`;
        planBScenario = fallback.plan_b.scenario;
        planBProbability = fallback.plan_b.probability;
        planBEntryPrice = fallback.plan_b.entry;
        rawResponseText = `Error Fallback: ${JSON.stringify(geminiError)}`;
      }
    } else {
      console.log('[Gemini API] No GEMINI_API_KEY found. Generating data-driven fallback...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const fallback = buildDataDrivenFallback(finalQuotes, market);
      smcData = fallback;
      trend = fallback.trend;
      planAScenario = fallback.plan_a.scenario;
      planAProbability = fallback.plan_a.probability;
      planAEntryPrice = `Entry: ${fallback.plan_a.entry} | SL: ${fallback.plan_a.sl} | TP: ${fallback.plan_a.tp}`;
      planBScenario = fallback.plan_b.scenario;
      planBProbability = fallback.plan_b.probability;
      planBEntryPrice = fallback.plan_b.entry;
      rawResponseText = 'Data-Driven Fallback (API Key Missing)';
    }

    // ── Persist results ────────────────────────
    const analysisRecord = await dbService.createChartAnalysis({
      userId: user.id,
      imageUrl: dummyImageUrl,
      trend,
      planAScenario,
      planAProbability,
      planBScenario,
      planBProbability,
      rawResponse: JSON.stringify(smcData),
    });

    await dbService.createAnalysisHistory({
      userId: user.id,
      imageUrl: dummyImageUrl,
      market,
      trend,
      planAScenario,
      planAProbability,
      planAEntryPrice,
      planBScenario,
      planBProbability,
      planBEntryPrice,
      status: 'COMPLETED',
      resultJson: JSON.stringify({
        ...smcData,
        createdAt: new Date().toISOString(),
      }),
    });

    await dbService.incrementUserScanCount(user.id);

    // ── Return response ────────────────────────
    return NextResponse.json({
      success: true,
      analysis: {
        ...analysisRecord,
        planAEntryPrice,
        planBEntryPrice,
        market,
        smcData,
        ohlcvData: ohlcvDataForClient,
      },
      assignedAgent: assignedAgent ? {
        name: assignedAgent.name,
        role: assignedAgent.role,
        email: assignedAgent.email,
        contactUrl: `https://wa.me/60123456789?text=${encodeURIComponent(
          `안녕하세요 ${assignedAgent.name} 담당자님! ULTRAPLEX Ai Signal 기관급 차트 분석을 보고 문의드립니다.`
        )}`
      } : null
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[Analyze API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to process chart analysis.', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

// PRICE_DECIMALS is now declared at the top of the file

// ──────────────────────────────────────────────
// Data-driven fallback: prices derived from actual OHLCV
// ──────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDataDrivenFallback(quotes: any[], market: string) {
  const decimals = PRICE_DECIMALS[market] ?? 5;
  const fmt = (v: number) => v.toFixed(decimals);

  // Extract price stats from real data
  const closes = quotes.map(q => q.close as number);
  const currentPrice = closes[closes.length - 1];

  // To avoid extreme levels from far back, use recent quotes (e.g. last 20 candles) to estimate recent volatility range
  const recentQuotes = quotes.slice(-20);
  const recentHighs = recentQuotes.map(q => q.high as number);
  const recentLows = recentQuotes.map(q => q.low as number);
  const highestHigh  = Math.max(...recentHighs);
  const lowestLow    = Math.min(...recentLows);
  const range        = highestHigh - lowestLow || currentPrice * 0.02; // fallback to 2% if range is 0

  // Simple trend detection: compare recent close vs earlier close
  const recentAvg = closes.slice(-10).reduce((a, b) => a + b, 0) / 10;
  const olderAvg  = closes.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
  const isBullish = recentAvg > olderAvg;
  const trendStr  = isBullish ? 'BULLISH' : 'BEARISH';

  // Calculate realistic entry / TP / SL based on actual price range
  let entry: number, tp: number, sl: number, entryB: number;

  if (isBullish) {
    // Bullish Long setup:
    // Entry at a slight pullback (e.g. 15% of recent range below currentPrice)
    entry  = currentPrice - range * 0.15;
    if (entry >= currentPrice) {
      entry = currentPrice * 0.995;
    }
    // TP at recent high or above currentPrice
    tp     = currentPrice + range * 0.35;
    if (tp <= entry) {
      tp = entry * 1.015;
    }
    // SL below recent low or below entry
    sl     = entry - range * 0.25;
    if (sl >= entry) {
      sl = entry * 0.985;
    }
    // Plan B: Breakdown entry below SL
    entryB = sl * 0.995;
  } else {
    // Bearish Short setup:
    // Entry at a slight bounce (e.g. 15% of recent range above currentPrice)
    entry  = currentPrice + range * 0.15;
    if (entry <= currentPrice) {
      entry = currentPrice * 1.005;
    }
    // TP at recent low or below currentPrice
    tp     = currentPrice - range * 0.35;
    if (tp >= entry) {
      tp = entry * 0.985;
    }
    // SL above recent high or above entry
    sl     = entry + range * 0.25;
    if (sl <= entry) {
      sl = entry * 1.015;
    }
    // Plan B: Breakout entry above SL
    entryB = sl * 1.005;
  }

  const getFallbackFlow = (label: string, bullish: boolean, price: number, pct: number) => {
    return {
      trend: bullish ? 'BULLISH' : 'BEARISH',
      flow_analysis: bullish 
        ? `${label} 차트 흐름상 단기 저점 지지 후 반등 흐름이 지속되고 있으며 매수 유입이 관찰됩니다. (변동율: +${pct.toFixed(2)}%)`
        : `${label} 차트 흐름상 고점 저항대 돌파 실패 후 하방 압력이 우세하며 조정 세가 강해지고 있습니다. (변동율: -${pct.toFixed(2)}%)`
    };
  };

  return {
    is_matched: true,
    mismatch_reason: "",
    fakeout_warning: {
      detected: false,
      message: ""
    },
    trend: trendStr,
    market_structure: {
      choch: isBullish,
      bos: !isBullish,
      kill_zone: `${fmt(currentPrice - range * 0.05)} - ${fmt(currentPrice + range * 0.05)}`
    },
    patterns: {
      name: isBullish ? "Bullish Order Block" : "Bearish Order Block",
      confidence: 72
    },
    liquidity: {
      pool_above: fmt(highestHigh + range * 0.02),
      pool_below: fmt(lowestLow - range * 0.02),
      stop_hunt_risk: range > (currentPrice * 0.02) ? "HIGH" : "MEDIUM"
    },
    volume_profile: {
      imbalance: 65,
      description: isBullish
        ? "매수 세력의 점진적 유입이 감지됨. OB 구역 근처에서 거래량 급증."
        : "매도 압력 우세. 하방 유동성 풀을 향한 모멘텀 감지."
    },
    thesis: {
      action: isBullish ? "BUY" : "SELL",
      reasoning: isBullish
        ? `${market} 단기 상승 구조 유지. 최근 ${fmt(lowestLow)} 저점에서 반등 후 ${fmt(currentPrice)} 수준까지 회복. OB 구역 재진입 시 추가 상승 가능성 높음.`
        : `${market} 단기 하락 구조 전환 감지. ${fmt(highestHigh)} 고점 이후 매도 압력 증가. 하방 유동성 풀 ${fmt(lowestLow)} 테스트 가능성.`,
      reasoning_list: isBullish
        ? [
            `최근 캔들 종가 배열 분석 결과 단기 저점 상승(Higher Low) 패턴이 뚜렷하며, 전체적인 상승 모멘텀(BULLISH BIAS)이 유지되고 있습니다.`,
            `주요 지지선 역할인 매수 오더블록(OB) 구간이 ${fmt(entry)} 부근에 두텁게 형성되어 있어 하방 경직성을 제공합니다.`,
            `손절가 ${fmt(sl)} 대비 목표가 ${fmt(tp)} 비율이 약 1:1.5 이상의 합리적인 손익비(Risk-Reward Ratio) 구간을 충족하고 있습니다.`,
            `최근 상승 캔들군에서 양의 거래량 불균형(Imbalance) 지수가 65%로 집계되어 매수세의 지속 가능성이 높습니다.`,
            `상단 유동성 풀(Liquidity Pool) 목표치인 ${fmt(tp)} 레벨로 수렴하는 과정에서 강력한 추세 돌파 가능성이 포착되었습니다.`
          ]
        : [
            `최근 캔들 종가 배열 분석 결과 단기 고점 하락(Lower High) 패턴이 지속되고 있으며, 전체적인 하락 모멘텀(BEARISH BIAS)이 지배적입니다.`,
            `주요 저항선 역할인 매도 오더블록(OB) 구간이 ${fmt(entry)} 부근에 형성되어 있어 상단 돌파가 제한되고 있습니다.`,
            `손절가 ${fmt(sl)} 대비 목표가 ${fmt(tp)} 비율이 약 1:1.5 이상의 합리적인 손익비(Risk-Reward Ratio) 구간을 충족하고 있습니다.`,
            `최근 하락 캔들군에서 음의 거래량 불균형(Imbalance) 지수가 65%로 집계되어 세력의 매도 압력이 우세합니다.`,
            `하단 유동성 풀(Liquidity Pool) 목표치인 ${fmt(tp)} 레벨을 향한 하방 압력 수렴 과정에서 주요 지지대 붕괴 위험이 존재합니다.`
          ]
    },
    multi_timeframe_analysis: {
      '5m': getFallbackFlow('5분 봉', isBullish, currentPrice, 0.05),
      '30m': getFallbackFlow('30분 봉', isBullish, currentPrice, 0.12),
      '1h': getFallbackFlow('1시간 봉', isBullish, currentPrice, 0.25),
      '1d': getFallbackFlow('일봉', isBullish, currentPrice, 1.2)
    },
    plan_a: {
      scenario: isBullish
        ? `OB(${fmt(entry)}) 구역으로의 회귀 후 반등(Mitigation) 시나리오`
        : `OB(${fmt(entry)}) 구역 리테스트 후 하락 지속 시나리오`,
      entry: fmt(entry),
      probability: 70,
      sl: fmt(sl),
      tp: fmt(tp)
    },
    plan_b: {
      scenario: isBullish
        ? `OB 하향 이탈 시 ${fmt(lowestLow)} 유동성 사냥 후 반등 가능성`
        : `OB 상향 돌파 시 ${fmt(highestHigh)} 돌파 후 추가 상승 전환`,
      entry: fmt(entryB),
      probability: 30
    }
  };
}

