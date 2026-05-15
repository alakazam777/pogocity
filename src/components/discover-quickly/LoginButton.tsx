'use client';

// import { Button } from '@/components/ui/button';
// Actually I didn't install shadcn components. I'll use a standard button with Tailwind.

export function LoginButton() {
    return (
        <a
            href="/api/discover-quickly/login"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-500 text-primary-foreground hover:bg-green-600 h-10 px-4 py-2"
        >
            Login with Spotify
        </a>
    );
}
