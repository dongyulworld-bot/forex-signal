'use client';

import React, { useState, useRef } from 'react';
import { Upload, Sparkles, Loader2, ShieldAlert, Cpu, Activity, TrendingUp, TrendingDown, Phone } from 'lucide-react';

interface AnalysisResult {
  id: string;
  trend: string;
  planAScenario: string;
  planAProbability: number;
  planAEntryPrice?: string;
  planBScenario: string;
  planBProbability: number;
  planBEntryPrice?: string;
  imageUrl: string;
  createdAt: string;
}

interface Agent {
  name: string;
  role: string;
  email: string;
  contactUrl: string;
}

export default function DashboardScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [market, setMarket] = useState('BTC/USDT');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [assignedAgent, setAssignedAgent] = useState<Agent | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('이미지 파일(PNG, JPG, JPEG)만 업로드할 수 있습니다.');
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError(null);
      setAnalysisResult(null);
      setAssignedAgent(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const selectedFile = e.dataTransfer.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('이미지 파일만 지원합니다.');
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError(null);
      setAnalysisResult(null);
      setAssignedAgent(null);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setAssignedAgent(null);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('분석할 차트 이미지를 선택해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('market', market);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '차트 분석 중 오류가 발생했습니다.');
      }

      setAnalysisResult(data.analysis);
      setAssignedAgent(data.assignedAgent);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const marketsList = [
    { value: 'BTC/USDT', label: 'BTC/USDT (비트코인)' },
    { value: 'ETH/USDT', label: 'ETH/USDT (이더리움)' },
    { value: 'NASDAQ', label: 'NASDAQ 100 (나스닥)' },
    { value: 'S&P 500', label: 'S&P 500 (에스앤피)' },
    { value: 'EUR/USD', label: 'EUR/USD (유로/달러)' },
    { value: 'USD/JPY', label: 'USD/JPY (달러/엔)' },
    { value: 'XAU/USD', label: 'XAU/USD (골드/금)' },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">AI 실시간 차트 분석하기</h1>
        <p className="text-slate-400 mt-2">차트 이미지 파일을 업로드하고 분석하려는 시장 종목을 선택하여 즉시 매매 시나리오를 받아보세요.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Upload Form */}
        <div className="lg:col-span-5 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            분석 요청서 작성
          </h2>

          <form onSubmit={handleAnalyze} className="space-y-6">
            {/* Market Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">분석 대상 종목/시장</label>
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none text-white transition-all text-sm cursor-pointer"
              >
                {marketsList.map((item) => (
                  <option key={item.value} value={item.value} className="bg-slate-950 text-white">
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* File Drag and Drop */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">차트 캡처본 업로드</label>
              
              {!previewUrl ? (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-950/40 hover:bg-cyan-500/[0.02] transition-all rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px]"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center mb-4 shadow-inner">
                    <Upload className="w-5 h-5 text-slate-400" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200">
                    이미지를 드래그하여 놓거나 클릭하여 업로드
                  </span>
                  <span className="text-xs text-slate-500 mt-1.5">
                    PNG, JPG, JPEG 지원 (최대 10MB)
                  </span>
                </div>
              ) : (
                <div className="relative rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Uploaded Chart"
                    className="w-full h-56 object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end p-4">
                    <span className="text-xs text-white/90 truncate max-w-[80%] font-semibold">
                      {file?.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="absolute top-3 right-3 bg-red-500/80 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-lg transition-colors font-bold shadow-md cursor-pointer"
                  >
                    제거
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-4 flex items-start space-x-2.5">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAnalyzing || !file}
              className={`w-full py-4 rounded-xl text-sm font-extrabold flex items-center justify-center space-x-2 shadow-lg transition-all duration-300 cursor-pointer ${
                isAnalyzing || !file
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/10 hover:shadow-cyan-500/30 hover:scale-[1.01] active:scale-[0.99] shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>AI 분석 가동 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>차트 분석 요청하기</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Results Showcase */}
        <div className="lg:col-span-7 h-full min-h-[480px]">
          {!analysisResult && !isAnalyzing && (
            <div className="h-full min-h-[480px] bg-slate-900/10 border border-slate-900/60 rounded-3xl flex flex-col items-center justify-center p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-900/60 border border-white/5 flex items-center justify-center mb-6 shadow-inner animate-pulse">
                <Cpu className="w-6 h-6 text-slate-500" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">진단 결과를 기다리고 있습니다</h3>
              <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                좌측에서 차트 분석을 진행할 시장 종목을 고르고 스크린샷 이미지를 등록한 뒤 제출해주시면, 실시간으로 AI가 스캔을 진행하고 완성도 높은 매매 시나리오 카드가 표시됩니다.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="h-full min-h-[480px] bg-slate-900/20 border border-slate-800/80 rounded-3xl flex flex-col items-center justify-center p-10 text-center relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 w-full bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[scan_2s_ease-in-out_infinite]" />

              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-6" />
              <h3 className="text-white font-bold text-lg mb-2">차트 구조 정밀 스캔 중</h3>
              <div className="space-y-1.5 text-sm">
                <p className="text-slate-400 animate-pulse">지표 피보나치 수열 매핑 및 지지/저항점 탐색 중...</p>
                <p className="text-slate-500">Google Gemini Vision Engine API 연산 구동 중</p>
              </div>
            </div>
          )}

          {analysisResult && !isAnalyzing && (
            <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
              {/* Trend Summary */}
              <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-transparent" />
                <div className="flex items-center space-x-2 text-cyan-400 mb-4">
                  <Activity className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">AI 스캔 분석 트렌드</span>
                </div>
                <p className="text-lg md:text-xl font-bold text-white leading-relaxed">
                  {analysisResult.trend}
                </p>
              </div>

              {/* Plans A and B Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Plan A: Upward */}
                <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-slate-800/80 flex flex-col justify-between hover:border-cyan-500/30 transition-all duration-300">
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        플랜 A (상승 대응)
                      </span>
                      <span className="text-2xl font-black text-cyan-400 font-mono">
                        {analysisResult.planAProbability}%
                      </span>
                    </div>
                    <p className="text-sm text-slate-350 leading-relaxed mb-6">
                      {analysisResult.planAScenario}
                    </p>
                  </div>
                  {analysisResult.planAEntryPrice && (
                    <div className="border-t border-slate-800/80 pt-4 mt-2">
                      <p className="text-[10px] uppercase font-bold text-slate-500">추천 진입 가격대 (Entry Price)</p>
                      <p className="text-sm font-bold text-white mt-0.5">{analysisResult.planAEntryPrice}</p>
                    </div>
                  )}
                </div>

                {/* Plan B: Downward */}
                <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-slate-800/80 flex flex-col justify-between hover:border-indigo-500/30 transition-all duration-300">
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <TrendingDown className="w-3.5 h-3.5" />
                        플랜 B (하락 대비)
                      </span>
                      <span className="text-2xl font-black text-indigo-400 font-mono">
                        {analysisResult.planBProbability}%
                      </span>
                    </div>
                    <p className="text-sm text-slate-350 leading-relaxed mb-6">
                      {analysisResult.planBScenario}
                    </p>
                  </div>
                  {analysisResult.planBEntryPrice && (
                    <div className="border-t border-slate-800/80 pt-4 mt-2">
                      <p className="text-[10px] uppercase font-bold text-slate-500">추천 진입 가격대 (Entry Price)</p>
                      <p className="text-sm font-bold text-white mt-0.5">{analysisResult.planBEntryPrice}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* CRM Agent Mapping Section */}
              {assignedAgent && (
                <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-inner">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-[10px] font-bold tracking-wider text-cyan-400 uppercase bg-cyan-950/60 border border-cyan-800/30 px-2 py-0.5 rounded">
                      1:1 전담 트레이딩 멘토 지정 완료
                    </span>
                    <h4 className="text-base font-bold text-white mt-2">
                      {assignedAgent.name} 에이전트 ({assignedAgent.role})
                    </h4>
                    <p className="text-xs text-slate-400">
                      신호 해석 및 레버리지 위험 관리 등을 무료로 즉시 상담하세요.
                    </p>
                  </div>
                  <a
                    href={assignedAgent.contactUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] active:scale-[0.98]"
                  >
                    <Phone className="w-4 h-4" />
                    멘토 실시간 문의하기
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
