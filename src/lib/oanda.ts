export interface OandaQuote {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number;
}

const GRANULARITY_MAP: Record<string, string> = {
  '1m':  'M1',
  '5m':  'M5',
  '15m': 'M15',
  '1h':  'H1',
  '4h':  'H4',
  '1d':  'D',
};

export function isOandaConfigured(): boolean {
  return !!process.env.OANDA_API_TOKEN && !!process.env.OANDA_ACCOUNT_ID;
}

export async function fetchOandaCandles(
  market: string,
  interval: string,
  count: number = 1000
): Promise<OandaQuote[]> {
  const token = process.env.OANDA_API_TOKEN;
  const accountId = process.env.OANDA_ACCOUNT_ID;
  const env = process.env.OANDA_ENV || 'practice'; // practice or live
  
  if (!token || !accountId) {
    throw new Error('OANDA credentials (OANDA_API_TOKEN, OANDA_ACCOUNT_ID) are not configured in environment variables.');
  }

  const baseUrl = env === 'live' 
    ? 'https://api-fxtrade.oanda.com' 
    : 'https://api-fxpractice.oanda.com';

  // Extract instrument name from OANDA:EURUSD -> EUR_USD
  let instrument = market.includes(':') ? market.split(':')[1] : market;
  
  // Format instrument for OANDA API (insert underscore between currencies, e.g. EURUSD -> EUR_USD)
  if (instrument.length === 6) {
    instrument = `${instrument.slice(0, 3)}_${instrument.slice(3)}`;
  } else if (instrument === 'NAS100USD') {
    instrument = 'NAS100_USD';
  } else if (instrument === 'HK33HKD') {
    instrument = 'HK33_HKD';
  } else if (instrument === 'BTCUSD') {
    instrument = 'BTC_USD';
  }

  const granularity = GRANULARITY_MAP[interval] || 'M15';

  const url = `${baseUrl}/v3/accounts/${accountId}/instruments/${instrument}/candles?price=M&granularity=${granularity}&count=${count}`;

  console.log(`[OANDA API] Fetching candles: instrument=${instrument} granularity=${granularity} count=${count} url=${url}`);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OANDA API error: status=${response.status} msg=${response.statusText} detail=${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const candles = data.candles || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return candles.map((c: any) => ({
    date: new Date(c.time).toISOString(),
    open: c.mid ? parseFloat(c.mid.o) : null,
    high: c.mid ? parseFloat(c.mid.h) : null,
    low: c.mid ? parseFloat(c.mid.l) : null,
    close: c.mid ? parseFloat(c.mid.c) : null,
    volume: c.volume || 0,
  }));
}
