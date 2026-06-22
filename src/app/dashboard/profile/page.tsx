import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/auth';
import { dbService } from '@/lib/db';
import { User as UserIcon, Shield, Phone } from 'lucide-react';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) {
    redirect('/login');
  }

  const sessionPayload = await verifySessionToken(sessionCookie);
  if (!sessionPayload) {
    redirect('/login');
  }

  const users = await dbService.getUsers();
  const user = users.find((u) => u.id === sessionPayload.userId) || null;

  if (!user) {
    redirect('/login');
  }

  // Get assigned agent details
  let assignedAgent = null;
  if (user.agentId) {
    const agents = await dbService.getAgents();
    assignedAgent = agents.find((a) => a.id === user.agentId) || null;
  }

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const whatsappText = `안녕하세요 ${assignedAgent?.name || '멘토'}님! ULTRAPLEX Ai Signal의 ${user.name} 회원입니다. 1:1 상담을 요청드립니다.`;
  const whatsappUrl = `https://wa.me/60123456789?text=${encodeURIComponent(whatsappText)}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">내 정보</h1>
        <p className="text-slate-400 mt-2">회원 프로필 정보 및 담당 멘토와의 1:1 실시간 매칭 상태를 조회합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* User Card */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center shadow-lg text-cyan-400">
              <UserIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{user.name}</h3>
              <p className="text-sm text-cyan-400 font-medium">VIP 회원 등급</p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 space-y-4 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">이메일 주소</span>
              <span className="text-slate-200 font-semibold">{user.email}</span>
            </div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-500 font-sans">고유회원 번호 (UID)</span>
              <span className="text-slate-350 text-xs">{user.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">가입 일자</span>
              <span className="text-slate-200 font-semibold">{formatDate(user.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Mentor Card */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-cyan-400 uppercase bg-cyan-950/50 border border-cyan-800/30 px-2 py-0.5 rounded">
              실시간 영업 에이전트 매칭
            </span>
            <h3 className="text-xl font-bold text-white mt-3">1:1 전담 트레이딩 멘토</h3>
            <p className="text-slate-400 text-sm mt-1">회원님의 매매 수익 안정화 및 리스크 관리 교육을 보조하는 담당자입니다.</p>
          </div>

          {assignedAgent ? (
            <div className="space-y-6 border-t border-slate-800/80 pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center text-cyan-400 shadow-inner">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">{assignedAgent.name} 에이전트</h4>
                  <p className="text-xs text-slate-500 font-semibold uppercase">{assignedAgent.role}</p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-950/50 border border-slate-900 p-4 rounded-xl text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">멘토 메일</span>
                  <span className="text-slate-350 font-medium">{assignedAgent.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">지원 서비스</span>
                  <span className="text-cyan-400 font-semibold">차트분석, 피드백, VIP 신호 지원</span>
                </div>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                전담 멘토 카카오톡/와츠앱 실시간 1:1 상담
              </a>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">
              지정된 담당 에이전트가 없습니다. 고객센터에 문의하십시오.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
