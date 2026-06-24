'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Target, Loader2, Zap, Award, Crown, Diamond, AlertTriangle, MonitorPlay, Activity, Crosshair, BarChart3, Scan } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LightweightChart from './LightweightChart';

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
  'OANDA:HK50':      0,
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

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function DashboardClient({ initialHistories, todayScanCount, dailyLimit, userTier }: DashboardClientProps) {
  const router = useRouter();

  // ── Mounting ──
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── Symbol & Interval ──
  const [symbol, setSymbol] = useState('OANDA:EURUSD');
  const [interval, setInterval] = useState('15m');
  const [visibleRange, setVisibleRange] = useState<{ from: number; to: number } | null>(null);

  // ── Chart data ──
  const [ohlcvData, setOhlcvData] = useState<OHLCVData[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  // ── Analysis result (state-based, survives re-renders) ──
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(() => {
    // Hydrate from server-provided initial histories
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const scanTimerRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(null);

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
          // Clear previous analysis when switching instruments
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
    if (todayScanCount >= dailyLimit && dailyLimit < 9999) {
      setShowUpgradeModal(true);
      return;
    }

    if (!window.confirm('데이터 기반 AI 분석을 진행하시겠습니까?\n(일일 무료 분석 횟수가 차감됩니다.)')) {
      return;
    }

    setIsScanning(true);
    setAnalysisResult(null);

    const stages = [
      '[OHLCV 데이터 파이프라인 연결 중...]',
      '[최근 100 캔들 데이터 수집 완료]',
      '[SMC 딥러닝 텍스트 변환 중...]',
      '[오더블록(Order Block) 존 계산 중...]',
      '[유동성 풀(Liquidity Pool) 탐색 중...]',
      '[최적 진입점(Entry) 도출 중...]'
    ];

    let currentStage = 0;
    setTypewriterText(stages[0]);
    scanTimerRef.current = globalThis.setInterval(() => {
      currentStage++;
      if (currentStage < stages.length) {
        setTypewriterText(stages[currentStage]);
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
      
      // Update analysis result panel
      if (responseData.analysis?.smcData) {
        setAnalysisResult(responseData.analysis.smcData);
      }

      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
    } finally {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      setIsScanning(false);
    }
  }, [dailyLimit, todayScanCount, router, symbol, interval, visibleRange]);

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
      case 'STANDARD': return <Award className="w-6 h-6 text-indigo-400" />;
      case 'PREMIUM': return <Crown className="w-6 h-6 text-emerald-400" />;
      case 'LIFETIME':
      case 'PARTNER': return <Diamond className="w-6 h-6 text-purple-400" />;
      default: return <Zap className="w-6 h-6 text-slate-400" />;
    }
  };

  const isLimitReached = todayScanCount >= dailyLimit && dailyLimit < 9999;
  const fakeoutWarning = analysisResult?.fakeout_warning?.detected ? analysisResult.fakeout_warning : null;

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
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-[fadeIn_0.5s_ease-out]">
      
      {/* ─── LEFT PANEL: Chart Widget (70%) ─── */}
      <div className="xl:col-span-8 flex flex-col gap-6 min-w-0">
        
        {/* Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-xl backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-3">
            <MonitorPlay className="w-5 h-5 text-cyan-400" />
            <h2 className="text-white font-bold tracking-wider">Quant Terminal (Data-Driven)</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Symbol Selector */}
            <select 
              value={symbol} 
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
            >
              <option value="OANDA:EURUSD">EUR/USD (유로/달러)</option>
              <option value="OANDA:USDJPY">USD/JPY (달러/엔)</option>
              <option value="OANDA:GBPUSD">GBP/USD (파운드/달러)</option>
              <option value="OANDA:AUDUSD">AUD/USD (호주달러/달러)</option>
              <option value="OANDA:XAUUSD">XAU/USD (금)</option>
              <option value="OANDA:XAGUSD">XAG/USD (은)</option>
              <option value="OANDA:BTCUSD">BTC/USD (비트코인)</option>
              <option value="OANDA:NAS100USD">US100 (나스닥)</option>
              <option value="OANDA:HK50">HK50 (항셍)</option>
            </select>

            {/* Interval Selector */}
            <select 
              value={interval} 
              onChange={(e) => setInterval(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors font-mono w-24"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1H</option>
              <option value="4h">4H</option>
              <option value="1d">1D</option>
            </select>
          </div>
        </div>

        {/* Action Guide & Neural Scan Trigger */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-6 shadow-inner relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          <div className="flex-1">
            <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
              <Scan className="w-4 h-4 text-cyan-400" />
              100% Data-Driven 분석
            </h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              OHLCV 캔들 데이터를 백엔드 서버에서 실시간 페치(Fetch)하여 AI에 주입합니다. 가격 환각 없는 압도적인 정확도를 경험하세요. 우측 버튼 클릭 시 100캔들의 시장 구조를 해독합니다.
            </p>
          </div>

          <div className="flex-shrink-0 relative z-10">
            <button
              onClick={handleAnalysis}
              disabled={isScanning || isLimitReached}
              className={`relative overflow-hidden group px-8 py-4 rounded-xl font-black tracking-widest text-lg transition-all duration-300 ${
                isScanning || isLimitReached
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-cyan-500 text-black hover:bg-cyan-400 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]'
              }`}
            >
              {isScanning ? (
                <span className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  SCANNING...
                </span>
              ) : isLimitReached ? (
                'LIMIT REACHED'
              ) : (
                <span className="flex items-center gap-3">
                  <Activity className="w-6 h-6" />
                  NEURAL SCAN START
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Chart Container */}
        <div className="w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative min-h-[420px]">
          {ohlcvData.length > 0 ? (
            <LightweightChart 
              data={ohlcvData}
              symbol={symbol}
              entry={analysisResult?.plan_a?.entry} 
              tp={analysisResult?.plan_a?.tp} 
              sl={analysisResult?.plan_a?.sl} 
              onVisibleRangeChange={setVisibleRange}
            />
          ) : (
            <div className="h-[420px] w-full bg-slate-950/50 flex flex-col items-center justify-center text-slate-500">
              {isLoadingChart ? (
                <>
                  <Loader2 className="w-16 h-16 mb-4 animate-spin text-indigo-500 opacity-50" />
                  <p className="text-lg font-bold tracking-widest animate-pulse">LOADING CHART DATA...</p>
                </>
              ) : chartError ? (
                <>
                  <AlertTriangle className="w-16 h-16 mb-4 text-red-500/50" />
                  <p className="text-lg font-bold tracking-widest text-red-400">DATA FETCH ERROR</p>
                  <p className="text-sm mt-2 text-red-400/60">{chartError}</p>
                </>
              ) : (
                <>
                  <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-bold tracking-widest">NO DATA LOADED</p>
                  <p className="text-sm mt-2">상단 종목을 선택하면 자동으로 차트가 로드됩니다.</p>
                </>
              )}
            </div>
          )}

          {/* Loading overlay on existing chart */}
          {isLoadingChart && ohlcvData.length > 0 && (
            <div className="absolute inset-0 bg-[#0a0a0a]/50 flex items-center justify-center z-40 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          )}

          {/* High-Tech Holographic Scanning Overlay */}
          {isScanning && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-8 backdrop-blur-md z-50 overflow-hidden">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scan-sweep {
                  0% { transform: translateY(0); opacity: 0.3; }
                  50% { transform: translateY(380px); opacity: 0.8; }
                  100% { transform: translateY(0); opacity: 0.3; }
                }
              ` }} />

              {/* Glowing Holographic Scan Beam */}
              <div 
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] pointer-events-none z-10"
                style={{
                  animation: 'scan-sweep 3s ease-in-out infinite',
                  top: 0
                }}
              />

              {/* Grid background effect */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none opacity-40" />

              {/* Glowing central scanner core */}
              <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-2 border border-dashed border-cyan-400/50 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
                <div className="absolute inset-6 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                  <Activity className="w-10 h-10 text-cyan-400 animate-pulse" />
                </div>
              </div>

              {/* Real-time Decrypting Data Terminal Feed */}
              <div className="w-full max-w-md bg-black/60 border border-cyan-500/20 p-4 rounded-xl font-mono text-[11px] text-cyan-400/80 mb-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 text-[9px] text-cyan-500/40 uppercase tracking-widest animate-pulse">
                  System Diagnostics
                </div>
                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between">
                    <span className="text-cyan-500/60">&gt; TARGET_MARKET:</span>
                    <span>{cleanSymbol(symbol)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-500/60">&gt; TIMEFRAME_INTERVAL:</span>
                    <span>{interval}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-500/60">&gt; DATA_POINTS_PARSED:</span>
                    <span className="text-emerald-400">OK (VISIBLE_RANGE)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-500/60">&gt; SMC_MATRIX_RESOLVER:</span>
                    <span className="animate-pulse">RUNNING...</span>
                  </div>
                  <div className="h-px bg-cyan-500/10 my-2" />
                  <div className="text-cyan-300 font-bold text-center tracking-wide animate-pulse">
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

        {/* STRATEGY THESIS (moved under the chart) */}
        {analysisResult && (
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl animate-[slideIn_0.4s_ease-out] space-y-4">
            <h3 className="text-slate-500 text-xs font-black tracking-[0.2em]">STRATEGY THESIS</h3>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 text-xs font-black tracking-widest rounded-md ${
                analysisResult.thesis?.action?.includes('BUY') ? 'bg-green-500 text-black' :
                analysisResult.thesis?.action?.includes('SELL') ? 'bg-red-500 text-white' :
                'bg-slate-600 text-white'
              }`}>
                {analysisResult.thesis?.action || 'WAIT'}
              </div>
              <div className="text-slate-400 text-xs font-mono">{cleanSymbol(symbol)} {analysisResult.trend || 'NEUTRAL'} BIAS</div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              {analysisResult.thesis?.reasoning || '분석 중입니다...'}
            </p>

            {/* 5 Technical Reasons List */}
            {analysisResult.thesis?.reasoning_list && analysisResult.thesis.reasoning_list.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                <span className="text-slate-500 text-[10px] font-black tracking-widest block uppercase mb-1">TECHNICAL EVIDENCE (기술적 분석 근거)</span>
                <div className="flex flex-col gap-2.5">
                  {analysisResult.thesis.reasoning_list.map((reason: string, idx: number) => (
                    <div key={idx} className="flex gap-2.5 items-start text-xs text-slate-300">
                      <span className="flex items-center justify-center w-5 h-5 rounded bg-cyan-950 border border-cyan-800/50 text-cyan-400 font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Multi-Timeframe Chart Flow Matrix */}
        {analysisResult && analysisResult.multi_timeframe_analysis && typeof analysisResult.multi_timeframe_analysis === 'object' && (
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl animate-[slideIn_0.4s_ease-out] space-y-4">
            <h3 className="text-slate-500 text-xs font-black tracking-[0.2em]">MULTI-TIMEFRAME CHART FLOW (주변 타임프레임 차트 흐름 분석)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(analysisResult.multi_timeframe_analysis as Record<string, { trend?: string; flow_analysis?: string } | null | undefined>).map(([tf, tfData]) => {
                const isBullish = tfData?.trend === 'BULLISH';
                const isBearish = tfData?.trend === 'BEARISH';
                return (
                  <div key={tf} className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold text-sm">{tf === '1d' ? '일봉 (1D)' : tf === '1h' ? '1시간봉 (1H)' : tf === '30m' ? '30분봉 (30m)' : '5분봉 (5m)'}</span>
                      <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded ${
                        isBullish ? 'bg-green-500/20 text-green-400' :
                        isBearish ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {tfData?.trend || 'NEUTRAL'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      {tfData?.flow_analysis || '데이터 없음'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ─── RIGHT PANEL: Results & Diagnostics (30%) ─── */}
      <div className="xl:col-span-4 flex flex-col gap-6">
        
        {/* Tier Info Card */}
        <div className="bg-gradient-to-br from-slate-900 to-[#0a0a0a] border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-950 rounded-xl border border-white/5 shadow-inner">
              {getTierIcon()}
            </div>
            <div>
              <h3 className="text-white font-bold tracking-wide">{userTier} TIER</h3>
              <p className="text-slate-400 text-sm flex items-center gap-1">
                <Target className="w-3 h-3" />
                Remaining Scans: <span className="text-cyan-400 font-bold">{dailyLimit > 9000 ? '∞' : dailyLimit - todayScanCount}</span>
              </p>
            </div>
          </div>
          <Link href="/pricing" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors border border-slate-700">
            UPGRADE
          </Link>
        </div>

        {/* ANALYSIS RESULT PANEL */}
        {!analysisResult ? (
          <div className="flex-1 bg-slate-900/40 border border-slate-800/50 rounded-2xl flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
            <Scan className="w-12 h-12 text-slate-700 mb-4" />
            <p className="text-slate-400 font-bold tracking-widest">AWAITING NEURAL SCAN</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-[slideIn_0.4s_ease-out]">
            
            {/* Fakeout Warning Alert */}
            {fakeoutWarning && (
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-red-500 font-bold text-sm mb-1">LIQUIDITY SWEEP DETECTED</h4>
                  <p className="text-red-400/80 text-xs leading-relaxed">{fakeoutWarning.message}</p>
                </div>
              </div>
            )}

            {/* THE BIG THREE (ENTRY, TP, SL) */}
            <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Crosshair className="w-32 h-32" />
              </div>
              <h3 className="text-slate-500 text-xs font-black tracking-[0.2em] mb-6 border-b border-slate-800 pb-2">EXECUTIVE TARGETS</h3>
              
              <div className="flex flex-col gap-5">
                <div>
                  <span className="text-slate-500 text-xs font-bold tracking-widest block mb-1">ENTRY (OB)</span>
                  <span className="text-5xl font-black text-white">{formatPrice(analysisResult.plan_a?.entry, symbol)}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-green-500/5 border border-green-500/20 p-3 rounded-xl">
                    <span className="text-green-500/60 text-[10px] font-bold tracking-widest block mb-1">TARGET (TP)</span>
                    <span className="text-2xl font-black text-green-400">{formatPrice(analysisResult.plan_a?.tp, symbol)}</span>
                  </div>
                  <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl">
                    <span className="text-red-500/60 text-[10px] font-bold tracking-widest block mb-1">STOP (SL)</span>
                    <span className="text-2xl font-black text-red-400">{formatPrice(analysisResult.plan_a?.sl, symbol)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* DIAGNOSTICS */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-slate-500 text-xs font-black tracking-[0.2em] mb-5">AI DIAGNOSTICS</h3>
              
              {/* Pattern Confidence */}
              <div className="mb-5">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-white text-sm font-bold">{analysisResult.patterns?.name || 'No Pattern'}</span>
                  <span className="text-cyan-400 text-xs font-mono">{analysisResult.patterns?.confidence || 0}% CONFIDENCE</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full relative"
                    style={{ width: `${analysisResult.patterns?.confidence || 0}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
                  </div>
                </div>
              </div>

              {/* Liquidity Heatmap */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400 text-xs font-bold tracking-wider">LIQUIDITY HEATMAP</span>
                  <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded ${
                    analysisResult.liquidity?.stop_hunt_risk === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                    analysisResult.liquidity?.stop_hunt_risk === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    RISK: {analysisResult.liquidity?.stop_hunt_risk || 'N/A'}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-mono bg-slate-950 border border-slate-800/50 px-3 py-2 rounded-lg">
                    <span className="text-slate-500">ABOVE POOL</span>
                    <span className="text-red-400 font-bold">{formatPrice(analysisResult.liquidity?.pool_above, symbol)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono bg-slate-950 border border-slate-800/50 px-3 py-2 rounded-lg">
                    <span className="text-slate-500">BELOW POOL</span>
                    <span className="text-green-400 font-bold">{formatPrice(analysisResult.liquidity?.pool_below, symbol)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-md w-full shadow-2xl relative">
            <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
            <Crown className="w-12 h-12 text-yellow-500 mb-4 mx-auto" />
            <h2 className="text-2xl font-bold text-white text-center mb-2">한도 초과</h2>
            <p className="text-slate-300 text-center mb-6">
              오늘의 무료 AI 스캔 횟수를 모두 사용하셨습니다. 계속해서 기관급 SMC 분석을 이용하시려면 멤버십을 업그레이드하세요.
            </p>
            <Link href="/pricing" className="block w-full py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold rounded-xl text-center transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)]">
              업그레이드 확인하기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
