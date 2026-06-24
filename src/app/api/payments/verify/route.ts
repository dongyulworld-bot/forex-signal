import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySessionToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.userId;
    const body = await req.json();
    const { planName, amount, txId } = body;

    if (!planName || !amount || !txId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // [TronGrid API Validation Placeholder]
    // 
    // async function verifyTronGridTransaction(txId: string, expectedAmount: number): Promise<boolean> {
    //   const TRONGRID_API_URL = "https://api.trongrid.io/wallet/gettransactionbyid";
    //   try {
    //     const res = await fetch(TRONGRID_API_URL, {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({ value: txId })
    //     });
    //     const data = await res.json();
    //     
    //     // Verify if the transaction is successful and amounts match...
    //     // if (data && data.ret && data.ret[0].contractRet === "SUCCESS") { ... }
    //     
    //     return true;
    //   } catch (e) {
    //     console.error("TronGrid validation error", e);
    //     return false;
    //   }
    // }
    // 
    // const isValid = await verifyTronGridTransaction(txId, amount);
    // if (!isValid) {
    //   return NextResponse.json({ error: 'Invalid transaction' }, { status: 400 });
    // }

    // Save transaction to DB
    const tx = await dbService.createPaymentTransaction({
      userId,
      planName,
      amount: Number(amount),
      txId,
    });

    return NextResponse.json({ success: true, transaction: tx });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
