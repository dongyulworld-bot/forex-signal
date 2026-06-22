'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '로그인에 실패했습니다.');
      }

      // Successful login
      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10">
      {/* Brand Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-all">
            <span className="font-extrabold text-slate-950 text-xl tracking-tighter">UP</span>
          </div>
          <span className="font-bold text-xl tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
            ULTRAPLEX <span className="text-cyan-400 font-extrabold">Ai Signal</span>
          </span>
        </Link>
        <p className="text-slate-400 text-sm mt-3">로그인하여 AI 차트 진단 및 히스토리를 확인하세요</p>
      </div>

      {/* Glassmorphic Login Card */}
      <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800/80 rounded-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <h2 className="text-2xl font-bold text-white mb-6">로그인</h2>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-red-200 flex items-start gap-3 text-sm animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">이메일 주소</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none text-white placeholder-slate-600 transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">비밀번호</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none text-white placeholder-slate-600 transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mt-8 text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                로그인 중...
              </>
            ) : (
              <>
                로그인하기
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Signup Link */}
        <div className="mt-8 text-center text-sm text-slate-400 border-t border-slate-800/80 pt-6">
          아직 계정이 없으신가요?{' '}
          <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4 transition-all">
            2분 만에 가입하기
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#020617] text-white p-4 relative overflow-hidden font-sans">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px]" />
      
      {/* Radial grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
          <p className="text-slate-400 text-sm">페이지 로드 중...</p>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </main>
  );
}
