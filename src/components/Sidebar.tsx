'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LineChart, History, User, LogOut, Menu, X, LayoutDashboard } from 'lucide-react';

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

  const menuItems = [
    { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
    { name: 'AI 차트 스캔', href: '/dashboard/scan', icon: LineChart },
    { name: '분석 히스토리', href: '/dashboard/history', icon: History },
    { name: '내 정보', href: '/dashboard/profile', icon: User },
  ];

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (response.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between bg-slate-950/80 border-b border-slate-900 px-6 py-4 fixed top-0 left-0 right-0 z-40 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            <span className="font-extrabold text-slate-950 text-sm tracking-tighter">UP</span>
          </div>
          <span className="font-bold text-sm tracking-wider text-white">
            ULTRAPLEX <span className="text-cyan-400 font-extrabold">Ai</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-slate-400 hover:text-white p-1"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-950/80 border-r border-slate-900 z-30 backdrop-blur-2xl">
        <div className="flex flex-col h-full justify-between p-6">
          <div className="space-y-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group px-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-all">
                <span className="font-extrabold text-slate-950 text-md tracking-tighter">UP</span>
              </div>
              <span className="font-bold text-md tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-350">
                ULTRAPLEX <span className="text-cyan-400 font-extrabold">Ai</span>
              </span>
            </Link>

            {/* Navigation Menu */}
            <nav className="space-y-1">
              {menuItems.map((item) => {
                // /dashboard should only be active when exactly on /dashboard
                const isActive = pathname
                  ? (item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href))
                  : false;
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all group ${
                      isActive
                        ? 'bg-slate-900 text-white border-l-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.05)]'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 transition-all ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Info & Logout */}
          <div className="border-t border-slate-900 pt-6 space-y-4">
            {user && (
              <div className="px-2">
                <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">Signed in as</p>
                <p className="text-sm font-bold text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all group"
            >
              <LogOut className="w-4 h-4 text-red-500 group-hover:scale-105 transition-all" />
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-35 flex">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer content */}
          <div className="relative flex flex-col w-64 max-w-xs bg-slate-950 border-r border-slate-900 pt-20 pb-6 px-6 z-40 transition-all duration-300">
            <div className="flex flex-col h-full justify-between">
              <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const isActive = pathname
                      ? (item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href))
                      : false;
                    const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-slate-900 text-white border-l-2 border-cyan-500'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                      }`}
                    >
                      <IconComponent className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-slate-900 pt-6 space-y-4">
                {user && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">Signed in as</p>
                    <p className="text-sm font-bold text-white truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
