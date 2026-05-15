import { NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/rateLimit';
import { generateAdminToken, verifyAdminPassword } from '@/lib/adminAuth';

// 5 attempts per 15 minutes per IP
const limiter = createRateLimiter('admin-login', 5, 15 * 60 * 1000);

export async function POST(request) {
    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, { status: 429 });
    }

    try {
        const { password } = await request.json();

        if (verifyAdminPassword(password)) {
            const token = generateAdminToken();
            const response = NextResponse.json({ success: true });
            response.cookies.set('admin_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 // 1 day
            });
            return response;
        }

        return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
