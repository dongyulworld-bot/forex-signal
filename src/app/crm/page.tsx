'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, TrendingUp, Layers, 
  ArrowLeft, RefreshCw, Plus, ShieldCheck, 
  Search, Database, Play, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { translations, Locale } from '@/lib/translations';

interface Agent {
  id: string;
  email: string;
  name: string;
  role: 'GLOBAL_SALES_HEAD' | 'REGIONAL_MANAGER' | 'BRANCH_MANAGER' | 'TEAM_LEADER' | 'LOCAL_AGENT';
  parentId: string | null;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  agentId: string | null;
  tier: string;
  dailyScanCount: number;
  lastScanDate: string | null;
  createdAt: string;
}

interface ChartAnalysis {
  id: string;
  userId: string;
  imageUrl: string;
  trend: string;
  planAScenario: string;
  planAProbability: number;
  planBScenario: string;
  planBProbability: number;
  createdAt: string;
}

const ROLES = [
  { id: 'GLOBAL_SALES_HEAD', label: 'Global Head', desc: '전체 지점 및 영업 통계 모니터링' },
  { id: 'REGIONAL_MANAGER', label: 'Regional Manager', desc: '특정 대륙/지역 영업망 통계 관리' },
  { id: 'BRANCH_MANAGER', label: 'Branch Manager', desc: '개별 지점 및 팀 영업 상황 감독' },
  { id: 'TEAM_LEADER', label: 'Team Leader', desc: '영업팀 관리 및 소속 에이전트 모니터링' },
  { id: 'LOCAL_AGENT', label: 'Local Agent', desc: '배정된 1:1 개인 고객 관리 및 시그널 기록' },
];

