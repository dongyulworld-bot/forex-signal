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
    const superAdminEmail = await dbService.getSuperAdminEmail();

    return NextResponse.json({
      success: true,
      agents,
      users,
      analyses,
      superAdminEmail,
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

    if (action === 'update_user_tier') {
      const { userId, tier } = body;
      if (!userId || !tier) {
        return NextResponse.json({ error: 'Missing userId or tier.' }, { status: 400 });
      }
      
      const updatedUser = await dbService.updateUserTier(userId, tier);
      return NextResponse.json({ success: true, user: updatedUser });
    }

    if (action === 'create_user') {
      const { email, name } = body;
      if (!email || !name) {
        return NextResponse.json({ error: 'Missing email or name.' }, { status: 400 });
      }
      const newUser = await dbService.createUser(email, name);
      return NextResponse.json({ success: true, user: newUser });
    }

    if (action === 'update_super_admin') {
      const { email } = body;
      if (!email) {
        return NextResponse.json({ error: 'Missing email.' }, { status: 400 });
      }
      await dbService.setSuperAdminEmail(email);
      return NextResponse.json({ success: true, superAdminEmail: email });
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
