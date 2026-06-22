import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { createSessionToken } from '@/lib/auth';
import { verifyPassword } from '@/lib/crypto';

export const runtime = 'nodejs';


export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await dbService.getUserByEmail(email);
    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 400 }
      );
    }

    const isPasswordValid = verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 400 }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });

    response.cookies.set({
      name: 'session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: unknown) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
