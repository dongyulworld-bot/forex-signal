import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/auth';
import { dbService } from '@/lib/db';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

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

  // const superAdminEmail = await dbService.getSuperAdminEmail();
  // const isSuperAdmin = user.email === superAdminEmail;

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <Sidebar user={{ name: user.name, email: user.email }} />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* CRM Link Banner - Temporarily visible to all users for testing */}
        <div className="bg-slate-900/80 border-b border-cyan-500/20 px-6 py-3 flex items-center justify-between text-xs sm:text-sm z-30 sticky top-16 md:top-0 backdrop-blur-md">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-slate-400 font-medium hidden sm:inline">User Mode:</span>
            <span className="text-cyan-400 font-bold">{user.email}</span>
          </div>
          <Link
            href="/crm"
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] text-xs flex items-center space-x-1"
          >
            <span>CRM</span>
            <span className="text-[10px] font-normal">→</span>
          </Link>
        </div>
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-12 pt-24 md:pt-10 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
