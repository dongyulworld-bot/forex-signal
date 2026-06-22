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
      {/* Sidebar Navigation */}
      <Sidebar user={{ name: user.name, email: user.email }} />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-12 pt-24 md:pt-10 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
