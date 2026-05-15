'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/discover-quickly/store';
import { playTrack, pausePlayback } from '@/lib/discover-quickly/api';

export function WebPlayback() {
    const accessToken = useStore((state) => state.accessToken);
    const setDeviceId = useStore((state) => state.setDeviceId);
    const setIsPaused = useStore((state) => state.setIsPaused);
    const setCurrentTrack = useStore((state) => state.setCurrentTrack);

    useEffect(() => {
        if (!accessToken) return;

        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;

        document.body.appendChild(script);

        window.onSpotifyWebPlaybackSDKReady = () => {
            const player = new window.Spotify.Player({
                name: 'Discover Quickly 2025',
                getOAuthToken: (cb) => {
                    cb(accessToken);
                },
                volume: 0.5,
            });

            player.addListener('ready', async ({ device_id }) => {
                console.log('Ready with Device ID', device_id);
                setDeviceId(device_id);
                console.log('Device ID stored in state', device_id);
                // Transfer playback to the Web Playback SDK device
                if (accessToken) {
                    try {
                        await fetch('https://api.spotify.com/v1/me/player', {
                            method: 'PUT',
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ device_ids: [device_id], play: false }),
                        });
                        console.log('Playback transferred to SDK device');
                    } catch (e) {
                        console.error('Failed to transfer playback', e);
                    }
                }
            });

            player.addListener('not_ready', ({ device_id }) => {
                console.log('Device ID has gone offline', device_id);
                setDeviceId(''); // Or handle null
            });

            player.addListener('player_state_changed', (state) => {
                if (!state) return;

                setIsPaused(state.paused);
                const track = state.track_window.current_track;

                // Map SDK track to our Track interface
                // SDK track structure is slightly different from Web API
                // SDK: track.album.images is array of { url }
                // SDK: track.artists is array of { name, uri }

                setCurrentTrack({
                    id: track.id || '', // SDK sometimes has null id for local files
                    uri: track.uri,
                    name: track.name,
                    artists: track.artists.map(a => ({ name: a.name, uri: a.uri, id: a.uri.split(':')[2] })),
                    album: {
                        name: track.album.name,
                        images: track.album.images,
                    },
                });
            });

            player.addListener('initialization_error', ({ message }) => { console.error(message); });
            player.addListener('authentication_error', ({ message }) => { console.error(message); });
            player.addListener('account_error', ({ message }) => { console.error(message); });

            player.connect();
        };

        return () => {
            // Cleanup if needed, but SDK doesn't have easy disconnect/cleanup for script
        };
    }, [accessToken, setDeviceId, setIsPaused, setCurrentTrack]);

    return null; // No UI, just logic
}
