import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export const runtime = 'nodejs';

// ──────────────────────────────────────────────
// OANDA Unified Symbol Map (dropdown value → Yahoo Finance ticker)
// All instruments use OANDA: prefix for consistency
// Keep in sync with /api/analyze/route.ts
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
  'OANDA:HK50':      '^HSI',
};

// ──────────────────────────────────────────────
// Interval → Yahoo Finance interval + fetch range
// ──────────────────────────────────────────────
type YFInterval = '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1h' | '1d' | '5d' | '1wk' | '1mo' | '3mo';

function resolveInterval(interval: string): { yfInterval: YFInterval; daysToFetch: number } {
  switch (interval) {
    case '1m':  return { yfInterval: '1m',  daysToFetch: 7 };
    case '5m':  return { yfInterval: '5m',  daysToFetch: 30 };
    case '15m': return { yfInterval: '15m', daysToFetch: 59 };
    case '1h':  return { yfInterval: '60m', daysToFetch: 360 };
    case '4h':  return { yfInterval: '60m', daysToFetch: 720 };
    case '1d':  return { yfInterval: '1d',  daysToFetch: 7300 };
    case '1w':  return { yfInterval: '1wk', daysToFetch: 18250 };
    case '1mo': return { yfInterval: '1mo', daysToFetch: 18250 };
    default:    return { yfInterval: '15m', daysToFetch: 59 };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const market: string = body.market;
    const interval: string = body.interval;

    if (!market || !interval) {
      return NextResponse.json({ error: 'market and interval are required' }, { status: 400 });
    }

    const yfSymbol = SYMBOL_MAP[market];
    if (!yfSymbol) {
      return NextResponse.json(
        { error: `Unknown symbol: ${market}. Supported: ${Object.keys(SYMBOL_MAP).join(', ')}` },
        { status: 400 },
      );
    }

    const { yfInterval, daysToFetch } = resolveInterval(interval);

    const period1 = new Date();
    period1.setDate(period1.getDate() - daysToFetch);

    const yahooFinance = new YahooFinance();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let quotes: any[];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chartRes: any = await yahooFinance.chart(yfSymbol, {
        period1: period1.toISOString(),
        interval: yfInterval,
      });
      quotes = chartRes.quotes || [];
    } catch (err) {
      console.error('[Chart API] Yahoo Finance error:', err);
      return NextResponse.json({ error: `Failed to fetch data for ${market} (${yfSymbol})` }, { status: 502 });
    }

    if (!quotes.length) {
      return NextResponse.json({ error: `No OHLCV data returned for ${market}` }, { status: 404 });
    }

    const isCommodityOrFuture = yfSymbol.endsWith('=F') || yfSymbol.startsWith('^');

    // Filter out null, flat (weekend), and noisy bad-tick candles
    let cleaned = quotes.filter((q) => {
      if (q.open == null || q.high == null || q.low == null || q.close == null) {
        return false;
      }
      // Filter out flat candles (e.g., weekends or illiquid periods where open == close == high == low)
      // Only filter flat candles for commodities/futures, as FX 1m candles are often flat
      if (isCommodityOrFuture && q.open === q.close && q.high === q.low) {
        return false;
      }
      // Filter out obvious bad ticks (spikes > 5% that instantly revert)
      const bodyMax = Math.max(q.open, q.close);
      const bodyMin = Math.min(q.open, q.close);
      const upperWick = (q.high - bodyMax) / bodyMax;
      const lowerWick = (bodyMin - q.low) / bodyMin;
      if (upperWick > 0.05 || lowerWick > 0.05) {
        return false;
      }
      return true;
    });

    // Group 1h candles into 4h candles if interval is 4h
    if (interval === '4h') {
      const grouped = [];
      cleaned.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      for (let i = 0; i < cleaned.length; i += 4) {
        const chunk = cleaned.slice(i, i + 4);
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
      cleaned = grouped;
    }

    // Slice to maximum of 10000 candles to optimize UI response
    const sliced = cleaned.slice(-10000);

    // Return in the format DashboardClient / LightweightChart expect
    const ohlcvData = sliced.map((q) => ({
      date: new Date(q.date).toISOString(),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume ?? 0,
    }));

    return NextResponse.json({ ohlcvData });
  } catch (error) {
    console.error('[Chart API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
