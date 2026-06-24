'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Upload, Sparkles, TrendingUp, 
  User, MessageSquare, Check, 
  ChevronDown, ArrowDown, Shield, Cpu
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function Home() {
  const { locale, t, changeLanguage } = useTranslation();


  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);

  // Load language settings and user session on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setUser(data.user);
            setIsLoggedIn(true);
          } else {
            setUser(null);
            setIsLoggedIn(false);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };
    fetchUser();
  }, []);

  const handleLanguageChange = () => {
    changeLanguage(locale === 'ko' ? 'en' : 'ko');
  };

  // Accordion state for FAQ
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [activeFaqCategory, setActiveFaqCategory] = useState<number>(0);

  const toggleFaq = (index: number) => {
    if (openFaqIndex === index) {
      setOpenFaqIndex(null);
    } else {
      setOpenFaqIndex(index);
    }
  };

  const scrollToAnalysis = () => {
    document.getElementById('analysis-tool')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Categorized FAQ structure
  const faqCategories = [
    {
      title: locale === 'ko' ? '결제 및 파트너 브로커' : 'Payment & Partner Broker',
      items: [
        {
          q: locale === 'ko' ? '파트너 브로커에서 계좌를 개설하면 정말 평생 무료인가요?' : 'Is the account opened with a partner broker truly free for life?',
          a: locale === 'ko'
            ? '네, 맞습니다. 당사와 제휴된 브로커에서 계좌를 개설하고 기본 거래 조건을 충족하시면, 월 $40 상당의 ULTRAPLEX Ai Signal VIP 기능을 추가 비용 없이 평생 이용하실 수 있습니다.'
            : 'Yes. If you open an account with our partnered broker and meet basic trading conditions, you can use the ULTRAPLEX Ai Signal VIP features (worth $40/month) for free forever.'
        },
        {
          q: locale === 'ko' ? '기존에 사용하던 거래소(브로커) 계좌가 있어도 이용할 수 있나요?' : 'Can I use the service with an existing broker account?',
          a: locale === 'ko'
            ? '물론입니다. 베이직(월 $40) 또는 라이프타임(평생 $180) 요금제를 구독하시면, 기존에 이용하시던 거래소나 플랫폼 상관없이 독립적으로 AI 분석 기능을 활용하실 수 있습니다.'
            : 'Absolutely. By subscribing to the Basic ($40/month) or Lifetime ($180 one‑time) plan, you can use the AI analysis regardless of your existing broker or platform.'
        },
        {
          q: locale === 'ko' ? '결제 후 환불이 가능한가요?' : 'Is a refund possible after payment?',
          a: locale === 'ko'
            ? '디지털 서비스 특성상 분석 기능을 사용한 이후에는 원칙적으로 환불이 어렵습니다. 하지만 첫 가입 시 제공되는 무료 분석 횟수를 통해 성능을 먼저 충분히 테스트해 보실 수 있습니다.'
            : 'Because this is a digital service, refunds are generally not available after the analysis has been used. However, you can test the performance with the free analysis attempts provided at sign‑up.'
        }
      ]
    },
    {
      title: locale === 'ko' ? '기술 및 매매 방식' : 'Technology & Trading Method',
      items: [
        {
          q: locale === 'ko' ? 'AI가 제 계좌에서 자동으로 매매(자동매매/EA)를 진행해 주나요?' : 'Does the AI trade automatically on my account (EA)?',
          a: locale === 'ko'
            ? '아닙니다. ULTRAPLEX는 최적의 진입 시점과 시나리오를 제공하는 "초고성능 분석 보조 도구"입니다. 최종 매매는 제공된 시그널을 바탕으로 고객님께서 직접 MT5(MetaTrader 5) 등의 거래 플랫폼에서 진행하셔야 합니다.'
            : 'No. ULTRAPLEX is a high‑performance analysis assistant that provides optimal entry points and scenarios. You must execute trades manually on platforms like MT5 based on the signals.'
        },
        {
          q: locale === 'ko' ? '하루에 몇 번까지 차트 분석을 요청할 수 있나요?' : 'How many chart analyses can I request per day?',
          a: locale === 'ko'
            ? '유료 구독자 및 파트너 플랜 이용자는 분석 횟수에 제한이 없습니다. 데이트레이딩이나 스캘핑을 하시는 분들도 원하시는 만큼 차트를 업로드하고 즉각 분석받을 수 있습니다.'
            : 'There is no limit for paid subscribers or partner plans. You can upload as many charts as you need.'
        },
        {
          q: locale === 'ko' ? '주식이나 코인 차트도 분석이 가능한가요?' : 'Can stock or crypto charts be analyzed?',
          a: locale === 'ko'
            ? '네, 가능합니다. 캔들이 존재하는 차트라면 해외선물, 외환(FX), 크립토, 주식 등 종목과 상관없이 AI가 패턴과 지지/거래를 완벽하게 읽어냅니다.'
            : 'Yes. Any chart with candlesticks—futures, FX, crypto, stocks—can be analyzed by the AI.'
        }
      ]
    },
    {
      title: locale === 'ko' ? '신뢰 및 리스크 관리' : 'Trust & Risk Management',
      items: [
        {
          q: locale === 'ko' ? '100% 수익을 보장하나요? 손실이 날 수도 있나요?' : 'Do you guarantee 100% profit? Can I lose money?',
          a: locale === 'ko'
            ? '트레이딩에 100% 확률은 존재하지 않습니다. AI는 과거 데이터와 현재 흐름을 바탕으로 가장 승률이 높은 "Plan A"와 "Plan B" 시나리오를 계산해 줄 뿐입니다. 따라서 AI가 제시하는 "손절선(Stop Loss)"을 반드시 지키는 리스크 관리가 필요합니다.'
            : 'No strategy can guarantee 100% profit. The AI provides the highest‑probability Plan A and Plan B scenarios based on historical and current data, but you must follow the suggested stop‑loss levels.'
        },
        {
          q: locale === 'ko' ? '전담 에이전트(멘토)는 구체적으로 어떤 도움을 주나요?' : 'What exactly does the dedicated mentor provide?',
          a: locale === 'ko'
            ? '차트 분석 결과를 어떻게 해석하고 실전에 적용해야 하는지 기술적인 조언부터, 포지션 진입 시의 심리적 불안감을 잡아주는 마인드 컨트롤까지 1:1로 밀착 케어해 드립니다.'
            : 'The mentor offers 1:1 support—from technical guidance on interpreting analysis results to mindset coaching that helps you stay calm when entering positions.'
        }
      ]
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
          
          <nav className="hidden md:flex items-center space-x-10 text-sm font-semibold text-slate-300">
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

            {isLoggedIn && user && (
              <span className="text-xs text-slate-300 font-semibold px-3 py-1.5 rounded-xl bg-slate-900/40 border border-white/5 hidden sm:flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {locale === 'ko'
                    ? `${user.name || user.email.split('@')[0]}님 로그인됨`
                    : `Logged in as ${user.name || user.email.split('@')[0]}`}
                </span>
                <span className="text-slate-500 text-[10px] hidden sm:inline font-normal">
                  ({user.email})
                </span>
              </span>
            )}

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
              <div className="absolute top-4 right-6 text-6xl font-black text-cyan-400/20 select-none font-mono">01</div>
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
              <div className="absolute top-4 right-6 text-6xl font-black text-cyan-400/20 select-none font-mono">02</div>
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
              <div className="absolute top-4 right-6 text-6xl font-black text-cyan-400/20 select-none font-mono">03</div>
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

      {/* 3. How to Use Video Showcase */}
      <section id="analysis-tool" className="py-24 md:py-32 max-w-7xl mx-auto px-6 scroll-mt-20 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs text-cyan-400 font-extrabold tracking-widest uppercase">{t('toolTag')}</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mt-2 tracking-tight">초간단 3단계 차트 분석</h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3.5 font-medium">대시보드에서 클릭 몇 번으로 월스트리트급 AI 진단을 실시간으로 받아보세요.</p>
        </div>

        <div className="glass-card rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            {/* Left: Image Showcase */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950/50 border border-slate-800 shadow-inner group">
              {/* 고객님이 업로드한 이미지를 public/how-to-use.png 로 저장하면 자동으로 표시됩니다. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/how-to-use.png" 
                alt="AI Dashboard Analysis Showcase" 
                className="w-full h-auto object-contain hover:scale-[1.02] transition-transform duration-700"
              />
              {/* Optional overlay */}
              <div className="absolute inset-0 border border-white/5 rounded-2xl pointer-events-none" />
            </div>

            {/* Right: Steps Description */}
            <div className="space-y-8">
              <div className="flex items-start gap-5">
                <div className="w-10 h-10 shrink-0 bg-slate-800 rounded-full flex items-center justify-center text-cyan-400 font-bold text-lg shadow-inner">1</div>
                <div>
                  <h4 className="text-white font-bold text-lg mb-2">{t('step1Title')}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {t('step1Desc')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-5">
                <div className="w-10 h-10 shrink-0 bg-slate-800 rounded-full flex items-center justify-center text-cyan-400 font-bold text-lg shadow-inner">2</div>
                <div>
                  <h4 className="text-white font-bold text-lg mb-2">{t('step2Title')}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {t('step2Desc')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-5 relative">
                <div className="w-10 h-10 shrink-0 bg-cyan-500/20 border border-cyan-500/30 rounded-full flex items-center justify-center text-cyan-400 font-bold text-lg shadow-[0_0_15px_rgba(6,182,212,0.3)]">3</div>
                <div>
                  <h4 className="text-white font-bold text-lg mb-2">{t('step3Title')}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    {t('step3Desc')}
                  </p>
                  
                  <Link 
                    href="/dashboard" 
                    className="inline-flex px-6 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-sm font-extrabold transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] cursor-pointer"
                  >
                    대시보드에서 체험하기
                  </Link>
                </div>
              </div>
            </div>
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
              <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                {t('feat1Desc')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card glass-card-hover rounded-2xl p-8 md:p-10 flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
                <User className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3">{t('feat2Title')}</h3>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                {t('feat2Desc')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card glass-card-hover rounded-2xl p-8 md:p-10 flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3">{t('feat3Title')}</h3>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed">
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
          {/* Plan 1: Free */}
          <div className="glass-card glass-card-hover rounded-3xl p-8 md:p-10 flex flex-col justify-between">
            <div>
              <span className="text-[10px] md:text-xs font-bold text-slate-300 bg-slate-900 border border-white/5 px-3 py-1 rounded-md uppercase tracking-wider">Free Tier</span>
              <div className="mt-5 flex items-baseline text-white">
                <span className="text-4xl md:text-5xl font-black">$0</span>
                <span className="text-sm text-slate-500 ml-1.5 font-medium">/ 무료</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mt-5 mb-2">기본 플랜</h3>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed mb-8">
                ULTRAPLEX Ai Signal의 기본 차트 분석을 체험해 보세요.
              </p>
            </div>
            <ul className="space-y-4 pt-6 border-t border-white/10 text-xs md:text-sm text-slate-300 mb-8">
              <li className="flex items-center"><Check className="w-4.5 h-4.5 text-cyan-400 mr-2.5 flex-shrink-0" /> 하루 1회 AI 차트 분석 무료 체험</li>
            </ul>
            <button 
              onClick={scrollToAnalysis}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer"
            >
              무료 체험하기
            </button>
          </div>

          {/* Plan 2: Standard */}
          <div className="glass-card glass-card-hover rounded-3xl p-8 md:p-10 flex flex-col justify-between">
            <div>
              <span className="text-[10px] md:text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-md uppercase tracking-wider">Standard</span>
              <div className="mt-5 flex items-baseline text-white">
                <span className="text-4xl md:text-5xl font-black">$15</span>
                <span className="text-sm text-slate-500 ml-1.5 font-medium">/ 월</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mt-5 mb-2">스탠다드 플랜</h3>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed mb-8">
                데일리 트레이딩을 위한 고확률 시나리오 분석.
              </p>
            </div>
            <ul className="space-y-4 pt-6 border-t border-white/10 text-xs md:text-sm text-slate-300 mb-8">
              <li className="flex items-center"><Check className="w-4.5 h-4.5 text-cyan-400 mr-2.5 flex-shrink-0" /> 하루 10회 고확률 시나리오 분석</li>
              <li className="flex items-center"><Check className="w-4.5 h-4.5 text-cyan-400 mr-2.5 flex-shrink-0" /> 기본 고객 지원</li>
            </ul>
            <button 
              onClick={scrollToAnalysis}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer"
            >
              스탠다드 구독하기
            </button>
          </div>

          {/* Plan 3: Premium (Highlighted) */}
          <div className="bg-slate-950/65 backdrop-blur-2xl border-2 border-cyan-500 rounded-3xl p-8 md:p-10 shadow-[0_0_35px_rgba(6,182,212,0.15)] flex flex-col justify-between relative transform lg:-translate-y-4 hover:shadow-[0_0_50px_rgba(6,182,212,0.25)] transition-all duration-300">
            <div className="absolute top-[-14px] right-8 bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-cyan-400/25">
              가장 인기있는 플랜
            </div>
            
            <div>
              <span className="text-[10px] md:text-xs font-bold text-cyan-400 bg-cyan-550/15 px-3 py-1 rounded-md uppercase tracking-wider">Premium</span>
              <div className="mt-5 flex items-baseline text-cyan-400">
                <span className="text-4xl md:text-5xl font-black">$30</span>
                <span className="text-sm text-cyan-500/70 ml-1.5 font-medium">/ 월</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mt-5 mb-2">프리미엄 플랜</h3>
              <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-8">
                전문 기관급 트레이딩을 위한 무제한 지원과 멘토링.
              </p>
            </div>
            
            <ul className="space-y-4 pt-6 border-t border-cyan-500/20 text-xs md:text-sm text-slate-200 mb-8">
              <li className="flex items-center"><Check className="w-4.5 h-4.5 text-cyan-400 mr-2.5 flex-shrink-0" /> 하루 50회 초정밀 SMC 분석</li>
              <li className="flex items-center"><Check className="w-4.5 h-4.5 text-cyan-400 mr-2.5 flex-shrink-0" /> VIP 1:1 에이전트 밀착 멘토링</li>
            </ul>
            
            <button 
              onClick={scrollToAnalysis}
              className="w-full py-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl text-xs md:text-sm font-extrabold transition-all shadow-md shadow-cyan-400/10 btn-glow-cyan cursor-pointer"
            >
              프리미엄 구독하기
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

          <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-10">
            {faqCategories.map((category, catIdx) => (
              <button
                key={catIdx}
                onClick={() => {
                  setActiveFaqCategory(catIdx);
                  setOpenFaqIndex(null);
                }}
                className={`px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                  activeFaqCategory === catIdx 
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-400' 
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/5 hover:border-white/20 hover:bg-slate-800/80'
                }`}
              >
                {category.title}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {faqCategories[activeFaqCategory].items.map((faq, idx) => {
              const globalIndex = activeFaqCategory * 100 + idx;
              const isOpen = openFaqIndex === globalIndex;
              return (
                <div 
                  key={idx} 
                  className="glass-card rounded-2xl overflow-hidden shadow-md transition-all duration-300"
                >
                  <button
                    onClick={() => toggleFaq(globalIndex)}
                    className="w-full text-left p-5 md:p-6 flex items-center justify-between text-sm sm:text-base font-bold text-white hover:text-cyan-400 transition-colors cursor-pointer"
                  >
                    <span className="pr-4">{faq.q}</span>
                    <ChevronDown 
                      className={`w-5 h-5 text-slate-500 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} 
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
          href="https://wa.me/60123456789?text=안녕하세요!%20ULTRAPLEX%20Ai%20Signal%20차트%20분석%20상담%20문의드립니다."
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
