'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다.');
      }

      // Successful signup
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#020617] text-white p-4 relative overflow-hidden font-sans">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px]" />
      
      {/* Radial grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

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
          <p className="text-slate-400 text-sm mt-3">신규 계정을 개설하고 VIP 차트 신호 서비스를 시작하세요</p>
        </div>

        {/* Glassmorphic Signup Card */}
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800/80 rounded-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <h2 className="text-2xl font-bold text-white mb-6">회원가입</h2>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-red-200 flex items-start gap-3 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">이름</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="김초보"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none text-white placeholder-slate-600 transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">이메일 주소</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none text-white placeholder-slate-600 transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">비밀번호 (최소 6자)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none text-white placeholder-slate-600 transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">비밀번호 확인</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none text-white placeholder-slate-600 transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mt-6 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  계정 생성 중...
                </>
              ) : (
                <>
                  가입 및 로그인하기
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center text-sm text-slate-400 border-t border-slate-800/80 pt-6">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4 transition-all">
              로그인하기
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
