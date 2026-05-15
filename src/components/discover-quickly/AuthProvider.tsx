'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/discover-quickly/store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const setTokens = useStore((state) => state.setTokens);

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const res = await fetch('/api/token');
                if (res.ok) {
                    const data = await res.json();
                    // We don't get expires_in from /api/token currently, assume 1 hour or just set token
                    // Actually /api/token should probably return expires_in too if possible, but for now just access token
                    setTokens(data.accessToken, '', 3600);
                }
            } catch (e) {
                console.error('Failed to fetch token', e);
            }
        };

        fetchToken();
        // Poll every 50 minutes to refresh
        const interval = setInterval(fetchToken, 50 * 60 * 1000);
        return () => clearInterval(interval);
    }, [setTokens]);

    return <>{children}</>;
}
