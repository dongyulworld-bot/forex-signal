'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Target, Loader2, Zap, Award, Crown, Diamond, AlertTriangle, MonitorPlay, Activity, Crosshair, BarChart3, Scan, ChevronDown, ChevronUp, Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const TradingViewWidget = dynamic(() => import('./TradingViewWidget'), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full bg-slate-950/50 flex flex-col items-center justify-center text-slate-500">
      <Loader2 className="w-16 h-16 mb-4 animate-spin text-indigo-500 opacity-50" />
      <p className="text-lg font-bold tracking-widest animate-pulse">LOADING REALTIME CHART...</p>
    </div>
  ),
});

const cleanSymbol = (sym: string) => sym.includes(':') ? sym.split(':')[1] : sym;

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

const formatPrice = (price: unknown, sym: string): string => {
  if (price === undefined || price === null || price === '') return 'N/A';
  const num = typeof price === 'number' ? price : parseFloat(String(price).replace(/,/g, ''));
  if (isNaN(num)) return String(price);
  const decimals = PRICE_DECIMALS[sym] ?? 5;
  return num.toFixed(decimals);
};

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface HistoryItem {
  id: string;
  userId: string;
  imageUrl: string;
  market: string;
  trend: string;
  planAScenario: string;
  planAProbability: number;
  planAEntryPrice: string;
  planBScenario: string;
  planBProbability: number;
  planBEntryPrice: string;
  status: string;
  createdAt: string;
  resultJson?: string | null;
}

interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AnalysisResult {
  trend?: string;
  plan_a?: { entry?: string; tp?: string; sl?: string; scenario?: string; probability?: number };
  plan_b?: { entry?: string; scenario?: string; probability?: number };
  patterns?: { name?: string; confidence?: number };
  liquidity?: { pool_above?: string; pool_below?: string; stop_hunt_risk?: string };
  thesis?: { action?: string; reasoning?: string; reasoning_list?: string[] };
  fakeout_warning?: { detected?: boolean; message?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface DashboardClientProps {
  initialHistories: HistoryItem[];
  todayScanCount: number;
  dailyLimit: number;
  userTier: string;
}

// Tooltip component
function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="text-slate-600 hover:text-slate-400 transition-colors ml-1"
        aria-label="더 알아보기"
      >
        <Info className="w-3 h-3" />
      </button>
      {show && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 w-56 shadow-xl pointer-events-none whitespace-normal leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-700" />
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function DashboardClient({ initialHistories, todayScanCount, dailyLimit, userTier }: DashboardClientProps) {
  const router = useRouter();

  // ── Mounting ──
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [localScanCount, setLocalScanCount] = useState(todayScanCount);
  useEffect(() => {
    setLocalScanCount(todayScanCount);
  }, [todayScanCount]);

  // ── Symbol & Interval ──
  const [symbol, setSymbol] = useState('OANDA:EURUSD');
  const [interval, setInterval] = useState('15m');
  const [visibleRange] = useState<{ from: number; to: number } | null>(null);

  // ── Chart data ──
  const [ohlcvData, setOhlcvData] = useState<OHLCVData[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  // ── Analysis result ──
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(() => {
    if (initialHistories.length > 0 && initialHistories[0].resultJson) {
      try {
        return JSON.parse(initialHistories[0].resultJson);
      } catch { return null; }
    }
    return null;
  });

  // ── Scan state ──
  const [isScanning, setIsScanning] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showThesisExpanded, setShowThesisExpanded] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(null);

  // ── Toast helper ──
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // ──────────────────────────────────────────────
  // Fetch chart data whenever symbol or interval changes
  // ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchChartData = async () => {
      setIsLoadingChart(true);
      setChartError(null);

      try {
        const res = await fetch('/api/chart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ market: symbol, interval }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!cancelled && data.ohlcvData?.length) {
          setOhlcvData(data.ohlcvData);
          setAnalysisResult(null);
        } else if (!cancelled) {
          setChartError('데이터가 비어 있습니다.');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Chart fetch failed:', err);
          setChartError(err instanceof Error ? err.message : 'Failed to load chart');
        }
      } finally {
        if (!cancelled) setIsLoadingChart(false);
      }
    };

    fetchChartData();
    return () => { cancelled = true; };
  }, [symbol, interval]);

  // ──────────────────────────────────────────────
  // Neural Scan (AI Analysis)
  // ──────────────────────────────────────────────
  const handleAnalysis = useCallback(async () => {
    if (localScanCount >= dailyLimit && dailyLimit < 9999) {
      setShowUpgradeModal(true);
      return;
    }

    // Replace window.confirm with inline confirmation (better UX on mobile)
    const confirmed = window.confirm('데이터 기반 AI 분석을 진행하시겠습니까?\n(일일 무료 분석 횟수가 차감됩니다.)');
    if (!confirmed) return;

    setIsScanning(true);
    setAnalysisResult(null);
    setScanProgress(0);

    const stages = [
      '[OHLCV 데이터 파이프라인 연결 중...]',
      '[최근 100 캔들 데이터 수집 완료]',
      '[SMC 딥러닝 텍스트 변환 중...]',
      '[오더블록(Order Block) 존 계산 중...]',
      '[유동성 풀(Liquidity Pool) 탐색 중...]',
      '[최적 진입점(Entry) 도출 중...]',
    ];

    let currentStage = 0;
    setTypewriterText(stages[0]);
    setScanProgress(10);
    scanTimerRef.current = globalThis.setInterval(() => {
      currentStage++;
      if (currentStage < stages.length) {
        setTypewriterText(stages[currentStage]);
        setScanProgress(Math.round(10 + (currentStage / stages.length) * 80));
      }
    }, 1200);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market: symbol, interval, visibleRange }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '분석 실패' }));
        throw new Error(errorData.error || '분석 실패');
      }

      const responseData = await response.json();
      setScanProgress(100);

      if (responseData.analysis?.smcData) {
        setAnalysisResult(responseData.analysis.smcData);
        setLocalScanCount(prev => prev + 1);
        showToast('✅ AI 분석이 완료되었습니다.');
      }

      router.refresh();
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'}`);
    } finally {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      setIsScanning(false);
      setScanProgress(0);
    }
  }, [dailyLimit, localScanCount, router, symbol, interval, visibleRange]);

  // ── Cleanup timer on unmount ──
  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, []);

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────

  const getTierIcon = () => {
    switch(userTier) {
      case 'STANDARD': return <Award className="w-5 h-5 text-indigo-400" />;
      case 'PREMIUM': return <Crown className="w-5 h-5 text-emerald-400" />;
      case 'LIFETIME':
      case 'PARTNER': return <Diamond className="w-5 h-5 text-purple-400" />;
      default: return <Zap className="w-5 h-5 text-slate-400" />;
    }
  };

  const getTierColor = () => {
    switch(userTier) {
      case 'STANDARD': return 'text-indigo-400';
      case 'PREMIUM': return 'text-emerald-400';
      case 'LIFETIME':
      case 'PARTNER': return 'text-purple-400';
      default: return 'text-slate-400';
    }
  };

  const isLimitReached = localScanCount >= dailyLimit && dailyLimit < 9999;
  const fakeoutWarning = analysisResult?.fakeout_warning?.detected ? analysisResult.fakeout_warning : null;
  const remainingScans = dailyLimit > 9000 ? '∞' : Math.max(0, dailyLimit - localScanCount);

  const renderExecutiveTargets = () => {
    if (!analysisResult) return null;
    return (
      <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Crosshair className="w-32 h-32" />
        </div>
        <h3 className="text-slate-500 text-xs font-black tracking-[0.2em] mb-5 border-b border-slate-800 pb-2 flex items-center gap-1.5">
          EXECUTIVE TARGETS
          <Tooltip text="AI가 추천하는 진입가(Entry), 목표가(TP), 손절가(SL) 가격입니다." />
        </h3>

        <div className="flex flex-col gap-4">
          <div>
            <span className="text-slate-500 text-xs font-bold tracking-widest block mb-1">ENTRY (OB)</span>
            <span className="text-5xl font-black text-white tabular-nums">{formatPrice(analysisResult.plan_a?.entry, symbol)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-500/5 border border-green-500/20 p-3 rounded-xl">
              <span className="text-green-500/60 text-[10px] font-bold tracking-widest block mb-1">TARGET (TP)</span>
              <span className="text-xl font-black text-green-400 tabular-nums">{formatPrice(analysisResult.plan_a?.tp, symbol)}</span>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl">
              <span className="text-red-500/60 text-[10px] font-bold tracking-widest block mb-1">STOP (SL)</span>
              <span className="text-xl font-black text-red-400 tabular-nums">{formatPrice(analysisResult.plan_a?.sl, symbol)}</span>
            </div>
          </div>

          {/* Copy buttons */}
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[
              { label: 'Entry', value: analysisResult.plan_a?.entry },
              { label: 'TP', value: analysisResult.plan_a?.tp },
              { label: 'SL', value: analysisResult.plan_a?.sl },
            ].map(({ label, value }) => (
              <button
                key={label}
                onClick={() => {
                  const formatted = formatPrice(value, symbol);
                  if (formatted !== 'N/A') {
                    navigator.clipboard.writeText(formatted).then(() => showToast(`${label} 복사됨: ${formatted}`));
                  }
                }}
                className="text-[10px] text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-600 py-1.5 rounded-lg transition-all font-mono"
              >
                {label} 복사
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.5s_ease-out]">

      {/* ── Toast notification ── */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[100] bg-slate-900 border border-slate-700 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-2xl animate-[slideIn_0.3s_ease-out] max-w-xs">
          {toastMsg}
        </div>
      )}

      {/* ── Tier Info Card ── */}
      <div className="bg-gradient-to-br from-slate-900 to-[#0a0a0a] border border-slate-800 p-4 md:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5 shadow-inner flex-shrink-0">
            {getTierIcon()}
          </div>
          <div>
            <h3 className={`font-bold tracking-wide text-sm ${getTierColor()}`}>{userTier} TIER</h3>
            <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
              <Target className="w-3 h-3" />
              남은 스캔:
              <span className={`font-black ${isLimitReached ? 'text-red-400' : 'text-cyan-400'}`}>
                {remainingScans}
              </span>
              {typeof remainingScans === 'number' && (
                <span className="text-slate-600 text-[10px]">/ {dailyLimit}</span>
              )}
            </p>
          </div>
        </div>

        {/* Progress bar for daily scan usage */}
        {dailyLimit < 9999 && (
          <div className="flex-1 min-w-[120px] max-w-[200px]">
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isLimitReached ? 'bg-red-500' : 'bg-cyan-500'}`}
                style={{ width: `${Math.min(100, (localScanCount / dailyLimit) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-600 mt-1 text-right">{localScanCount}/{dailyLimit} 사용</p>
          </div>
        )}

        <Link
          href="/pricing"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors border border-slate-700 flex-shrink-0"
        >
          업그레이드
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* ─── LEFT PANEL: Chart (70%) ─── */}
        <div className="xl:col-span-8 flex flex-col gap-5 min-w-0">

          {/* Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <MonitorPlay className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <h2 className="text-white font-bold tracking-wide text-sm">Quant Terminal</h2>
              <span className="text-[10px] text-slate-500 font-mono bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">DATA-DRIVEN</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Symbol Selector */}
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors font-mono flex-1 sm:flex-initial"
                aria-label="종목 선택"
              >
                <option value="OANDA:EURUSD">EUR/USD</option>
                <option value="OANDA:USDJPY">USD/JPY</option>
                <option value="OANDA:GBPUSD">GBP/USD</option>
                <option value="OANDA:AUDUSD">AUD/USD</option>
                <option value="OANDA:XAUUSD">XAU/USD (금)</option>
                <option value="OANDA:XAGUSD">XAG/USD (은)</option>
                <option value="OANDA:BTCUSD">BTC/USD</option>
                <option value="OANDA:NAS100USD">US100 (나스닥)</option>
                <option value="OANDA:HK33HKD">HK33 (항셍)</option>
              </select>

              {/* Interval Selector — pill style */}
              <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 gap-0.5" role="group" aria-label="타임프레임 선택">
                {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setInterval(tf)}
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${
                      interval === tf
                        ? 'bg-cyan-500 text-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    aria-pressed={interval === tf}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Guide & Neural Scan Trigger */}
          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="flex-1 min-w-0">
              <h4 className="text-white font-bold text-sm mb-1.5 flex items-center gap-2">
                <Scan className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                100% Data-Driven AI 분석
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                OHLCV 캔들 데이터를 실시간 페치하여 AI에 주입합니다. 가격 환각 없이 100캔들의 시장 구조를 해독합니다.
              </p>
            </div>

            <div className="flex-shrink-0 relative z-10 flex flex-col items-center gap-2">
              <button
                onClick={handleAnalysis}
                disabled={isScanning || isLimitReached}
                aria-label={isLimitReached ? '일일 한도 도달' : 'AI 스캔 시작'}
                className={`relative overflow-hidden px-6 py-3.5 rounded-xl font-black tracking-widest text-sm transition-all duration-300 ${
                  isScanning || isLimitReached
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-cyan-500 text-black hover:bg-cyan-400 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]'
                }`}
              >
                {isScanning ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    SCANNING...
                  </span>
                ) : isLimitReached ? (
                  '한도 초과'
                ) : (
                  <span className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    NEURAL SCAN
                  </span>
                )}
              </button>
              {isLimitReached && (
                <Link href="/pricing" className="text-[10px] text-cyan-400 hover:underline">
                  업그레이드로 계속 사용하기 →
                </Link>
              )}
            </div>
          </div>

          {/* Chart Container */}
          <div className="w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative min-h-[420px]">
            <TradingViewWidget
              symbol={symbol}
              interval={interval}
              entry={analysisResult?.plan_a?.entry}
              tp={analysisResult?.plan_a?.tp}
              sl={analysisResult?.plan_a?.sl}
              trend={analysisResult?.trend}
            />

            {/* Scanning Overlay */}
            {isScanning && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-8 backdrop-blur-md z-50 overflow-hidden">
                <style dangerouslySetInnerHTML={{ __html: `
                  @keyframes scan-sweep {
                    0% { transform: translateY(0); opacity: 0.3; }
                    50% { transform: translateY(380px); opacity: 0.8; }
                    100% { transform: translateY(0); opacity: 0.3; }
                  }
                ` }} />

                <div
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] pointer-events-none z-10"
                  style={{ animation: 'scan-sweep 3s ease-in-out infinite', top: 0 }}
                />

                <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.04)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none opacity-40" />

                <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
                  <div className="absolute inset-2 border border-dashed border-cyan-400/50 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
                  <div className="absolute inset-5 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                    <Activity className="w-8 h-8 text-cyan-400 animate-pulse" />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-xs mb-4">
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1.5">
                    <span>진행률</span>
                    <span>{scanProgress}%</span>
                  </div>
                  <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-700"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>

                <div className="w-full max-w-sm bg-black/60 border border-cyan-500/20 p-4 rounded-xl font-mono text-[11px] text-cyan-400/80 mb-4 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 text-[9px] text-cyan-500/40 uppercase tracking-widest animate-pulse">
                    System Diagnostics
                  </div>
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between">
                      <span className="text-cyan-500/60">&gt; TARGET_MARKET:</span>
                      <span>{cleanSymbol(symbol)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyan-500/60">&gt; TIMEFRAME:</span>
                      <span>{interval}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyan-500/60">&gt; SMC_RESOLVER:</span>
                      <span className="animate-pulse">RUNNING...</span>
                    </div>
                    <div className="h-px bg-cyan-500/10 my-2" />
                    <div className="text-cyan-300 font-bold tracking-wide animate-pulse">
                      {typewriterText}
                    </div>
                  </div>
                </div>

                <div className="text-slate-400 text-xs font-medium tracking-[0.2em] uppercase">
                  DECRYPTING MARKET STRUCTURE
                </div>
              </div>
            )}
          </div>

          {/* Mobile Executive Targets */}
          {analysisResult && (
            <div className="xl:hidden">
              {renderExecutiveTargets()}
            </div>
          )}

          {/* STRATEGY THESIS */}
          {analysisResult && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl animate-[slideIn_0.4s_ease-out] overflow-hidden">
              <button
                onClick={() => setShowThesisExpanded(!showThesisExpanded)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-800/20 transition-colors"
                aria-expanded={showThesisExpanded}
              >
                <h3 className="text-slate-500 text-xs font-black tracking-[0.2em]">STRATEGY THESIS</h3>
                {showThesisExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {showThesisExpanded && (
                <div className="px-6 pb-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`px-3 py-1 text-xs font-black tracking-widest rounded-md ${
                      analysisResult.thesis?.action?.includes('BUY') ? 'bg-green-500 text-black' :
                      analysisResult.thesis?.action?.includes('SELL') ? 'bg-red-500 text-white' :
                      'bg-slate-600 text-white'
                    }`}>
                      {analysisResult.thesis?.action || 'WAIT'}
                    </div>
                    <div className="text-slate-400 text-xs font-mono">{cleanSymbol(symbol)} · {analysisResult.trend || 'NEUTRAL'} BIAS</div>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {analysisResult.thesis?.reasoning || '분석 중입니다...'}
                  </p>

                  {analysisResult.thesis?.reasoning_list && Array.isArray(analysisResult.thesis.reasoning_list) && analysisResult.thesis.reasoning_list.length > 0 && (
                    <div className="mt-3 pt-4 border-t border-slate-800 space-y-2.5">
                      <span className="text-slate-500 text-[10px] font-black tracking-widest block uppercase">TECHNICAL EVIDENCE</span>
                      {analysisResult.thesis.reasoning_list.map((reason: string, idx: number) => (
                        <div key={idx} className="flex gap-2.5 items-start text-xs text-slate-300">
                          <span className="flex items-center justify-center w-5 h-5 rounded bg-cyan-950 border border-cyan-800/50 text-cyan-400 font-bold text-xs shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Multi-Timeframe Analysis */}
          {analysisResult && analysisResult.multi_timeframe_analysis && typeof analysisResult.multi_timeframe_analysis === 'object' && !Array.isArray(analysisResult.multi_timeframe_analysis) && (
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl animate-[slideIn_0.4s_ease-out] space-y-4">
              <h3 className="text-slate-500 text-xs font-black tracking-[0.2em]">
                MULTI-TIMEFRAME FLOW
                <Tooltip text="현재 선택 타임프레임 주변의 다른 봉 기준 추세 방향을 분석합니다." />
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(analysisResult.multi_timeframe_analysis as Record<string, { trend?: string; flow_analysis?: string } | null | undefined>).map(([tf, tfData]) => {
                  const isBullish = tfData?.trend === 'BULLISH';
                  const isBearish = tfData?.trend === 'BEARISH';
                  return (
                    <div key={tf} className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-xs">
                          {tf === '1d' ? '일봉 (1D)' : tf === '1h' ? '1H' : tf === '30m' ? '30M' : '5M'}
                        </span>
                        <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded ${
                          isBullish ? 'bg-green-500/20 text-green-400' :
                          isBearish ? 'bg-red-500/20 text-red-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {tfData?.trend || 'NEUTRAL'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">{tfData?.flow_analysis || '데이터 없음'}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT PANEL: Results (30%) ─── */}
        <div className="xl:col-span-4 flex flex-col gap-5">

          {!analysisResult ? (
            <div className="flex-1 bg-slate-900/40 border border-slate-800/50 rounded-2xl flex flex-col items-center justify-center p-8 text-center min-h-[360px]">
              <Scan className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-slate-500 font-bold tracking-wider text-sm">AWAITING NEURAL SCAN</p>
              <p className="text-slate-600 text-xs mt-2">좌측 NEURAL SCAN 버튼을 클릭하면 AI 분석이 시작됩니다.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5 animate-[slideIn_0.4s_ease-out]">

              {/* Fakeout Warning */}
              {fakeoutWarning && (
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3" role="alert">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-red-500 font-bold text-sm mb-1">LIQUIDITY SWEEP DETECTED</h4>
                    <p className="text-red-400/80 text-xs leading-relaxed">{fakeoutWarning.message}</p>
                  </div>
                </div>
              )}

              {/* Desktop Executive Targets */}
              <div className="hidden xl:block">
                {renderExecutiveTargets()}
              </div>

              {/* DIAGNOSTICS */}
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                <h3 className="text-slate-500 text-xs font-black tracking-[0.2em] mb-4 flex items-center gap-1">
                  AI DIAGNOSTICS
                  <Tooltip text="AI가 감지한 패턴과 유동성 구간 정보입니다." />
                </h3>

                {/* Pattern Confidence */}
                <div className="mb-5">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-white text-sm font-bold truncate mr-2">{analysisResult.patterns?.name || 'No Pattern'}</span>
                    <span className="text-cyan-400 text-xs font-mono flex-shrink-0">{analysisResult.patterns?.confidence || 0}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden" role="progressbar" aria-valuenow={analysisResult.patterns?.confidence || 0} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-1000"
                      style={{ width: `${analysisResult.patterns?.confidence || 0}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">패턴 신뢰도</p>
                </div>

                {/* Liquidity */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 text-xs font-bold tracking-wider">LIQUIDITY</span>
                    <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded ${
                      analysisResult.liquidity?.stop_hunt_risk === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                      analysisResult.liquidity?.stop_hunt_risk === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      RISK: {analysisResult.liquidity?.stop_hunt_risk || 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-mono bg-slate-950 border border-slate-800/50 px-3 py-2 rounded-lg">
                      <span className="text-slate-500">ABOVE</span>
                      <span className="text-red-400 font-bold tabular-nums">{formatPrice(analysisResult.liquidity?.pool_above, symbol)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono bg-slate-950 border border-slate-800/50 px-3 py-2 rounded-lg">
                      <span className="text-slate-500">BELOW</span>
                      <span className="text-green-400 font-bold tabular-nums">{formatPrice(analysisResult.liquidity?.pool_below, symbol)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick link to history */}
              <Link
                href="/dashboard/history"
                className="flex items-center justify-between px-4 py-3 bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-all group"
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  분석 히스토리 보기
                </span>
                <span className="text-slate-600 group-hover:text-slate-400">→</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="upgrade-modal-title">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
              aria-label="닫기"
            >
              ✕
            </button>
            <Crown className="w-10 h-10 text-yellow-500 mb-4 mx-auto" />
            <h2 id="upgrade-modal-title" className="text-xl font-bold text-white text-center mb-2">일일 한도 초과</h2>
            <p className="text-slate-300 text-center text-sm mb-6 leading-relaxed">
              오늘의 무료 AI 스캔 횟수를 모두 사용하셨습니다. 더 많은 분석을 이용하시려면 플랜을 업그레이드하세요.
            </p>
            <Link
              href="/pricing"
              className="block w-full py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold rounded-xl text-center transition-all text-sm"
            >
              업그레이드 확인하기
            </Link>
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="block w-full mt-2 py-2 text-slate-500 hover:text-slate-300 text-sm text-center transition-colors"
            >
              나중에
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
