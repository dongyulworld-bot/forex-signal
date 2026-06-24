'use client';

import React, { useEffect, useRef, useMemo } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  interval: string;
  entry?: string;
  tp?: string;
  sl?: string;
  trend?: string;
}

// Map our symbols to real-time TradingView widget feeds (other brokers like Capital.com/TVC/FX:IDC)
const WIDGET_SYMBOL_MAP: Record<string, string> = {
  'OANDA:EURUSD':    'FX:EURUSD',
  'OANDA:GBPUSD':    'FX:GBPUSD',
  'OANDA:USDJPY':    'FX:USDJPY',
  'OANDA:AUDUSD':    'FX:AUDUSD',
  'OANDA:XAUUSD':    'TVC:GOLD', // Spot Gold
  'OANDA:XAGUSD':    'TVC:SILVER', // Spot Silver
  'OANDA:BTCUSD':    'COINBASE:BTCUSD', // Bitcoin Spot
  'OANDA:NAS100USD': 'CAPITALCOM:US100', // Nasdaq CFD (Capital.com)
  'OANDA:HK33HKD':   'CAPITALCOM:HK50', // Hang Seng CFD (Capital.com)
};

const WIDGET_INTERVAL_MAP: Record<string, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
};

// ──────────────────────────────────────────────
// Floating Price Badge Component
// ──────────────────────────────────────────────
function PriceBadge({ 
  label, 
  price, 
  color, 
  bgColor, 
  borderColor, 
  glowColor,
  icon 
}: { 
  label: string; 
  price: string; 
  color: string; 
  bgColor: string; 
  borderColor: string; 
  glowColor: string;
  icon: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-md transition-all duration-300 hover:scale-105"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        boxShadow: `0 0 12px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      <span className="text-sm">{icon}</span>
      <div className="flex flex-col">
        <span 
          className="text-[10px] font-bold tracking-widest uppercase opacity-80"
          style={{ color }}
        >
          {label}
        </span>
        <span 
          className="text-sm font-mono font-bold tabular-nums"
          style={{ color }}
        >
          {price}
        </span>
      </div>
    </div>
  );
}

export default function TradingViewWidget({ symbol, interval, entry, tp, sl, trend }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef(`tradingview_${Date.now()}`);

  // Parse prices to determine ordering
  const priceLabels = useMemo(() => {
    const labels: { label: string; price: string; numPrice: number; color: string; bgColor: string; borderColor: string; glowColor: string; icon: string }[] = [];
    
    if (tp) {
      const num = parseFloat(tp.replace(/,/g, ''));
      if (!isNaN(num)) labels.push({
        label: 'Take Profit',
        price: tp,
        numPrice: num,
        color: '#4ade80',
        bgColor: 'rgba(34, 197, 94, 0.12)',
        borderColor: 'rgba(34, 197, 94, 0.35)',
        glowColor: 'rgba(34, 197, 94, 0.15)',
        icon: '🎯',
      });
    }

    if (entry) {
      const num = parseFloat(entry.replace(/,/g, ''));
      if (!isNaN(num)) labels.push({
        label: 'Entry',
        price: entry,
        numPrice: num,
        color: '#f0f0f0',
        bgColor: 'rgba(255, 255, 255, 0.08)',
        borderColor: 'rgba(255, 255, 255, 0.25)',
        glowColor: 'rgba(255, 255, 255, 0.1)',
        icon: '⚡',
      });
    }

    if (sl) {
      const num = parseFloat(sl.replace(/,/g, ''));
      if (!isNaN(num)) labels.push({
        label: 'Stop Loss',
        price: sl,
        numPrice: num,
        color: '#f87171',
        bgColor: 'rgba(239, 68, 68, 0.12)',
        borderColor: 'rgba(239, 68, 68, 0.35)',
        glowColor: 'rgba(239, 68, 68, 0.15)',
        icon: '🛡️',
      });
    }

    // Sort by price descending (highest on top)
    labels.sort((a, b) => b.numPrice - a.numPrice);
    return labels;
  }, [entry, tp, sl]);

  const hasAnalysis = priceLabels.length > 0;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find the chart mount point inside our container
    const chartDiv = container.querySelector('.tv-chart-mount') as HTMLElement;
    if (!chartDiv) return;

    // Clear previous widget content
    chartDiv.innerHTML = '';

    const tvSymbol = WIDGET_SYMBOL_MAP[symbol] || symbol;
    const tvInterval = WIDGET_INTERVAL_MAP[interval] || '60';
    const mountId = widgetIdRef.current;
    chartDiv.id = mountId;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.type = 'text/javascript';
    script.async = true;
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (window as any).TradingView !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (window as any).TradingView.widget({
          "autosize": true,
          "symbol": tvSymbol,
          "interval": tvInterval,
          "timezone": "Asia/Seoul",
          "theme": "dark",
          "style": "1",
          "locale": "kr",
          "enable_publishing": false,
          "hide_side_toolbar": false,
          "allow_symbol_change": true,
          "container_id": mountId,
          "studies": [
            "MASimple@tv-basicstudies"
          ],
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup script reference if needed
    };
  }, [symbol, interval]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[420px] bg-[#0a0a0a]">
      {/* TradingView Chart Mount Point */}
      <div className="tv-chart-mount w-full h-full min-h-[420px]" />

      {/* ── Floating AI Price Level Overlay ── */}
      {hasAnalysis && (
        <div 
          className="absolute top-3 right-3 z-30 flex flex-col gap-2 animate-in slide-in-from-right-5 duration-500"
          style={{ pointerEvents: 'auto' }}
        >
          {/* Header badge */}
          <div 
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg backdrop-blur-md mb-1"
            style={{
              background: trend === '🔴 하락세' 
                ? 'rgba(239, 68, 68, 0.15)' 
                : trend === '🟢 상승세'
                  ? 'rgba(34, 197, 94, 0.15)'
                  : 'rgba(99, 102, 241, 0.15)',
              border: `1px solid ${
                trend === '🔴 하락세' 
                  ? 'rgba(239, 68, 68, 0.3)' 
                  : trend === '🟢 상승세'
                    ? 'rgba(34, 197, 94, 0.3)'
                    : 'rgba(99, 102, 241, 0.3)'
              }`,
              boxShadow: `0 0 15px ${
                trend === '🔴 하락세' 
                  ? 'rgba(239, 68, 68, 0.1)' 
                  : trend === '🟢 상승세'
                    ? 'rgba(34, 197, 94, 0.1)'
                    : 'rgba(99, 102, 241, 0.1)'
              }`,
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{
              background: trend === '🔴 하락세' ? '#ef4444' : trend === '🟢 상승세' ? '#22c55e' : '#6366f1',
            }} />
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{
              color: trend === '🔴 하락세' ? '#f87171' : trend === '🟢 상승세' ? '#4ade80' : '#a5b4fc',
            }}>
              AI Signal
            </span>
          </div>

          {/* Price Level Badges */}
          {priceLabels.map((item, i) => (
            <PriceBadge key={i} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}
