'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Target, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

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

interface DashboardClientProps {
  initialHistories: HistoryItem[];
}

export default function DashboardClient({ initialHistories }: DashboardClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sortedHistories = [...initialHistories].reverse(); // oldest first for chart

  const chartData = sortedHistories.map((h) => {
    const dateObj = new Date(h.createdAt);
    return {
      name: `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${String(dateObj.getHours()).padStart(2,'0')}:${String(dateObj.getMinutes()).padStart(2,'0')}`,
      planA: h.planAProbability,
      planB: h.planBProbability,
      market: h.market,
    };
  });

  const totalScans = initialHistories.length;
  const avgPlanA = totalScans > 0
    ? Math.round(initialHistories.reduce((acc, curr) => acc + curr.planAProbability, 0) / totalScans)
    : 0;
  const topMarket = totalScans > 0 ? initialHistories[0].market : '-';

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat Card 1 */}
        <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-cyan-400 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">총 스캔 횟수</p>
              <h3 className="text-3xl font-black text-white">{totalScans}건</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-400 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">평균 상승 확률 (Plan A)</p>
              <h3 className="text-3xl font-black text-white">{avgPlanA}%</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Stat Card 3 */}
        <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-400 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">최근 주력 시장</p>
              <h3 className="text-3xl font-black text-white truncate">{topMarket}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart + Recent List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Area Chart */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6">스캔 트렌드 분석 (Plan A vs Plan B)</h3>
          {!mounted ? (
            <div className="h-64 flex items-center justify-center border border-slate-800 bg-slate-950/20 rounded-xl">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem', color: '#f8fafc', fontSize: '12px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="planA" name="상승(Plan A) %" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorA)" />
                  <Area type="monotone" dataKey="planB" name="하락(Plan B) %" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorB)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-xl">
              <p className="text-slate-500 text-sm">AI 스캔을 진행하면 트렌드 차트가 표시됩니다.</p>
            </div>
          )}
        </div>

        {/* Recent Scans List */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-white">최근 스캔 기록</h3>
            <Link
              href="/dashboard/history"
              className="text-cyan-400 text-sm font-semibold hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              전체보기 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex-1 space-y-3">
            {initialHistories.length === 0 ? (
              <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-800 rounded-xl py-12">
                <p className="text-slate-500 text-sm text-center px-4">아직 스캔 기록이 없습니다.<br />AI 차트 스캔을 먼저 진행해 보세요.</p>
              </div>
            ) : (
              initialHistories.slice(0, 5).map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-950/50 border border-slate-800/60 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-white font-bold text-sm">{h.market}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px] md:max-w-[200px]">{h.trend}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-black text-cyan-400">{h.planAProbability}%</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{new Date(h.createdAt).toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-indigo-900/30 border border-cyan-800/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-white">새로운 차트 분석이 필요하신가요?</h3>
          <p className="text-sm text-cyan-100/60 mt-1">즉시 AI 엔진을 통해 최신 시황과 시나리오를 받아보세요.</p>
        </div>
        <Link
          href="/dashboard/scan"
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0 flex items-center gap-2"
        >
          <Activity className="w-4 h-4" />
          AI 스캔 바로가기
        </Link>
      </div>
    </div>
  );
}
