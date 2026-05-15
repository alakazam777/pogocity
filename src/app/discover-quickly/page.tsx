'use client';

import { useStore } from '@/lib/discover-quickly/store';
import { LoginButton } from '@/components/discover-quickly/LoginButton';
import { AuthProvider } from '@/components/discover-quickly/AuthProvider';
import { WebPlayback } from '@/components/discover-quickly/WebPlayback';
import { DiscoveryGrid } from '@/components/discover-quickly/DiscoveryGrid';
import { Sidebar } from '@/components/discover-quickly/Sidebar';

function HomeContent() {
    const accessToken = useStore((state) => state.accessToken);

    if (!accessToken) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-black text-white">
                <h1 className="text-4xl font-bold mb-8">Discover Quickly 2025</h1>
                <LoginButton />
            </div>
        );
    }

    return (
        <main className="flex min-h-screen bg-gradient-to-br from-[#1a0b2e] via-[#13091f] to-black text-white">
            <div className="flex-1 p-8 mr-80">
                <WebPlayback />
                <DiscoveryGrid />
            </div>
            <Sidebar />
        </main>
    );
}

export default function Home() {
    return (
        <AuthProvider>
            <HomeContent />
        </AuthProvider>
    );
}
