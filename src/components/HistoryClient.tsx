'use client';

import React, { useState } from 'react';
import { Search, Calendar, TrendingUp, TrendingDown, X, Eye, Activity } from 'lucide-react';

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
}

interface HistoryClientProps {
  initialHistories: HistoryItem[];
}

export default function HistoryClient({ initialHistories }: HistoryClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

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
      {/* Search Filter Bar */}
      <div className="relative max-w-md">
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
                  const isPlanA = item.planAProbability >= item.planBProbability;
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
                          {item.market}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm whitespace-nowrap">
                        {isPlanA ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <TrendingUp className="w-3 h-3" />
                            상승 우세 ({item.planAProbability}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <TrendingDown className="w-3 h-3" />
                            하락 우세 ({item.planBProbability}%)
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
                  {selectedItem.market} 스캔 기록
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
              
              {/* Image Preview & Trend */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Uploaded Chart Image */}
                <div className="md:col-span-5 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedItem.imageUrl}
                    alt="Analyzed Chart"
                    className="w-full h-40 md:h-48 object-cover"
                  />
                  <div className="bg-slate-950 p-3 text-center border-t border-slate-900">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">분석에 사용된 이미지</span>
                  </div>
                </div>

                {/* Trend Summary */}
                <div className="md:col-span-7 bg-slate-950/50 border border-slate-850 p-5 rounded-xl flex flex-col justify-between h-full min-h-[160px]">
                  <div>
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
                      <Activity className="w-4 h-4" />
                      추세 판단 결과
                    </div>
                    <p className="text-sm font-semibold text-white leading-relaxed">
                      {selectedItem.trend}
                    </p>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-4 border-t border-slate-900 pt-3">
                    * 이 분석은 해당 시점 기준의 기술 지표 및 캔들 배열을 종합 판독한 내용입니다.
                  </div>
                </div>
              </div>

              {/* Plans A and B scenarios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Plan A */}
                <div className="bg-slate-950/30 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full">
                        플랜 A (상승 시나리오)
                      </span>
                      <span className="text-xl font-black text-cyan-400 font-mono">
                        {selectedItem.planAProbability}%
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-350 leading-relaxed">
                      {selectedItem.planAScenario}
                    </p>
                  </div>
                  {selectedItem.planAEntryPrice && (
                    <div className="border-t border-slate-900 pt-3 mt-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">매수 진입 가격대 (Entry)</span>
                      <p className="text-xs md:text-sm font-bold text-white mt-0.5">{selectedItem.planAEntryPrice}</p>
                    </div>
                  )}
                </div>

                {/* Plan B */}
                <div className="bg-slate-950/30 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">
                        플랜 B (하락 시나리오)
                      </span>
                      <span className="text-xl font-black text-indigo-400 font-mono">
                        {selectedItem.planBProbability}%
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-350 leading-relaxed">
                      {selectedItem.planBScenario}
                    </p>
                  </div>
                  {selectedItem.planBEntryPrice && (
                    <div className="border-t border-slate-900 pt-3 mt-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">매도/숏 진입 가격대 (Entry)</span>
                      <p className="text-xs md:text-sm font-bold text-white mt-0.5">{selectedItem.planBEntryPrice}</p>
                    </div>
                  )}
                </div>
              </div>
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
