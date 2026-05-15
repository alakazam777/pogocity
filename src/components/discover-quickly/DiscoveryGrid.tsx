'use client';

// Added audio preview handling

import { useEffect, useState, useRef } from 'react';
import { useStore } from '@/lib/discover-quickly/store';
import { playTrack, saveCollectionToSpotify, checkUserSavedTracks, saveTracksUser, removeTracksUser, getDiscoverWeekly, pausePlayback } from '@/lib/discover-quickly/api';
import Image from 'next/image';
import { ArtistModal } from '@/components/discover-quickly/ArtistModal';

interface Track {
    id: string;
    uri: string;
    name: string;
    preview_url?: string;
    album: {
        name: string;
        images: { url: string }[];
    };
    artists: { name: string; id: string }[];
}

export function DiscoveryGrid() {
    const accessToken = useStore((state) => state.accessToken);
    const deviceId = useStore((state) => state.deviceId);
    const viewStack = useStore((state) => state.viewStack);
    const pushView = useStore((state) => state.pushView);

    // Use tracks from the top of the stack, or empty if stack is empty
    const tracks = viewStack.length > 0 ? viewStack[viewStack.length - 1].tracks : [];

    useEffect(() => {
        if (accessToken && viewStack.length === 0) {
            getDiscoverWeekly(accessToken).then((fetchedTracks) => {
                if (fetchedTracks) {
                    // Map if needed, getDiscoverWeekly in api.ts returns items.map(item => item.track)
                    // We need to ensure the structure matches Track interface
                    // api.ts getDiscoverWeekly returns raw track objects.
                    // We should map them here to be safe and consistent.
                    const mapped = fetchedTracks.map((t: any) => ({
                        id: t.id,
                        uri: t.uri,
                        name: t.name,
                        preview_url: t.preview_url,
                        artists: t.artists.map((a: any) => ({ name: a.name, id: a.id, uri: a.uri })),
                        album: { name: t.album.name, images: t.album.images },
                    }));
                    pushView("j-shoegaze diggage", mapped);
                }
            });
        }
    }, [accessToken, viewStack.length, pushView]);

    const addToCollection = useStore((state) => state.addToCollection);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handlePlay = async (trackUri: string) => {
        if (accessToken && deviceId) {
            await playTrack(accessToken, deviceId, trackUri);
        } else {
            console.warn('No access token or device ID');
        }
    };

    const handleHoverPlay = (track: Track) => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

        hoverTimeoutRef.current = setTimeout(async () => {
            if (track.preview_url) {
                if (!audioRef.current) {
                    audioRef.current = new Audio(track.preview_url);
                } else {
                    audioRef.current.src = track.preview_url;
                }
                audioRef.current.play().catch(e => console.error('Audio play failed', e));
            } else {
                // Fallback to SDK playback
                console.log('No preview, falling back to SDK for', track.name);
                if (accessToken && deviceId) {
                    await playTrack(accessToken, deviceId, track.uri);
                }
            }
        }, 500); // 500ms debounce
    };

    const handleHoverLeave = async () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        } else {
            // If we used SDK, we should pause it
            // We need to import pausePlayback from api
            // For now, let's assume we can just pause
            if (accessToken && deviceId) {
                // We need to import pausePlayback. 
                // Since I can't easily add imports in this block without replacing the whole file or using multi_replace,
                // I'll use the fetch directly or assume pausePlayback is available if I added it to imports.
                // I'll add pausePlayback to imports in a separate step or use full file replacement if needed.
                // Actually, I'll just use fetch here to be safe if I miss the import update, 
                // OR I can update the imports first.
                // Let's try to use the imported function, I will update imports in the next step.
                await pausePlayback(accessToken, deviceId);
            }
        }
    };

    // We need a way to trigger the artist modal from here.
    // Ideally, we should lift the state up or use a store for the modal.
    // For now, let's assume we can pass a prop or use a global event/store.
    // Since Sidebar has the modal logic, we might need to move it to a global store or layout.
    // Let's check where DiscoveryGrid is used. It's in page.tsx.
    // Sidebar is also in page.tsx.
    // We should probably move the ArtistModal state to the store so any component can trigger it.

    // For this step, I'll just add the UI for the artist name and assume we will implement the trigger logic.
    // Actually, I should implement the trigger logic now.
    // I'll add `setArtistModal` to the store in the next step.
    // For now, I'll just add the UI and a placeholder click handler.

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-0 w-full">
            {tracks.map((track) => (
                <div
                    key={track.id}
                    className="relative aspect-square group cursor-pointer"
                    onClick={() => handlePlay(track.uri)}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        addToCollection(track);
                    }}
                    onMouseEnter={() => handleHoverPlay(track)}
                    onMouseLeave={() => handleHoverLeave()}
                >
                    {track.album.images[0] && (
                        <Image
                            src={track.album.images[0].url}
                            alt={track.name}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
                            className="object-cover transition-opacity group-hover:opacity-80"
                        />
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 p-2">
                        {/* Artist Name Overlay */}
                        <div
                            className="mt-auto mb-2 bg-black/60 px-2 py-1 rounded text-xs text-white hover:underline hover:text-green-400 z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                // Trigger artist modal
                                // useStore.getState().openArtistModal(track.artists[0].id, track.artists[0].name);
                                // We need to add this to the store first.
                                const event = new CustomEvent('openArtistModal', { detail: { artistId: track.artists[0].id, artistName: track.artists[0].name } });
                                window.dispatchEvent(event);
                            }}
                        >
                            {track.artists[0].name}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
