'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  Upload, Sparkles, TrendingUp, 
  User, Mail, ArrowUpRight, MessageSquare, 
  Loader2, ShieldAlert, Check, 
  ChevronDown, ArrowDown, Activity, Shield, Cpu
} from 'lucide-react';
import { translations, Locale } from '@/lib/translations';

interface AnalysisResult {
  id: string;
  imageUrl: string;
  trend: string;
  planAScenario: string;
  planAProbability: number;
  planBScenario: string;
  planBProbability: number;
  createdAt: string;
}

interface AssignedAgent {
  name: string;
  role: string;
  email: string;
  contactUrl: string;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>('ko');

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Load language settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale;
    if (saved === 'ko' || saved === 'en') {
      setLocale(saved);
    }
    setIsLoggedIn(document.cookie.includes('session='));
  }, []);

  const t = (key: keyof typeof translations['ko']) => {
    return translations[locale][key] || translations['ko'][key];
  };

  const handleLanguageChange = () => {
    const nextLocale = locale === 'ko' ? 'en' : 'ko';
    setLocale(nextLocale);
    localStorage.setItem('locale', nextLocale);
  };

  // Client portal state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [assignedAgent, setAssignedAgent] = useState<AssignedAgent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accordion state for FAQ
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    if (openFaqIndex === index) {
      setOpenFaqIndex(null);
    } else {
      setOpenFaqIndex(index);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
        setPreviewUrl(URL.createObjectURL(droppedFile));
        setError(null);
      } else {
        setError(t('errorType'));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError(null);
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
    if (!file || !email || !name) {
      setError(t('errorFields'));
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('name', name);
    formData.append('file', file);

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
      
      // Scroll smoothly to results
      setTimeout(() => {
        document.getElementById('analysis-results-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || '네트워크 연결 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const scrollToAnalysis = () => {
    document.getElementById('analysis-tool')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Dynamic FAQ loading matching translations
  const localizedFaqs = [
    {
      q: locale === 'ko' ? '초보자도 쓸 수 있나요?' : 'Can beginners use this?',
      a: locale === 'ko' 
        ? '네, 완벽히 트레이딩 입문자를 위해 설계되었습니다. 복잡하고 어려운 금융 지표나 전문 용어를 모르더라도, 차트 사진 한 장만 업로드하면 이해하기 쉬운 직관적인 플랜 A/B 시나리오를 제공해 드립니다.' 
        : 'Yes, it is designed perfectly for trading beginners. Even if you do not know complex indicators or terminology, simply upload a chart image to receive clear Plan A/B scenarios.'
    },
    {
      q: locale === 'ko' ? '진짜 사람이 지원해주나요?' : 'Is there real human support?',
      a: locale === 'ko'
        ? '그렇습니다. 차트 분석이 완료되면 시스템이 실시간으로 현지 전문 에이전트를 매핑해 드립니다. 배정된 에이전트와 메신저(카카오톡/WhatsApp)를 통해 1:1로 직접 소통하며 트레이딩 관련 피드백을 받으실 수 있습니다.'
        : 'Yes, once the analysis is complete, a dedicated local mentor is assigned in real-time. You can chat 1:1 via WhatsApp or KakaoTalk for execution support and feedback.'
    },
    {
      q: locale === 'ko' ? '어떤 종목에서 쓸 수 있나요?' : 'Which markets are supported?',
      a: locale === 'ko'
        ? '해외선물(나스닥, 오일 등), 암호화폐(비트코인, 이더리움), 외환(FX 마진 거래) 등 캔들 차트가 존재하는 전 세계 모든 금융 시장에서 완벽하게 작동합니다.'
        : 'It works perfectly in any financial market where candle charts exist, including Futures (Nasdaq, Crude Oil), Crypto (Bitcoin, Ethereum), and Forex (FX).'
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-[#94A3B8] font-sans relative overflow-x-hidden scroll-smooth selection:bg-cyan-550 selection:text-white">
      {/* Background neon glows for Deep Tech Midnight theme */}
      <div className="absolute top-[-10%] left-[-15%] w-[70vw] h-[70vw] rounded-full bg-blue-600/10 blur-[160px] pointer-events-none z-0" />
      <div className="absolute top-[20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-600/10 blur-[180px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] left-[-5%] w-[55vw] h-[55vw] rounded-full bg-cyan-500/5 blur-[140px] pointer-events-none z-0" />

      {/* Global Header */}
      <header className="border-b border-white/10 bg-[#020617]/75 backdrop-blur-xl sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              ULTRAPLEX <span className="text-cyan-400 font-medium">Ai Signal</span>
            </span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-10 text-sm font-semibold text-slate-350">
            <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">{locale === 'ko' ? '작동 방식' : 'How it Works'}</a>
            <a href="#features" className="hover:text-cyan-400 transition-colors">{locale === 'ko' ? '핵심 기능' : 'Features'}</a>
            <a href="#pricing" className="hover:text-cyan-400 transition-colors">{locale === 'ko' ? '요금제' : 'Pricing'}</a>
            <a href="#faq" className="hover:text-cyan-400 transition-colors">{locale === 'ko' ? '자주 묻는 질문' : 'FAQ'}</a>
          </nav>

          <div className="flex items-center space-x-4">
            {/* Language Toggle */}
            <button
              onClick={handleLanguageChange}
              className="text-xs px-3.5 py-2 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800/80 transition-all font-bold text-white flex items-center space-x-1.5 shadow-sm"
            >
              <span>{locale === 'ko' ? '🇺🇸 EN' : '🇰🇷 KO'}</span>
            </button>

            {isLoggedIn ? (
              <Link 
                href="/dashboard" 
                className="text-xs text-cyan-400 hover:text-cyan-300 px-4.5 py-2 rounded-xl border border-cyan-500/25 bg-cyan-950/20 hover:bg-cyan-950/40 transition-all font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]"
              >
                {locale === 'ko' ? '내 대시보드' : 'My Dashboard'}
              </Link>
            ) : (
              <Link 
                href="/login" 
                className="text-xs text-slate-200 hover:text-cyan-400 px-4.5 py-2 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800/80 transition-all font-bold shadow-sm"
              >
                {locale === 'ko' ? '로그인' : 'Login'}
              </Link>
            )}

            <Link 
              href="/admin" 
              className="text-xs text-slate-500 hover:text-slate-350 px-4.5 py-2 rounded-xl border border-white/5 bg-slate-950/40 transition-all font-bold shadow-sm"
            >
              {t('dashboard')}
            </Link>
          </div>
        </div>
      </header>

      {/* 1. Hero Section */}
      <section className="relative pt-28 pb-24 md:pt-36 md:pb-32 max-w-7xl mx-auto px-6 text-center z-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="inline-flex items-center space-x-2.5 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-extrabold tracking-wider uppercase mb-2 animate-pulse">
            <Cpu className="w-4 h-4 mr-0.5" /> {t('heroTag')}
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.05] whitespace-pre-line">
            {t('heroTitlePart1')}<br />
            <span className="bg-gradient-to-r from-white via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              {t('heroTitlePart2')}
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-400 leading-relaxed max-w-4xl mx-auto font-medium pt-3">
            {t('heroSub')}
          </p>

          <div className="pt-10 flex flex-col sm:flex-row items-center justify-center gap-5">
            <button
              onClick={scrollToAnalysis}
              className="w-full sm:w-auto px-10 py-5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl text-base font-extrabold shadow-lg shadow-cyan-400/20 hover:shadow-cyan-400/40 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 flex items-center justify-center space-x-3 btn-glow-cyan cursor-pointer"
            >
              <span>{t('heroCtaFree')}</span>
              <ArrowDown className="w-5 h-5 animate-bounce" />
            </button>
            <Link
              href="/signup"
              className="w-full sm:w-auto px-10 py-5 bg-slate-900/60 hover:bg-slate-800 text-white rounded-xl text-base font-bold border border-white/10 hover:border-white/20 shadow-sm transition-all duration-300 flex items-center justify-center cursor-pointer text-center"
            >
              {t('heroCtaSignup')}
            </Link>
          </div>

          <div className="pt-10 flex items-center justify-center space-x-2.5 text-sm text-slate-500 font-semibold">
            <Check className="w-5 h-5 text-cyan-400" />
            <span>{t('heroTrust')}</span>
          </div>
        </div>
      </section>

      {/* 2. How it Works Section */}
      <section id="how-it-works" className="py-24 md:py-32 border-t border-white/10 bg-slate-950/40 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">{t('howTitle')}</h2>
            <p className="text-sm sm:text-base text-slate-400 mt-3.5 font-medium">{t('howSub')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="glass-card glass-card-hover rounded-2xl p-8 md:p-10 relative overflow-hidden">
              <div className="absolute top-4 right-6 text-6xl font-black text-white/5 select-none font-mono">01</div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
                <Upload className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3">{t('step1Title')}</h3>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                {t('step1Desc')}
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass-card glass-card-hover rounded-2xl p-8 md:p-10 relative overflow-hidden">
              <div className="absolute top-4 right-6 text-6xl font-black text-white/5 select-none font-mono">02</div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3">{t('step2Title')}</h3>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                {t('step2Desc')}
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass-card glass-card-hover rounded-2xl p-8 md:p-10 relative overflow-hidden">
              <div className="absolute top-4 right-6 text-6xl font-black text-white/5 select-none font-mono">03</div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3">{t('step3Title')}</h3>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                {t('step3Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Chart Uploader Section (Core Feature Embedded) */}
      <section id="analysis-tool" className="py-24 md:py-32 max-w-7xl mx-auto px-6 scroll-mt-20 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs text-cyan-400 font-extrabold tracking-widest uppercase">{t('toolTag')}</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mt-2 tracking-tight">{t('toolTitle')}</h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3.5 font-medium">{t('toolSub')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Side: Upload Form */}
          <div className="lg:col-span-5 glass-card rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-cyan-500/40 via-blue-500/40 to-transparent" />
            
            <h3 className="text-lg md:text-xl font-bold text-white mb-2 flex items-center">
              <Sparkles className="w-5 h-5 text-cyan-400 mr-2.5" />
              {t('formTitle')}
            </h3>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-8">
              {t('formSub')}
            </p>

            <form onSubmit={handleAnalyze} className="space-y-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-slate-350 mb-2 flex items-center">
                    <User className="w-4 h-4 mr-1.5 text-slate-500" /> {t('labelName')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('placeholderName')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs md:text-sm bg-slate-950/60 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 rounded-xl px-5 py-4 text-white placeholder-slate-600 outline-none transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-slate-350 mb-2 flex items-center">
                    <Mail className="w-4 h-4 mr-1.5 text-slate-500" /> {t('labelEmail')}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={t('placeholderEmail')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs md:text-sm bg-slate-950/60 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 rounded-xl px-5 py-4 text-white placeholder-slate-600 outline-none transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-semibold text-slate-350 mb-2.5">
                  {t('labelChart')}
                </label>
                
                {!previewUrl ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={triggerFileInput}
                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                      dragActive 
                        ? 'border-cyan-400 bg-cyan-400/5' 
                        : 'border-white/10 hover:border-cyan-400/40 bg-slate-950/40'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center mb-4 shadow-inner">
                      <Upload className="w-5 h-5 text-slate-400" />
                    </div>
                    <span className="text-xs md:text-sm font-semibold text-slate-200">
                      {t('dragText')}
                    </span>
                    <span className="text-[10px] md:text-xs text-slate-500 mt-1.5">
                      {t('dragSub')}
                    </span>
                  </div>
                ) : (
                  <div className="relative rounded-xl border border-white/10 overflow-hidden bg-slate-955 group shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={previewUrl} 
                      alt="Uploaded Chart" 
                      className="w-full h-56 object-cover opacity-85"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end p-4">
                      <span className="text-xs text-white/90 truncate max-w-[80%] font-semibold">
                        {file?.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="absolute top-3 right-3 bg-red-500/80 hover:bg-red-600 text-white text-xs px-3.5 py-1.5 rounded-lg transition-colors font-bold shadow-md cursor-pointer"
                    >
                      {t('btnRemove')}
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
                disabled={isAnalyzing || !file || !name || !email}
                className={`w-full py-4 rounded-xl text-xs md:text-sm font-extrabold flex items-center justify-center space-x-2 shadow-lg transition-all duration-300 cursor-pointer ${
                  isAnalyzing || !file || !name || !email
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-cyan-400/10 hover:shadow-cyan-400/30 hover:scale-[1.02] active:scale-[0.98] btn-glow-cyan'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('btnAnalyzing')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{t('btnSubmit')}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Side: Results Showcase */}
          <div className="lg:col-span-7 h-full min-h-[450px]">
            {!analysisResult && !isAnalyzing && (
              <div className="h-full min-h-[450px] glass-card rounded-3xl flex flex-col items-center justify-center p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-900/60 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
                  <Cpu className="w-6 h-6 text-slate-500" />
                </div>
                <h3 className="text-white font-bold text-base md:text-lg mb-2">{t('resultWaitTitle')}</h3>
                <p className="text-xs md:text-sm text-slate-400 max-w-md leading-relaxed">
                  {t('resultWaitDesc')}
                </p>
              </div>
            )}

            {isAnalyzing && (
              <div className="h-full min-h-[450px] glass-card rounded-3xl flex flex-col items-center justify-center p-10 text-center relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 w-full bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[scan_2s_ease-in-out_infinite]" />

                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-6" />
                <h3 className="text-white font-bold text-base md:text-lg mb-2">{t('resultScanning')}</h3>
                <div className="space-y-1.5 text-xs md:text-sm">
                  <p className="text-slate-400 animate-pulse">{t('resultScanDetails')}</p>
                  <p className="text-slate-500">{t('resultEngine')}</p>
                </div>
              </div>
            )}

            {analysisResult && !isAnalyzing && (
              <div id="analysis-results-section" className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
                {/* Trend Summary */}
                <div className="glass-card rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-md">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-400 via-teal-400 to-transparent" />
                  <div className="flex items-center space-x-2.5 text-emerald-400 mb-4">
                    <Activity className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">{t('resultTrendTag')}</span>
                  </div>
                  <p className="text-base sm:text-lg md:text-xl font-semibold text-white leading-relaxed">
                    {analysisResult.trend}
                  </p>
                </div>

                {/* Plans A and B Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Plan A: Upward */}
                  <div className="glass-card glass-card-hover rounded-2xl p-6 md:p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-full">
                          {t('planATitle')}
                        </span>
                        <span className="text-2xl font-black text-cyan-400 font-mono">
                          {analysisResult.planAProbability}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2 mb-6 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full" 
                          style={{ width: `${analysisResult.planAProbability}%` }}
                        />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-2.5">{t('planATarget')}</h4>
                      <p className="text-xs md:text-sm text-slate-350 leading-relaxed font-medium">
                        {analysisResult.planAScenario}
                      </p>
                    </div>
                    <div className="mt-8 pt-4 border-t border-white/5 text-[10px] md:text-xs text-slate-500 font-semibold">
                      {t('planANote')}
                    </div>
                  </div>

                  {/* Plan B: Downward */}
                  <div className="glass-card glass-card-hover rounded-2xl p-6 md:p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-full">
                          {t('planBTitle')}
                        </span>
                        <span className="text-2xl font-black text-rose-400 font-mono">
                          {analysisResult.planBProbability}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2 mb-6 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-rose-550 to-rose-400 h-2 rounded-full" 
                          style={{ width: `${analysisResult.planBProbability}%` }}
                        />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-2.5">{t('planBTarget')}</h4>
                      <p className="text-xs md:text-sm text-slate-350 leading-relaxed font-medium">
                        {analysisResult.planBScenario}
                      </p>
                    </div>
                    <div className="mt-8 pt-4 border-t border-white/5 text-[10px] md:text-xs text-slate-500 font-semibold">
                      {t('planBNote')}
                    </div>
                  </div>

                </div>

                {/* Assigned Agent info */}
                {assignedAgent && (
                  <div className="glass-card border-cyan-500/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-wider">
                          {t('agentTag')}
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">
                          {assignedAgent.name} {assignedAgent.role === 'LOCAL_AGENT' ? (locale === 'ko' ? ' - 현지 공식 에이전트' : ' - Local Agent') : ` - ${assignedAgent.role}`}
                        </h4>
                        <p className="text-xs md:text-sm text-slate-400 mt-1.5 leading-relaxed font-medium">
                          {t('agentDesc')}
                        </p>
                      </div>
                    </div>
                    <a
                      href={assignedAgent.contactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full md:w-auto bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs md:text-sm font-extrabold px-6 py-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-300 shadow-md shadow-cyan-400/10 btn-glow-cyan cursor-pointer"
                    >
                      <span>{t('agentBtn')}</span>
                      <ArrowUpRight className="w-4.5 h-4.5" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Features Section */}
      <section id="features" className="py-24 md:py-32 border-t border-white/10 bg-slate-950/40 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="text-xs text-cyan-400 font-extrabold tracking-widest uppercase">{t('featuresTag')}</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mt-2 tracking-tight">{t('featuresTitle')}</h2>
            <p className="text-sm sm:text-base text-slate-400 mt-3.5 font-medium">{t('featuresSub')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="glass-card glass-card-hover rounded-2xl p-8 md:p-10 flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3">{t('feat1Title')}</h3>
              <p className="text-sm md:text-base text-slate-450 leading-relaxed">
                {t('feat1Desc')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card glass-card-hover rounded-2xl p-8 md:p-10 flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
                <User className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3">{t('feat2Title')}</h3>
              <p className="text-sm md:text-base text-slate-455 leading-relaxed">
                {t('feat2Desc')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card glass-card-hover rounded-2xl p-8 md:p-10 flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3">{t('feat3Title')}</h3>
              <p className="text-sm md:text-base text-slate-455 leading-relaxed">
                {t('feat3Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Pricing Section */}
      <section id="pricing" className="py-24 md:py-32 max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="text-xs text-cyan-400 font-extrabold tracking-widest uppercase">{t('pricingTag')}</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mt-2 tracking-tight">{t('pricingTitle')}</h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3.5 font-medium">{t('pricingSub')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Plan 1 */}
          <div className="glass-card glass-card-hover rounded-3xl p-8 md:p-10 flex flex-col justify-between">
            <div>
              <span className="text-[10px] md:text-xs font-bold text-slate-350 bg-slate-900 border border-white/5 px-3 py-1 rounded-md uppercase tracking-wider">{t('planBasic')}</span>
              <div className="mt-5 flex items-baseline text-white">
                <span className="text-4xl md:text-5xl font-black">{t('planBasicPrice')}</span>
                <span className="text-sm text-slate-500 ml-1.5 font-medium">{t('planBasicPeriod')}</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mt-5 mb-2">{t('planBasicTitle')}</h3>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed mb-8">
                {t('planBasicDesc')}
              </p>
            </div>
            <ul className="space-y-4 pt-6 border-t border-white/10 text-xs md:text-sm text-slate-300 mb-8">
              <li className="flex items-center"><Check className="w-4.5 h-4.5 text-cyan-400 mr-2.5 flex-shrink-0" /> {t('planBasicFeat1')}</li>
              <li className="flex items-center"><Check className="w-4.5 h-4.5 text-cyan-400 mr-2.5 flex-shrink-0" /> {t('planBasicFeat2')}</li>
              <li className="flex items-center"><Check className="w-4.5 h-4.5 text-cyan-400 mr-2.5 flex-shrink-0" /> {t('planBasicFeat3')}</li>
            </ul>
            <button 
              onClick={scrollToAnalysis}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer"
            >
              {t('planBasicBtn')}
            </button>
          </div>

          {/* Plan 2 */}
          <div className="glass-card glass-card-hover rounded-3xl p-8 md:p-10 flex flex-col justify-between">
            <div>
              <span className="text-[10px] md:text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-md uppercase tracking-wider">{t('planLifetime')}</span>
              <div className="mt-5 flex items-baseline text-white">
                <span className="text-4xl md:text-5xl font-black">{t('planLifetimePrice')}</span>
                <span className="text-sm text-slate-500 ml-1.5 font-medium">{t('planLifetimePeriod')}</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mt-5 mb-2">{t('planLifetimeTitle')}</h3>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed mb-8">
                {t('planLifetimeDesc')}
              </p>
            </div>
            <ul className="space-y-4 pt-6 border-t border-white/10 text-xs md:text-sm text-slate-300 mb-8">
              <li className="flex items-center"><Check className="w-4.5 h-4.5 text-cyan-400 mr-2.5 flex-shrink-0" /> {t('planLifetimeFeat1')}</li>
              <li className="flex items-center"><Check className="w-4.5 h-4.5 text-cyan-400 mr-2.5 flex-shrink-0" /> {t('planLifetimeFeat2')}</li>
              <li className="flex items-center"><Check className="w-4.5 h-4.5 text-cyan-400 mr-2.5 flex-shrink-0" /> {t('planLifetimeFeat3')}</li>
            </ul>
            <button 
              onClick={scrollToAnalysis}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer"
            >
              {t('planLifetimeBtn')}
            </button>
          </div>

          {/* Plan 3: Highlighted Special Partner Plan (Deep Tech Crimson border / Cyan Glow) */}
          <div className="bg-slate-950/65 backdrop-blur-2xl border-2 border-cyan-500 rounded-3xl p-8 md:p-10 shadow-[0_0_35px_rgba(6,182,212,0.15)] flex flex-col justify-between relative transform lg:-translate-y-4 hover:shadow-[0_0_50px_rgba(6,182,212,0.25)] transition-all duration-300">
            <div className="absolute top-[-14px] right-8 bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-cyan-400/25">
              {t('planPartnerHighlight')}
            </div>
            
            <div>
              <span className="text-[10px] md:text-xs font-bold text-cyan-400 bg-cyan-550/15 px-3 py-1 rounded-md uppercase tracking-wider">{t('planPartner')}</span>
              <div className="mt-5 flex items-baseline text-cyan-400">
                <span className="text-4xl md:text-5xl font-black">{t('planPartnerPrice')}</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mt-5 mb-2">{t('planPartnerTitle')}</h3>
              <p className="text-sm md:text-base text-slate-350 leading-relaxed mb-8">
                {t('planPartnerDesc')}
              </p>
            </div>
            
            <ul className="space-y-4 pt-6 border-t border-cyan-500/20 text-xs md:text-sm text-slate-200 mb-8">
              <li className="flex items-center"><Check className="w-4.5 h-4.5 text-cyan-400 mr-2.5 flex-shrink-0" /> {t('planPartnerFeat1')}</li>
              <li className="flex items-center"><Check className="w-4.5 h-4.5 text-cyan-400 mr-2.5 flex-shrink-0" /> {t('planPartnerFeat2')}</li>
              <li className="flex items-center"><Check className="w-4.5 h-4.5 text-cyan-400 mr-2.5 flex-shrink-0" /> {t('planPartnerFeat3')}</li>
              <li className="flex items-center"><Check className="w-4.5 h-4.5 text-cyan-400 mr-2.5 flex-shrink-0" /> {t('planPartnerFeat4')}</li>
            </ul>
            
            <button 
              onClick={scrollToAnalysis}
              className="w-full py-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl text-xs md:text-sm font-extrabold transition-all shadow-md shadow-cyan-400/10 btn-glow-cyan cursor-pointer"
            >
              {t('planPartnerBtn')}
            </button>
          </div>
        </div>
      </section>

      {/* 6. FAQ Section */}
      <section id="faq" className="py-24 md:py-32 border-t border-white/10 bg-slate-950/40 relative z-10">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-xs text-cyan-400 font-extrabold tracking-widest uppercase">{t('faqTag')}</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mt-2 tracking-tight">{t('faqTitle')}</h2>
            <p className="text-sm sm:text-base text-slate-400 mt-3.5 font-medium">{t('faqSub')}</p>
          </div>

          <div className="space-y-4">
            {localizedFaqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index} 
                  className="glass-card rounded-2xl overflow-hidden shadow-md transition-all duration-300"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full text-left p-5 md:p-6 flex items-center justify-between text-sm sm:text-base font-bold text-white hover:text-cyan-400 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown 
                      className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} 
                    />
                  </button>
                  
                  {isOpen && (
                    <div className="px-5 pb-5 md:px-6 md:pb-6 pt-1 text-sm md:text-base text-slate-400 leading-relaxed border-t border-white/5 animate-[fadeIn_0.2s_ease-out]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-16 bg-slate-950 text-xs md:text-sm text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-cyan-400" />
            </div>
            <span className="font-bold text-white text-base">
              ULTRAPLEX <span className="text-cyan-400 font-medium">Ai Signal</span>
            </span>
          </div>
          
          <div className="text-center md:text-right font-medium text-xs md:text-sm">
            <p>© 2026 ULTRAPLEX. All rights reserved.</p>
            <p className="mt-1.5 text-[10px] md:text-xs text-slate-600 leading-relaxed max-w-xl">
              {t('footerDesc')}
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Agent Contact Button */}
      <div className="fixed bottom-8 right-8 z-50 group">
        <a
          href={assignedAgent ? assignedAgent.contactUrl : "https://wa.me/60123456789?text=안녕하세요!%20ULTRAPLEX%20Ai%20Signal%20차트%20분석%20상담%20문의드립니다."}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-16 h-16 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-xl shadow-cyan-400/25 hover:scale-105 active:scale-95 transition-transform duration-300 relative btn-glow-cyan cursor-pointer"
        >
          <span className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping pointer-events-none" />
          <MessageSquare className="w-7 h-7" />
        </a>
        <div className="absolute right-20 bottom-3 w-56 bg-slate-900 border border-white/10 text-white text-xs px-4 py-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-xl">
          <div className="font-bold text-cyan-400">{t('footerAgentText')}</div>
          <div className="text-slate-500 mt-0.5">{t('footerAgentSub')}</div>
        </div>
      </div>
      
      {/* Styles for scan, shimmer and keyframes */}
      <style jsx global>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
