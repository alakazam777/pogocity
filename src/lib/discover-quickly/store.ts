import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Track {
    id: string;
    uri: string;
    name: string;
    preview_url?: string;
    artists: { name: string; uri: string; id: string }[];
    album: { name: string; images: { url: string }[] };
}

export interface AppState {
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
    setTokens: (accessToken: string, refreshToken: string, expiresIn: number) => void;
    clearTokens: () => void;

    deviceId: string | null;
    setDeviceId: (id: string) => void;

    isPaused: boolean;
    setIsPaused: (paused: boolean) => void;

    currentTrack: Track | null;
    setCurrentTrack: (track: Track | null) => void;

    // Navigation
    viewStack: { name: string; tracks: Track[] }[];
    pushView: (name: string, tracks: Track[]) => void;
    popView: () => void;
    resetView: () => void;

    // Playlists
    currentPlaylistId: string | null;
    setCurrentPlaylistId: (id: string | null) => void;

    collection: Track[];
    addToCollection: (track: Track) => void;
    removeFromCollection: (trackId: string) => void;
    clearCollection: () => void;
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
            setTokens: (accessToken, refreshToken, expiresIn) => {
                const expiresAt = Date.now() + expiresIn * 1000;
                set({ accessToken, refreshToken, expiresAt });
            },
            clearTokens: () => set({ accessToken: null, refreshToken: null, expiresAt: null }),

            deviceId: null,
            setDeviceId: (id) => set({ deviceId: id }),

            isPaused: true,
            setIsPaused: (paused) => set({ isPaused: paused }),

            currentTrack: null,
            setCurrentTrack: (track) => set({ currentTrack: track }),

            viewStack: [],
            pushView: (name, tracks) => set((state) => ({ viewStack: [...state.viewStack, { name, tracks }] })),
            popView: () => set((state) => ({ viewStack: state.viewStack.slice(0, -1) })),
            resetView: () => set({ viewStack: [] }),

            currentPlaylistId: null,
            setCurrentPlaylistId: (id) => set({ currentPlaylistId: id }),

            collection: [],
            addToCollection: (track) => set((state) => ({ collection: [...state.collection, track] })),
            removeFromCollection: (trackId) =>
                set((state) => ({ collection: state.collection.filter((t) => t.id !== trackId) })),
            clearCollection: () => set({ collection: [] }),
        }),
        {
            name: 'discover-quickly-storage',
            partialize: (state) => ({
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                expiresAt: state.expiresAt,
                collection: state.collection
            }), // Only persist auth and collection, not player state
        }
    )
);
