'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries } from 'lightweight-charts';

interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface LightweightChartProps {
  data: OHLCV[];
  symbol?: string;
  entry?: string;
  tp?: string;
  sl?: string;
  onVisibleRangeChange?: (range: { from: number; to: number } | null) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function timeToUnix(time: any): number {
  if (typeof time === 'number') {
    return time;
  }
  if (typeof time === 'string') {
    return Math.floor(new Date(time).getTime() / 1000);
  }
  if (time && typeof time === 'object' && 'year' in time && 'month' in time && 'day' in time) {
    return Math.floor(new Date(Date.UTC(time.year, time.month - 1, time.day)).getTime() / 1000);
  }
  return 0;
}

// ──────────────────────────────────────────────
// OANDA-style decimal precision per instrument
// ──────────────────────────────────────────────
const PRICE_PRECISION: Record<string, number> = {
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

function getPrecision(symbol?: string): number {
  if (!symbol) return 5;
  return PRICE_PRECISION[symbol] ?? 5;
}

function getMinMove(precision: number): number {
  return parseFloat((1 / Math.pow(10, precision)).toFixed(precision));
}

export default function LightweightChart({ data, symbol, entry, tp, sl, onVisibleRangeChange }: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const precision = getPrecision(symbol);
    const minMove = getMinMove(precision);

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 420,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        priceFormatter: (price: number) => price.toFixed(precision),
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceFormat: {
        type: 'price',
        precision,
        minMove,
      },
    });
    seriesRef.current = candlestickSeries;

    // Transform data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedData: any[] = data.map(d => ({
      time: Math.floor(new Date(d.date).getTime() / 1000),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    // lightweight-charts requires strictly ascending time values
    formattedData.sort((a, b) => a.time - b.time);
    
    // remove duplicates
    const uniqueData = [];
    let lastTime = 0;
    for (const d of formattedData) {
      if (d.time > lastTime) {
        uniqueData.push(d);
        lastTime = d.time;
      }
    }

    candlestickSeries.setData(uniqueData);

    // Apply Price Lines
    const drawPriceLine = (priceStr: string | undefined, color: string, title: string) => {
      if (!priceStr) return;
      const price = parseFloat(priceStr.replace(/,/g, ''));
      if (isNaN(price)) return;

      candlestickSeries.createPriceLine({
        price,
        color,
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title,
      });
    };

    if (entry) drawPriceLine(entry, '#ffffff', 'Entry');
    if (tp) drawPriceLine(tp, '#22c55e', 'TP');
    if (sl) drawPriceLine(sl, '#ef4444', 'SL');

    chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (range) {
        onVisibleRangeChange?.({
          from: timeToUnix(range.from),
          to: timeToUnix(range.to),
        });
      } else {
        onVisibleRangeChange?.(null);
      }
    });

    if (uniqueData.length > 150) {
      chart.timeScale().setVisibleRange({
        from: uniqueData[uniqueData.length - 150].time,
        to: uniqueData[uniqueData.length - 1].time,
      });
    } else {
      chart.timeScale().fitContent();
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, symbol, entry, tp, sl, onVisibleRangeChange]);

  return (
    <div 
      ref={chartContainerRef} 
      className="w-full h-full min-h-[420px] border border-white/5 rounded-xl overflow-hidden bg-[#0a0a0a]"
    />
  );
}
