'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { History, User, LogOut, Menu, X, LayoutDashboard, CreditCard, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface SidebarProps {
  user: {
    name: string;
    email: string;
  } | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { t, isMounted } = useTranslation();

  const menuItems = [
    { name: isMounted ? t('sidebarDashboard') : '대시보드', href: '/dashboard', icon: LayoutDashboard, desc: 'AI 차트 분석' },
    { name: isMounted ? t('sidebarHistory') : '분석 히스토리', href: '/dashboard/history', icon: History, desc: '과거 스캔 기록' },
    { name: isMounted ? t('sidebarBilling') || '결제 (Billing)' : '결제', href: '/dashboard/billing', icon: CreditCard, desc: '플랜 업그레이드' },
    { name: isMounted ? t('sidebarProfile') : '내 정보', href: '/dashboard/profile', icon: User, desc: '멘토 연결 정보' },
  ];

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const NavItem = ({ item, onClick }: { item: typeof menuItems[0]; onClick?: () => void }) => {
    const isActive = pathname
      ? (item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href))
      : false;
    const IconComponent = item.icon;

    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all group relative ${
          isActive
            ? 'bg-slate-900 text-white border-l-2 border-cyan-500 shadow-[inset_0_0_20px_rgba(6,182,212,0.03)]'
            : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <IconComponent className={`w-4 h-4 flex-shrink-0 transition-all ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
        <div className="flex-1 min-w-0">
          <div className="leading-tight">{item.name}</div>
          {isActive && (
            <div className="text-[10px] text-slate-500 font-normal mt-0.5 truncate">{item.desc}</div>
          )}
        </div>
        {isActive && <ChevronRight className="w-3 h-3 text-cyan-600 flex-shrink-0" />}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between bg-slate-950/90 border-b border-slate-900 px-5 py-3.5 fixed top-0 left-0 right-0 z-40 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            <span className="font-extrabold text-slate-950 text-xs tracking-tighter">UP</span>
          </div>
          <span className="font-bold text-sm tracking-wider text-white">
            ULTRAPLEX <span className="text-cyan-400 font-extrabold">Ai</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all"
          aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-950/80 border-r border-slate-900 z-30 backdrop-blur-2xl">
        <div className="flex flex-col h-full justify-between p-5">
          <div className="space-y-7">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group px-1 mt-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-all flex-shrink-0">
                <span className="font-extrabold text-slate-950 text-sm tracking-tighter">UP</span>
              </div>
              <div>
                <span className="font-bold text-sm tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 block leading-tight">
                  ULTRAPLEX
                </span>
                <span className="text-cyan-400 font-extrabold text-xs tracking-wider">Ai Signal</span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="space-y-0.5" role="navigation" aria-label="주요 메뉴">
              {menuItems.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </nav>
          </div>

          {/* User Info & Logout */}
          <div className="border-t border-slate-900 pt-4 space-y-3">
            {user && (
              <div className="px-3 py-2.5 bg-slate-900/40 rounded-xl border border-slate-800/60">
                <p className="text-[10px] font-semibold text-slate-600 tracking-wider uppercase mb-1">
                  {isMounted ? t('sidebarSignedInAs') : '로그인 계정'}
                </p>
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.email}</p>
              </div>
            )}

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className={`w-4 h-4 text-red-500 flex-shrink-0 ${isLoggingOut ? 'animate-pulse' : 'group-hover:scale-105 transition-all'}`} />
              {isLoggingOut ? '로그아웃 중...' : (isMounted ? t('sidebarSignOut') : '로그아웃')}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[35] flex" role="dialog" aria-modal="true" aria-label="메뉴">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-64 max-w-[85vw] bg-slate-950 border-r border-slate-900 pt-16 pb-6 px-4 z-40">
            <div className="flex flex-col h-full justify-between">
              <nav className="space-y-0.5" role="navigation">
                {menuItems.map((item) => (
                  <NavItem key={item.href} item={item} onClick={() => setMobileMenuOpen(false)} />
                ))}
              </nav>

              <div className="border-t border-slate-900 pt-4 space-y-3">
                {user && (
                  <div className="px-3 py-2.5 bg-slate-900/40 rounded-xl border border-slate-800/60">
                    <p className="text-[10px] font-semibold text-slate-600 tracking-wider uppercase mb-1">
                      {isMounted ? t('sidebarSignedInAs') : '로그인 계정'}
                    </p>
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.email}</p>
                  </div>
                )}
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4 text-red-500 flex-shrink-0" />
                  {isLoggingOut ? '로그아웃 중...' : (isMounted ? t('sidebarSignOut') : '로그아웃')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
