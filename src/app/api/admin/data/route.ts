import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Admin Data API Route
 * Handles data fetching and mock actions (simulation triggers) for the CRM dashboard.
 */
export async function GET() {
  try {
    const agents = await dbService.getAgents();
    const users = await dbService.getUsers();
    const analyses = await dbService.getChartAnalyses();
    const mt5Syncs = await dbService.getMt5Syncs();

    return NextResponse.json({
      success: true,
      agents,
      users,
      analyses,
      mt5Syncs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch admin data.', details: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'seed') {
      // Re-initialize default DB
      await dbService.init();
      return NextResponse.json({ success: true, message: 'Database reset to initial CRM structure.' });
    }

    if (action === 'create_agent') {
      const { email, name, role, parentId } = body;
      if (!email || !name || !role) {
        return NextResponse.json({ error: 'Missing email, name, or role.' }, { status: 400 });
      }
      const newAgent = await dbService.createAgent({ email, name, role, parentId });
      return NextResponse.json({ success: true, agent: newAgent });
    }

    if (action === 'simulate_mt5') {
      const { userId, mt5Login, tradingVolume, status } = body;
      if (!userId || !mt5Login || typeof tradingVolume !== 'number' || !status) {
        return NextResponse.json({ error: 'Missing parameters for MT5 simulation.' }, { status: 400 });
      }
      
      const record = await dbService.upsertMt5Sync(userId, mt5Login, tradingVolume, status);
      return NextResponse.json({ success: true, record });
    }

    if (action === 'create_user') {
      const { email, name } = body;
      if (!email || !name) {
        return NextResponse.json({ error: 'Missing email or name.' }, { status: 400 });
      }
      const newUser = await dbService.createUser(email, name);
      return NextResponse.json({ success: true, user: newUser });
    }

    return NextResponse.json({ error: 'Unknown action request.' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Action execution failed.', details: message },
      { status: 500 }
    );
  }
}
