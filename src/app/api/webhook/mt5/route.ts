import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';

/**
 * MetaTrader 5 Webhook Endpoint (Malaysia Server Gateway)
 * Synchronizes client trading volumes and MT5 account verification states.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('Authorization');

    // Basic Token validation to secure MT5 Server connection
    const expectedToken = process.env.MT5_MANAGER_PASSWORD || 'default_mt5_pass_token';
    const clientToken = authHeader?.replace('Bearer ', '') || body.token;

    if (clientToken !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid MT5 sync security token.' },
        { status: 401 }
      );
    }

    const { userId, email, mt5Login, tradingVolume, status } = body;

    if (!mt5Login || typeof tradingVolume !== 'number' || !status) {
      return NextResponse.json(
        { error: 'Invalid parameters. Required: mt5Login, tradingVolume (number), status.' },
        { status: 400 }
      );
    }

    // Resolve user ID if email is provided instead
    let targetUserId = userId;
    if (!targetUserId && email) {
      const user = await dbService.getUserByEmail(email);
      if (user) {
        targetUserId = user.id;
      } else {
        return NextResponse.json(
          { error: `User with email ${email} not found. Ensure the user is registered before MT5 sync.` },
          { status: 404 }
        );
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Missing userId or valid email to map MT5 account.' },
        { status: 400 }
      );
    }

    // Sync to Database
    const syncRecord = await dbService.upsertMt5Sync(
      targetUserId,
      mt5Login,
      tradingVolume,
      status as 'PENDING' | 'APPROVED' | 'REJECTED'
    );

    console.log(`[MT5 Webhook] Successful sync for Login: ${mt5Login}, Vol: ${tradingVolume}, Status: ${status}`);

    return NextResponse.json({
      success: true,
      message: 'MetaTrader 5 system sync completed successfully.',
      data: syncRecord,
    });
  } catch (error: unknown) {
    console.error('[MT5 Webhook Error]:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Internal server error processing MT5 sync.', details: message },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint for testing MT5 terminal connection
 */
export async function GET() {
  const mt5Ip = process.env.MT5_SERVER_IP || '127.0.0.1';
  const login = process.env.MT5_MANAGER_LOGIN || 'Guest';

  return NextResponse.json({
    status: 'ONLINE',
    region: 'Malaysia (Kuala Lumpur)',
    targetServerIp: mt5Ip,
    activeManagerLogin: login,
    syncIntervalSeconds: 300,
  });
}
