import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { createSessionToken } from '@/lib/auth';
import { hashPassword } from '@/lib/crypto';

export const runtime = 'nodejs';


export async function POST(request: Request) {
  try {
    const { email, name, password } = await request.json();

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      );
    }

    const existingUser = await dbService.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 400 }
      );
    }

    const hashedPassword = hashPassword(password);
    const user = await dbService.createUser(email, name, hashedPassword);

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
    console.error('Signup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
