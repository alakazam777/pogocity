'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/discover-quickly/store';
import { getUserPlaylists, getPlaylistTracks, getDiscoverWeekly, getMySavedTracks, playTrack } from '@/lib/discover-quickly/api';

export function PlaylistSelector({ onClose = () => { } }: { onClose?: () => void }) {
    const accessToken = useStore((state) => state.accessToken);
    const pushView = useStore((state) => state.pushView);
    const [playlists, setPlaylists] = useState<any[]>([]);

    useEffect(() => {
        if (accessToken) {
            getUserPlaylists(accessToken).then(setPlaylists);
        }
    }, [accessToken]);

    const deviceId = useStore((state) => state.deviceId);
    const maxAttempts = 5;
    const attemptPlay = async (tracks, attempt = 1) => {
        if (tracks.length === 0) return;
        if (deviceId && accessToken) {
            try {
                await playTrack(accessToken, deviceId, tracks[0].uri);
            } catch (e) {
                console.error('Failed to start playback', e);
            }
        } else if (attempt < maxAttempts) {
            setTimeout(() => attemptPlay(tracks, attempt + 1), 1000);
        } else {
            console.warn('Unable to play track: device not ready');
        }
    };

    const handleSelect = async (playlist: any) => {
        if (!accessToken) return;
        const tracks = await getPlaylistTracks(accessToken, playlist.href);
        const mappedTracks = tracks.map((t: any) => ({
            id: t.id,
            uri: t.uri,
            name: t.name,
            preview_url: t.preview_url,
            artists: t.artists.map((a: any) => ({ name: a.name, id: a.id, uri: a.uri })),
            album: { name: t.album.name, images: t.album.images },
        }));
        pushView(playlist.name, mappedTracks);
        attemptPlay(mappedTracks);
        if (onClose) onClose();
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <h2 className="text-xl font-bold mb-4 text-white">Select a Playlist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {playlists.map((playlist) => (
                    <button
                        key={playlist.id}
                        onClick={() => handleSelect(playlist)}
                        className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded text-left"
                    >
                        {playlist.images?.[0] && (
                            <img src={playlist.images[0].url} alt="" className="w-12 h-12 rounded object-cover" />
                        )}
                        <div className="truncate">
                            <div className="font-medium truncate text-white">{playlist.name}</div>
                            <div className="text-xs text-zinc-500">{playlist.tracks.total} tracks</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
