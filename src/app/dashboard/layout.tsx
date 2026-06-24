import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/auth';
import { dbService } from '@/lib/db';
import Sidebar from '@/components/Sidebar';

export const runtime = 'nodejs';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col md:flex-row">
      <Sidebar user={{ name: user.name, email: user.email }} />

      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Top status bar — simplified, no CRM clutter for end users */}
        <div className="bg-slate-950/70 border-b border-slate-900/80 px-6 py-2 flex items-center justify-between text-xs z-30 sticky top-14 md:top-0 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-500 hidden sm:inline">접속 중:</span>
            <span className="text-slate-300 font-medium truncate max-w-[200px]">{user.email}</span>
          </div>
          {/* CRM link — visible for admin/agent roles only in a real prod build */}
          <a
            href="/crm"
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold transition-all text-[10px] tracking-wider border border-slate-700"
          >
            CRM →
          </a>
        </div>

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-10 pt-20 md:pt-8 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
