import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/auth';
import { dbService } from '@/lib/db';
import DashboardClient from '@/components/DashboardClient';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) {
    redirect('/login');
  }

  const sessionPayload = await verifySessionToken(sessionCookie);
  if (!sessionPayload) {
    redirect('/login');
  }

  // Fetch histories for the logged in user
  const histories = await dbService.getAnalysisHistoriesByUser(sessionPayload.userId);

  const serializedHistories = histories.map((h) => ({
    id: h.id,
    userId: h.userId,
    imageUrl: h.imageUrl,
    market: h.market,
    trend: h.trend,
    planAScenario: h.planAScenario,
    planAProbability: h.planAProbability,
    planAEntryPrice: h.planAEntryPrice,
    planBScenario: h.planBScenario,
    planBProbability: h.planBProbability,
    planBEntryPrice: h.planBEntryPrice,
    status: h.status,
    createdAt: h.createdAt,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">대시보드</h1>
        <p className="text-slate-400 mt-2">최근 분석 스캔 기록 요약 및 계정 활동 통계를 한눈에 확인하세요.</p>
      </div>

      <DashboardClient initialHistories={serializedHistories} />
    </div>
  );
}
