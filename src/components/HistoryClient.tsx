'use client';

import React, { useState } from 'react';
import { Search, Calendar, TrendingUp, TrendingDown, X, Eye, Activity, AlertTriangle, ChevronDown, Zap, Crosshair, Loader2 } from 'lucide-react';

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
  if (price === undefined || price === null || price === '' || price === '-') return '-';
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

interface HistoryClientProps {
  initialHistories: HistoryItem[];
  todayScanCount: number;
  dailyLimit: number;
}

export default function HistoryClient({ initialHistories, todayScanCount, dailyLimit }: HistoryClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [isLoadingLivePrice, setIsLoadingLivePrice] = useState(false);

  React.useEffect(() => {
    if (!selectedItem) {
      setLivePrice(null);
      return;
    }

    const fetchLivePrice = async () => {
      setIsLoadingLivePrice(true);
      try {
        const res = await fetch('/api/chart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ market: selectedItem.market, interval: '15m' }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ohlcvData && data.ohlcvData.length > 0) {
            const lastCandle = data.ohlcvData[data.ohlcvData.length - 1];
            setLivePrice(lastCandle.close);
          }
        }
      } catch (err) {
        console.error('Failed to fetch live price:', err);
      } finally {
        setIsLoadingLivePrice(false);
      }
    };

    fetchLivePrice();
  }, [selectedItem]);

  // Filter histories based on search term
  const filteredHistories = initialHistories.filter(item =>
    item.market.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.trend.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format date simply
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  return (
    <div className="space-y-6">
      {/* Search Filter Bar & Usage Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="종목명 또는 트렌드 내용 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none text-white placeholder-slate-600 transition-all text-sm"
          />
        </div>
        <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 px-4 py-2.5 rounded-xl shrink-0">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-slate-300">오늘 사용횟수:</span>
          <span className="text-sm font-black text-white ml-1">
            <span className={todayScanCount >= dailyLimit ? "text-pink-400" : "text-cyan-400"}>
              {todayScanCount}
            </span>
            <span className="text-slate-500 font-normal mx-1">/</span>
            {dailyLimit >= 9999 ? '무제한' : dailyLimit}
          </span>
        </div>
      </div>

      {/* History Table Container */}
      <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-5">요청 일시</th>
                <th className="px-6 py-5">분석 종목/태그</th>
                <th className="px-6 py-5">판단 결과</th>
                <th className="px-6 py-5">상태</th>
                <th className="px-6 py-5 text-right">상세 보기</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredHistories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">
                    검색 결과 또는 분석 히스토리가 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                filteredHistories.map((item) => {
                  const isBullish = item.trend.toUpperCase().includes('BULLISH') || item.trend.includes('상승') || item.trend.includes('🟢');
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="hover:bg-slate-900/30 transition-all cursor-pointer group"
                    >
                      <td className="px-6 py-5 text-sm text-slate-350 font-medium whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {formatDate(item.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-white font-bold whitespace-nowrap">
                        <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
                          {cleanSymbol(item.market)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm whitespace-nowrap">
                        {isBullish ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <TrendingUp className="w-3 h-3" />
                            상승 우세 ({item.planAProbability}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <TrendingDown className="w-3 h-3" />
                            하락 우세 ({item.planAProbability}%)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-sm whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                          완료
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/50 bg-cyan-500/5 px-3 py-1.5 rounded-lg transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          결과 보기
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Beautiful Glassmorphic Dialog Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Overlay with blur */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setSelectedItem(null)}
          />

          {/* Modal Container */}
          <div className="relative bg-slate-900/90 border border-slate-800/80 rounded-2xl w-full max-w-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden z-10 animate-[scaleIn_0.2s_ease-out] flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/30">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-cyan-400 uppercase bg-cyan-950/50 border border-cyan-800/30 px-2 py-0.5 rounded">
                  AI 차트 정밀 진단서
                </span>
                <h3 className="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
                  {cleanSymbol(selectedItem.market)} 스캔 기록
                  <span className="text-xs text-slate-500 font-normal">
                    ({formatDate(selectedItem.createdAt)})
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-white hover:bg-slate-800/50 p-1.5 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {(() => {
                let parsedResult = null;
                if (selectedItem.resultJson) {
                  try { parsedResult = JSON.parse(selectedItem.resultJson); } catch {}
                }

                if (parsedResult) {
                  // Dopamine UI
                  const { fakeout_warning, action_tag, plan_alpha, plan_a, risk_management, order_block_zone, price_context, thesis, multi_timeframe_analysis } = parsedResult;
                  const planA = plan_a || plan_alpha;
                  const action = thesis?.action || action_tag;
                  const reasoningList = Array.isArray(thesis?.reasoning_list) ? thesis.reasoning_list : (thesis?.reasoning ? [thesis.reasoning] : []);

                  // Safely resolve metrics
                  const killZone = parsedResult.market_structure?.kill_zone || order_block_zone || '-';
                  const patternName = parsedResult.patterns?.name || 'None';
                  const patternConfidence = parsedResult.patterns?.confidence || 0;
                  const poolAbove = parsedResult.liquidity?.pool_above || price_context?.y_axis_max || '-';
                  const poolBelow = parsedResult.liquidity?.pool_below || price_context?.y_axis_min || '-';
                  const riskMgmt = risk_management || parsedResult.liquidity?.stop_hunt_risk || 'MEDIUM';

                  // Calculate Prediction vs Actual live stats
                  const entryVal = planA?.entry ? parseFloat(String(planA.entry).replace(/,/g, '')) : NaN;
                  const liveVal = livePrice;
                  const hasLiveDiff = !isNaN(entryVal) && liveVal !== null;
                  const isBullishTrade = action?.toUpperCase().includes('BUY') || selectedItem.trend.toUpperCase().includes('BULLISH') || selectedItem.trend.includes('상승') || selectedItem.trend.includes('🟢');
                  
                  let pctChange = 0;
                  let isProfit = false;
                  if (hasLiveDiff && liveVal) {
                    const diff = liveVal - entryVal;
                    pctChange = (diff / entryVal) * 100;
                    isProfit = isBullishTrade ? diff > 0 : diff < 0;
                  }

                  return (
                    <div className="space-y-6">
                      {/* Live Prediction vs Actual Card */}
                      <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 shadow-inner">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-900 pb-3">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                            <span className="text-xs font-bold text-slate-350 tracking-wider">실시간 시세 비교 피드백 (Prediction vs Actual)</span>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded tracking-widest ${
                            isBullishTrade ? 'bg-cyan-500/10 text-cyan-400' : 'bg-indigo-500/10 text-indigo-400'
                          }`}>
                            {isBullishTrade ? 'LONG BUY POSITION' : 'SHORT SELL POSITION'}
                          </span>
                        </div>

                        {isLoadingLivePrice ? (
                          <div className="flex items-center justify-center py-4 text-slate-500 text-xs gap-2 font-bold tracking-wider">
                            <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                            최신 실시간 가격 로딩 중...
                          </div>
                        ) : hasLiveDiff && liveVal !== null ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-xl text-center">
                              <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase block mb-1">분석 시점 진입가 (Entry)</span>
                              <span className="text-xl font-black text-slate-300 font-mono">{formatPrice(entryVal, selectedItem.market)}</span>
                            </div>
                            <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-xl text-center">
                              <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase block mb-1">실시간 현재가 (Live Price)</span>
                              <span className="text-xl font-black text-white font-mono">{formatPrice(liveVal, selectedItem.market)}</span>
                            </div>
                            <div className={`p-3.5 rounded-xl border text-center transition-all duration-300 ${
                              isProfit 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            }`}>
                              <span className="text-[10px] font-bold tracking-widest uppercase block mb-1">예측 대비 결과 (Result)</span>
                              <span className="text-xl font-black font-mono">
                                {isProfit ? 'PROFIT' : 'LOSS'} ({isProfit ? '+' : ''}{pctChange.toFixed(2)}%)
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-slate-500 text-xs font-semibold">
                            ⚠️ 실시간 현재가 데이터를 불러오지 못했습니다. 장외 시간이거나 주말일 수 있습니다.
                          </div>
                        )}
                      </div>

                      {/* Fakeout Warning & Action Tag */}
                      {(fakeout_warning?.detected || action) && (
                        <div className="space-y-3">
                          {fakeout_warning?.detected && (
                            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center gap-4 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                              <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
                              <div>
                                <h4 className="text-red-500 font-black text-lg">🚨 긴급 AI 스윕(Sweep) 경고</h4>
                                <p className="text-red-200 text-sm font-medium">{fakeout_warning.message}</p>
                              </div>
                            </div>
                          )}
                          {action && (
                            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3 text-center">
                              <span className="text-indigo-300 font-bold tracking-wider">{action}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* HUGE NUMBERS */}
                      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                        {/* Glow effect */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />
                        
                        <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16 relative z-10">
                          {/* SL */}
                          <div className="text-center">
                            <span className="text-rose-500/70 text-sm font-bold uppercase tracking-widest mb-2 block">Stop Loss (손절가)</span>
                            <div className="text-5xl md:text-6xl font-black text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                              {formatPrice(planA?.sl, selectedItem.market)}
                            </div>
                          </div>

                          {/* ENTRY */}
                          <div className="text-center relative">
                            <div className="absolute -inset-4 bg-white/5 blur-2xl rounded-full" />
                            <span className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-1">
                              <Crosshair className="w-4 h-4" /> Entry (진입가)
                            </span>
                            <div className="text-6xl md:text-7xl font-black text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.5)] tracking-tighter">
                              {formatPrice(planA?.entry, selectedItem.market)}
                            </div>
                          </div>

                          {/* TP */}
                          <div className="text-center">
                            <span className="text-emerald-400/70 text-sm font-bold uppercase tracking-widest mb-2 block">Target Profit (목표가)</span>
                            <div className="text-5xl md:text-6xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                              {formatPrice(planA?.tp, selectedItem.market)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Technical Analysis Reasons */}
                      {reasoningList && reasoningList.length > 0 && (
                        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
                          <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-cyan-400" />
                            AI 기술적 분석 근거 (5대 핵심 요인)
                          </h4>
                          <ul className="space-y-3">
                            {reasoningList.map((reason, idx) => (
                              <li key={idx} className="text-slate-300 text-xs md:text-sm flex gap-2.5 items-start">
                                <span className="flex items-center justify-center w-5 h-5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-bold text-xs shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <span className="leading-relaxed">{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Multi-Timeframe Chart Flow Matrix */}
                      {multi_timeframe_analysis && typeof multi_timeframe_analysis === 'object' && !Array.isArray(multi_timeframe_analysis) && (
                        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
                          <h4 className="text-white font-bold text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4 text-cyan-400" />
                            주변 타임프레임 차트 흐름 분석 (Multi-Timeframe Flow)
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(multi_timeframe_analysis as Record<string, { trend?: string; flow_analysis?: string } | null | undefined>).map(([tf, tfData]) => {
                              const isBullish = tfData?.trend === 'BULLISH';
                              const isBearish = tfData?.trend === 'BEARISH';
                              return (
                                <div key={tf} className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                                  <div className="flex items-center justify-between">
                                    <span className="text-white font-bold text-xs">{tf === '1d' ? '일봉 (1D)' : tf === '1h' ? '1시간봉 (1H)' : tf === '30m' ? '30분봉 (30m)' : '5분봉 (5m)'}</span>
                                    <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded ${
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

                      {/* R:R Gauge Bar */}
                      <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                        <div className="flex justify-between items-end mb-3">
                          <span className="text-sm font-bold text-slate-300">손익비 (Risk : Reward)</span>
                          <span className="text-xs text-slate-500">{riskMgmt}</span>
                        </div>
                        <div className="w-full h-4 rounded-full overflow-hidden flex border border-slate-800 shadow-inner">
                          {/* We assume standard 1:3 ratio for visuals if exact numbers aren't parseable */}
                          <div className="w-1/4 h-full bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)] relative">
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:10px_10px]" />
                          </div>
                          <div className="w-3/4 h-full bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(52,211,153,0.5)] relative">
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:10px_10px]" />
                          </div>
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-rose-500">Risk (잃을 금액)</span>
                          <span className="text-emerald-400">Reward (벌게 될 금액)</span>
                        </div>
                      </div>

                      {/* Detailed Analysis Accordion */}
                      <details className="group bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
                        <summary className="flex items-center justify-between p-5 cursor-pointer select-none text-slate-300 hover:text-white hover:bg-slate-800/30 transition-colors">
                          <span className="font-bold flex items-center gap-2">
                            <Zap className="w-4 h-4 text-cyan-400" />
                            AI 상세 분석 근거 보기
                          </span>
                          <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180 text-slate-500" />
                        </summary>
                        <div className="p-5 border-t border-slate-800/50 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                              <span className="text-[10px] text-cyan-500 font-bold uppercase block mb-1">인식 가격 범위 (Price Range)</span>
                              <p className="text-sm text-slate-300 font-mono">{formatDecimalsInString(poolBelow, selectedItem.market)} ~ {formatDecimalsInString(poolAbove, selectedItem.market)}</p>
                            </div>
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                              <span className="text-[10px] text-cyan-500 font-bold uppercase block mb-1">매수/매도 대기 구간 (OB / Kill Zone)</span>
                              <p className="text-sm text-slate-300">{formatDecimalsInString(killZone, selectedItem.market)}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                              <span className="text-[10px] text-cyan-500 font-bold uppercase block mb-1">감지된 패턴 (Pattern Name)</span>
                              <p className="text-sm text-slate-300">{patternName} (신뢰도: {patternConfidence}%)</p>
                            </div>
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                              <span className="text-[10px] text-cyan-500 font-bold uppercase block mb-1">포지션 권장 전략 (Action)</span>
                              <p className="text-sm text-slate-300 font-bold text-cyan-400">{action}</p>
                            </div>
                          </div>
                          
                          {/* Image Preview */}
                          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner w-full max-w-sm mx-auto">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={selectedItem.imageUrl}
                              alt="Analyzed Chart"
                              className="w-full h-auto object-cover opacity-80"
                            />
                          </div>

                          <div className="space-y-2">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">원시 분석 시나리오 (Raw Output)</span>
                            <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-4 rounded-xl whitespace-pre-wrap font-mono border border-slate-800">
                              {selectedItem.planAScenario}
                              {'\n\n'}
                              {selectedItem.planBScenario}
                            </p>
                          </div>
                        </div>
                      </details>

                    </div>
                  );
                }

                // Fallback for old history without resultJson
                return (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    <div className="md:col-span-5 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedItem.imageUrl} alt="Analyzed Chart" className="w-full h-40 md:h-48 object-cover" />
                    </div>
                    <div className="md:col-span-7 bg-slate-950/50 border border-slate-850 p-5 rounded-xl flex flex-col justify-between h-full min-h-[160px]">
                      <div>
                        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
                          <Activity className="w-4 h-4" /> 추세 판단 결과
                        </div>
                        <p className="text-sm font-semibold text-white leading-relaxed">{selectedItem.trend}</p>
                      </div>
                    </div>
                    <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="bg-slate-950/30 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between">
                        <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full w-fit mb-4">플랜 A</span>
                        <p className="text-sm text-slate-350">{formatDecimalsInString(selectedItem.planAScenario, selectedItem.market)}</p>
                        {selectedItem.planAEntryPrice && <p className="text-sm font-bold text-white mt-4">{formatDecimalsInString(selectedItem.planAEntryPrice, selectedItem.market)}</p>}
                      </div>
                      <div className="bg-slate-950/30 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between">
                        <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full w-fit mb-4">플랜 B</span>
                        <p className="text-sm text-slate-350">{formatDecimalsInString(selectedItem.planBScenario, selectedItem.market)}</p>
                        {selectedItem.planBEntryPrice && <p className="text-sm font-bold text-white mt-4">{formatDecimalsInString(selectedItem.planBEntryPrice, selectedItem.market)}</p>}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
