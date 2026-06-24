import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/auth';
import { dbService } from '@/lib/db';
import HistoryClient from '@/components/HistoryClient';

export default async function HistoryPage() {
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
    resultJson: h.resultJson,
  }));

  // Calculate today's usage and limit
  const users = await dbService.getUsers();
  const user = users.find(u => u.id === sessionPayload.userId);
  
  const TIER_LIMITS: Record<string, number> = {
    FREE: 1,
    STANDARD: 10,
    PREMIUM: 50,
    LIFETIME: 9999,
    PARTNER: 9999
  };
  
  const limit = user ? (TIER_LIMITS[user.tier || 'FREE'] || 1) : 1;
  const today = new Date().toISOString().split('T')[0];
  const isSameDay = user?.lastScanDate && user.lastScanDate.startsWith(today);
  const todayScanCount = isSameDay ? (user?.dailyScanCount || 0) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">분석 히스토리</h1>
        <p className="text-slate-400 mt-2">과거에 스캔한 차트 분석 기록을 보관하고, 당시 AI가 수립한 양방향 시나리오를 즉시 확인하세요.</p>
      </div>

      <HistoryClient 
        initialHistories={serializedHistories} 
        todayScanCount={todayScanCount}
        dailyLimit={limit}
      />
    </div>
  );
}
