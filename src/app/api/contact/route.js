import { NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/rateLimit';

// 5 contact messages per 10 minutes per IP
const limiter = createRateLimiter('contact', 5, 10 * 60 * 1000);

export async function POST(request) {
    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Trop de messages envoyés. Réessayez plus tard.' }, { status: 429 });
    }

    try {
        const body = await request.json();
        const { name, email, message } = body;

        // Here you would typically send an email using a service like Resend, SendGrid, or Nodemailer
        // For now, we'll just log it to the console
        console.log('--- NEW CONTACT FORM SUBMISSION ---');
        console.log('Name:', name);
        console.log('Email:', email);
        console.log('Message:', message);
        console.log('-----------------------------------');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Contact form error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
