'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MessageCircle } from 'lucide-react';
import ChatPopup from './ChatPopup';

export default function ChatBubble() {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const { data: discordSession } = useSession();

    // Check login status (both local auth + Discord)
    useEffect(() => {
        const checkLogin = () => {
            try {
                const u = localStorage.getItem('pokemon_user');
                if (u && JSON.parse(u).username) {
                    setIsLoggedIn(true);
                    return;
                }
            } catch {}
            // Fallback: Discord session
            setIsLoggedIn(!!discordSession?.user);
        };
        checkLogin();
        const interval = setInterval(checkLogin, 5000);
        return () => clearInterval(interval);
    }, [discordSession]);

    // Poll for unread count
    useEffect(() => {
        if (!isLoggedIn) {
            setUnreadCount(0);
            return;
        }

        const fetchUnread = async () => {
            try {
                const res = await fetch('/api/messages/conversations?countOnly=true');
                if (res.ok) {
                    const data = await res.json();
                    setUnreadCount(data.unreadCount || 0);
                }
            } catch (e) {
                // Silently fail
            }
        };

        fetchUnread();
        const interval = setInterval(fetchUnread, 15000);
        return () => clearInterval(interval);
    }, [isLoggedIn]);

    const handleUnreadChange = useCallback((count) => {
        setUnreadCount(count);
    }, []);

    if (!isLoggedIn) return null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="gravity-target fixed bottom-4 right-28 md:right-[8.5rem] z-[9000] w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center text-gray-500 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all duration-300 shadow-lg hover:shadow-amber-500/20 group"
                title="Messages"
            >
                <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <ChatPopup
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                targetUser={null}
                onUnreadChange={handleUnreadChange}
            />
        </>
    );
}