export default function AdminDashboard() {
  const [locale, setLocale] = useState<Locale>('ko');

  // Load locale on mount
  useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale;
    if (saved === 'ko' || saved === 'en') {
      setLocale(saved);
    }
  }, []);

  const t = (key: keyof typeof translations['ko']) => {
    return translations[locale][key] || translations['ko'][key];
  };

  const handleLanguageChange = () => {
    const nextLocale = locale === 'ko' ? 'en' : 'ko';
    setLocale(nextLocale);
    localStorage.setItem('locale', nextLocale);
  };

  const [activeRole, setActiveRole] = useState<string>('GLOBAL_SALES_HEAD');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [analyses, setAnalyses] = useState<ChartAnalysis[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Simulations state
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);

  const [updateTierUserId, setUpdateTierUserId] = useState('');
  const [updateTierLevel, setUpdateTierLevel] = useState('FREE');

  const [selectedAgentId, setSelectedAgentId] = useState<string>('agent-global');
  const [superAdminEmailInput, setSuperAdminEmailInput] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/crm/data');
      const data = await response.json();
      if (data.success) {
        setAgents(data.agents);
        setUsers(data.users);
        setAnalyses(data.analyses);
        setSuperAdminEmailInput(data.superAdminEmail || '');
      }
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update selected agent when role changes to simulate different staff accounts
  useEffect(() => {
    if (agents.length > 0) {
      const agentOfRole = agents.find(a => a.role === activeRole);
      if (agentOfRole) {
        setSelectedAgentId(agentOfRole.id);
      }
    }
  }, [activeRole, agents]);

  const handleResetDatabase = async () => {
    if (!confirm(locale === 'ko' ? '정말로 데이터베이스를 초기화하시겠습니까?' : 'Are you sure you want to reset the database?')) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/crm/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      if (response.ok) {
        setSimulationStatus(locale === 'ko' ? '데이터베이스가 세팅 데이터로 초기화되었습니다.' : 'Database reset completed.');
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientEmail) return;
    
    setSimulationStatus(locale === 'ko' ? '신규 고객을 등록 및 영업 사원 매핑 중...' : 'Registering new client and auto-routing...');
    try {
      const response = await fetch('/api/crm/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_user',
          name: newClientName,
          email: newClientEmail
        }),
      });
      const data = await response.json();
      if (data.success) {
        const assignedAgent = agents.find(a => a.id === data.user.agentId);
        setSimulationStatus(
          locale === 'ko' 
            ? `등록 성공! 고객 [${data.user.name}]님이 고객 유입량이 가장 적은 에이전트 [${assignedAgent ? assignedAgent.name : '없음'}]에게 자동 배정되었습니다.`
            : `Success! [${data.user.name}] auto-routed to Agent [${assignedAgent ? assignedAgent.name : 'None'}] with the lightest workload.`
        );
        setNewClientName('');
        setNewClientEmail('');
        await fetchData();
      } else {
        setSimulationStatus(`Error: ${data.error}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSimulationStatus(`Error: ${message}`);
    }
  };

  const handleUpdateTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTierUserId || !updateTierLevel) return;

    setSimulationStatus(locale === 'ko' ? '등급 업데이트 중...' : 'Updating User Tier...');
    try {
      const response = await fetch('/api/crm/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_user_tier',
          userId: updateTierUserId,
          tier: updateTierLevel
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSimulationStatus(
          locale === 'ko'
            ? `고객 등급 변경 성공! [${data.user.name}]님의 등급이 ${updateTierLevel}(으)로 변경되었습니다.`
            : `Success! [${data.user.name}]'s tier updated to ${updateTierLevel}.`
        );
        await fetchData();
      } else {
        setSimulationStatus(`Error: ${data.error}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSimulationStatus(`Error: ${message}`);
    }
  };

  const handleUpdateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superAdminEmailInput) return;
    setSimulationStatus(locale === 'ko' ? '슈퍼 관리자 설정 변경 중...' : 'Updating super admin settings...');
    try {
      const response = await fetch('/api/crm/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_super_admin',
          email: superAdminEmailInput
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSimulationStatus(
          locale === 'ko'
            ? `슈퍼 관리자 이메일이 [${data.superAdminEmail}]으로 변경되었습니다. 반영을 위해 로그아웃 후 다시 로그인해 주세요.`
            : `Super admin email updated to [${data.superAdminEmail}]. Please relog to apply changes.`
        );
      } else {
        setSimulationStatus(`Error: ${data.error}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSimulationStatus(`Error: ${message}`);
    }
  };

  // Get agent sub-tree IDs for metrics filtering
  const getSubordinateAgentIds = (agentId: string): string[] => {
    const subs = agents.filter(a => a.parentId === agentId);
    let ids = [agentId];
    for (const sub of subs) {
      ids = [...ids, ...getSubordinateAgentIds(sub.id)];
    }
    return ids;
  };

  // Filter lists based on selected agent scope
  const activeSubAgentIds = getSubordinateAgentIds(selectedAgentId);
  const activeAgent = agents.find(a => a.id === selectedAgentId);

  // Filtered Users based on role permissions
  const filteredUsers = users.filter(user => {
    if (!user.agentId) return false;
    
    // Global Sales Head sees everyone
    if (activeRole === 'GLOBAL_SALES_HEAD') return true;
    
    // Other roles see clients under their hierarchy tree
    return activeSubAgentIds.includes(user.agentId);
  });

  // Filter analyses of subordinate clients
  const filteredAnalyses = analyses.filter(analysis => {
    const user = users.find(u => u.id === analysis.userId);
    if (!user || !user.agentId) return false;
    if (activeRole === 'GLOBAL_SALES_HEAD') return true;
    return activeSubAgentIds.includes(user.agentId);
  });

  // Calculate stats
  const totalScans = filteredUsers.reduce((acc, curr) => acc + (curr.dailyScanCount || 0), 0);
  const totalPremiumUsers = filteredUsers.filter(u => u.tier === 'PREMIUM').length;

  // Localized role selector descriptions
  const localizedRoles = ROLES.map(role => {
    const label = role.label;
    let desc = role.desc;
    if (locale === 'en') {
      if (role.id === 'GLOBAL_SALES_HEAD') desc = 'Monitor entire networks and sales volumes.';
      if (role.id === 'REGIONAL_MANAGER') desc = 'Manage continental/regional division branches.';
      if (role.id === 'BRANCH_MANAGER') desc = 'Direct single local branch office and team leads.';
      if (role.id === 'TEAM_LEADER') desc = 'Lead sales groups and monitor local agents.';
      if (role.id === 'LOCAL_AGENT') desc = 'Engage assigned clients and update chart logs.';
    }
    return { ...role, label, desc };
  });

  return (
    <div className="min-h-screen bg-[#020617] text-[#94A3B8] font-sans pb-20 relative overflow-x-hidden selection:bg-cyan-550 selection:text-white">
      {/* Background soft glows */}
      <div className="absolute top-[-10%] left-[-15%] w-[70vw] h-[70vw] rounded-full bg-blue-600/10 blur-[160px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-600/10 blur-[180px] pointer-events-none z-0" />

      {/* Top Navigation */}
      <header className="border-b border-white/10 bg-[#020617]/75 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-5">
            <Link href="/" className="text-slate-350 hover:text-white transition-colors flex items-center text-xs md:text-sm font-bold">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> {t('goHome')}
            </Link>
            <div className="h-5 w-[1px] bg-white/10" />
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <Database className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="font-extrabold text-sm md:text-base tracking-tight text-white">
                CRM Dashboard
              </span>
              <span className="text-[9px] md:text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono font-bold">
                Tier Management
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Language Toggle */}
            <button
              onClick={handleLanguageChange}
              className="text-xs px-3 py-2 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800/80 transition-all font-bold text-white flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <span>{locale === 'ko' ? '🇺🇸 EN' : '🇰🇷 KO'}</span>
            </button>

            <button 
              onClick={handleResetDatabase}
              className="text-xs flex items-center space-x-1.5 text-slate-300 hover:text-red-400 px-3.5 py-2 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800/80 transition-all font-bold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('dbReset')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left Column: Role Selector & Simulations */}
        <section className="lg:col-span-4 flex flex-col space-y-6">
          
          {/* 1. 5-Level CRM Role Selector */}
          <div className="glass-card rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <h3 className="text-sm md:text-base font-bold text-white mb-5 flex items-center">
              <Layers className="w-4.5 h-4.5 text-cyan-400 mr-2.5" />
              {t('roleLabel')}
            </h3>
            
            <div className="space-y-2">
              {localizedRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setActiveRole(role.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col justify-center cursor-pointer ${
                    activeRole === role.id 
                      ? 'border-cyan-400 bg-cyan-400/10 text-white shadow-sm' 
                      : 'border-white/5 bg-slate-950/20 hover:border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm font-bold">{role.label}</span>
                    {activeRole === role.id && <ShieldCheck className="w-4 h-4 text-cyan-400 animate-pulse" />}
                  </div>
                  <span className="text-[10px] md:text-xs text-slate-500 mt-1.5 leading-normal font-semibold">
                    {role.desc}
                  </span>
                </button>
              ))}
            </div>

            {activeAgent && (
              <div className="mt-5 p-4 bg-slate-950/50 border border-white/10 rounded-2xl">
                <span className="text-[10px] text-slate-500 block font-semibold uppercase tracking-wider">{t('agentInfoText')}</span>
                <span className="text-xs md:text-sm font-bold text-cyan-400 mt-1 block">{activeAgent.name}</span>
                <span className="text-[10px] md:text-xs text-slate-450 block font-mono mt-0.5">{activeAgent.email}</span>
              </div>
            )}
          </div>

          {/* 2. Simulation Trigger Panels */}
          <div className="glass-card rounded-3xl p-6 shadow-xl space-y-8">
            <div>
              <h3 className="text-sm md:text-base font-bold text-white mb-4 flex items-center">
                <Plus className="w-4.5 h-4.5 text-cyan-400 mr-2.5" />
                {t('simTitleA')}
              </h3>
              <form onSubmit={handleCreateClient} className="space-y-3.5">
                <input
                  type="text"
                  placeholder={t('simInputName')}
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full text-xs md:text-sm bg-slate-950/60 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3.5 text-white placeholder-slate-650 outline-none transition-colors"
                />
                <input
                  type="email"
                  placeholder={t('simInputEmail')}
                  required
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="w-full text-xs md:text-sm bg-slate-950/60 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3.5 text-white placeholder-slate-650 outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs md:text-sm font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 mr-1" />
                  <span>{t('simBtnA')}</span>
                </button>
              </form>
            </div>

            <div className="border-t border-white/10 pt-6">
              <h3 className="text-sm md:text-base font-bold text-white mb-4 flex items-center">
                <RefreshCw className="w-4.5 h-4.5 text-cyan-400 mr-2.5" />
                {locale === 'ko' ? '고객 등급(Tier) 관리' : 'Update Client Tier'}
              </h3>
              <form onSubmit={handleUpdateTier} className="space-y-4">
                <select
                  required
                  value={updateTierUserId}
                  onChange={(e) => setUpdateTierUserId(e.target.value)}
                  className="w-full text-xs md:text-sm bg-slate-950/60 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3.5 text-slate-350 outline-none cursor-pointer"
                >
                  <option value="">{t('simSelectClient')}</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id} className="bg-slate-950 text-white">
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-[10px] md:text-xs text-slate-500 block mb-1.5 font-bold uppercase tracking-wider">{locale === 'ko' ? '새로운 등급' : 'New Tier'}</label>
                    <select
                      value={updateTierLevel}
                      onChange={(e) => setUpdateTierLevel(e.target.value)}
                      className="w-full text-xs md:text-sm bg-slate-950 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3.5 text-slate-350 outline-none cursor-pointer"
                    >
                      <option value="FREE" className="bg-slate-950 text-white">FREE (1 AI Scan/day)</option>
                      <option value="STANDARD" className="bg-slate-950 text-white">STANDARD (10 AI Scans/day)</option>
                      <option value="PREMIUM" className="bg-slate-950 text-white">PREMIUM (50 AI Scans/day)</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl text-xs md:text-sm font-extrabold flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-cyan-400/10 btn-glow-cyan cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  <span>{locale === 'ko' ? '등급 변경 적용' : 'Apply Tier'}</span>
                </button>
              </form>
            </div>

            <div className="border-t border-white/10 pt-6">
              <h3 className="text-sm md:text-base font-bold text-white mb-4 flex items-center">
                <ShieldCheck className="w-4.5 h-4.5 text-cyan-400 mr-2.5" />
                {locale === 'ko' ? '슈퍼 관리자(Super Admin) 설정' : 'Super Admin Settings'}
              </h3>
              <form onSubmit={handleUpdateSuperAdmin} className="space-y-4">
                <div>
                  <label className="text-[10px] md:text-xs text-slate-500 block mb-1.5 font-bold uppercase tracking-wider">
                    {locale === 'ko' ? '지정할 이메일 주소' : 'Designated Email Address'}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={superAdminEmailInput}
                    onChange={(e) => setSuperAdminEmailInput(e.target.value)}
                    className="w-full text-xs md:text-sm bg-slate-950/60 border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-3.5 text-white placeholder-slate-655 outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs md:text-sm font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                  <span>{locale === 'ko' ? '슈퍼 관리자 지정' : 'Set Super Admin'}</span>
                </button>
              </form>
            </div>

            {simulationStatus && (
              <div className="bg-cyan-500/5 border border-cyan-400/20 rounded-2xl p-4.5 flex items-start space-x-3 text-xs md:text-sm text-cyan-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed font-bold">{simulationStatus}</span>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Analytics Stats & User List */}
        <section className="lg:col-span-8 flex flex-col space-y-6">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Stat 1: Subordinates */}
            <div className="glass-card rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">{t('statSubAgent')}</span>
                <Layers className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-2xl md:text-3xl font-extrabold text-white mt-3 block">
                {activeRole === 'GLOBAL_SALES_HEAD' ? agents.length : activeSubAgentIds.length}
                <span className="text-xs font-normal text-slate-500 ml-1">{locale === 'ko' ? '명' : 'agents'}</span>
              </span>
            </div>

            {/* Stat 2: Clients */}
            <div className="glass-card rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">{t('statClients')}</span>
                <Users className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-2xl md:text-3xl font-extrabold text-white mt-3 block">
                {filteredUsers.length}
                <span className="text-xs font-normal text-slate-500 ml-1">{locale === 'ko' ? '명' : 'clients'}</span>
              </span>
            </div>

            {/* Stat 3: Total AI Scans */}
            <div className="glass-card rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">{locale === 'ko' ? '오늘 전체 분석량' : 'Total Daily Scans'}</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-2xl md:text-3xl font-extrabold text-emerald-400 mt-3 block">
                {totalScans}
                <span className="text-xs font-normal text-slate-500 ml-1">Scans</span>
              </span>
              <span className="text-[10px] text-slate-500 mt-1.5 block font-bold uppercase tracking-wider">
                {locale === 'ko' ? '프리미엄 구독자' : 'Premium Users'}: {totalPremiumUsers}{locale === 'ko' ? '명' : ''}
              </span>
            </div>

            {/* Stat 4: Signal requests */}
            <div className="glass-card rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">{t('statAnalyses')}</span>
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-2xl md:text-3xl font-extrabold text-white mt-3 block">
                {filteredAnalyses.length}
                <span className="text-xs font-normal text-slate-500 ml-1">{locale === 'ko' ? '회' : 'times'}</span>
              </span>
            </div>

          </div>

          {/* CRM Client Management Panel */}
          <div className="glass-card rounded-3xl shadow-xl overflow-hidden">
            <div className="p-6 md:p-8 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm md:text-base font-bold text-white flex items-center">
                  <Users className="w-4.5 h-4.5 text-cyan-400 mr-2.5" />
                  {t('tableTitle')} ({filteredUsers.length}{locale === 'ko' ? '명' : ' clients'})
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold leading-relaxed">
                  {t('tableSub')}
                </p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-550 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder={t('tableSearch')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs md:text-sm bg-slate-950/60 border border-white/10 focus:border-cyan-400 rounded-xl pl-10 pr-5 py-3 w-full md:w-64 text-white outline-none transition-colors"
                />
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="p-16 flex flex-col items-center justify-center">
                <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
                <span className="text-xs md:text-sm text-slate-500">{t('tableLoading')}</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-16 text-center text-slate-500 text-xs md:text-sm font-semibold">
                {t('tableNoData')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-950/40 text-slate-350 border-b border-white/10">
                      <th className="p-5 font-bold uppercase tracking-wider">{t('tableThClient')}</th>
                      <th className="p-5 font-bold uppercase tracking-wider">{t('tableThAgent')}</th>
                      <th className="p-5 font-bold uppercase tracking-wider">Tier</th>
                      <th className="p-5 font-bold uppercase tracking-wider">Daily Scans</th>
                      <th className="p-5 font-bold uppercase tracking-wider text-right">{t('tableThCount')} (Total)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers
                      .filter(user => 
                        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        user.email.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(user => {
                        const agent = agents.find(a => a.id === user.agentId);
                        const userAnalyses = filteredAnalyses.filter(a => a.userId === user.id);

                        return (
                          <tr key={user.id} className="border-b border-white/5 hover:bg-slate-955/20 transition-colors">
                            <td className="p-5">
                              <div className="font-extrabold text-white text-sm md:text-base">{user.name}</div>
                              <div className="text-[10px] md:text-xs text-slate-500 mt-1 font-semibold">{user.email}</div>
                            </td>
                            <td className="p-5">
                              {agent ? (
                                <div className="flex flex-col">
                                  <span className="text-slate-200 font-bold">{agent.name}</span>
                                  <span className="text-[9px] bg-cyan-550/15 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono font-bold mt-1 inline-block w-max">
                                    {agent.role}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-600">{t('tableUnassigned')}</span>
                              )}
                            </td>
                            <td className="p-5 font-mono text-slate-400 font-semibold">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider border ${
                                user.tier === 'PREMIUM' 
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                                  : user.tier === 'STANDARD'
                                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                  : 'bg-slate-800 border-slate-700 text-slate-300'
                              }`}>
                                {user.tier || 'FREE'}
                              </span>
                            </td>
                            <td className="p-5 font-mono font-black text-slate-200">
                              {user.dailyScanCount || 0} Scans
                            </td>
                            <td className="p-5 text-right">
                              <span className="bg-slate-950/80 text-slate-300 border border-white/10 px-3 py-1.5 rounded-lg font-bold font-mono">
                                {userAnalyses.length}{locale === 'ko' ? '회' : ''}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CRM Client Chart Analysis Request Log */}
          {filteredAnalyses.length > 0 && (
            <div className="glass-card rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-md">
              <h3 className="text-sm md:text-base font-bold text-white mb-5 flex items-center">
                <TrendingUp className="w-4.5 h-4.5 text-cyan-400 mr-2.5" />
                {t('logTitle')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredAnalyses.slice(0, 4).map(analysis => {
                  const client = users.find(u => u.id === analysis.userId);
                  const agent = client ? agents.find(a => a.id === client.agentId) : null;

                  return (
                    <div key={analysis.id} className="bg-slate-950/40 border border-white/10 hover:border-cyan-500/25 rounded-2xl p-5 transition-all duration-300">
                      <div className="flex justify-between items-start mb-3.5">
                        <div>
                          <span className="text-xs md:text-sm font-extrabold text-white block">
                            {client ? client.name : 'Unknown'} ({client?.email})
                          </span>
                          <span className="text-[10px] md:text-xs text-slate-500 block mt-1 font-semibold">
                            {t('logTime')}: {new Date(analysis.createdAt).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US')}
                          </span>
                        </div>
                        {agent && (
                          <span className="text-[9px] bg-cyan-550/15 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded font-mono font-bold">
                            {t('logAgent')}: {agent.name}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                        <div className="text-xs text-slate-350">
                          <strong className="text-emerald-400 font-bold">{t('logTrend')}:</strong> {analysis.trend}
                        </div>
                        <div className="text-xs text-slate-350">
                          <strong className="text-cyan-400 font-bold">{t('logPlanA')} ({analysis.planAProbability}%):</strong> {analysis.planAScenario}
                        </div>
                        <div className="text-xs text-slate-350">
                          <strong className="text-rose-455 font-bold">{t('logPlanB')} ({analysis.planBProbability}%):</strong> {analysis.planBScenario}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </section>
      </main>
    </div>
  );
}
