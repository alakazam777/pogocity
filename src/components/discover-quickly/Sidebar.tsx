'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/discover-quickly/store';
import { PlaylistSelector } from '@/components/discover-quickly/PlaylistSelector';
import {
    getArtistTopTracks,
    saveCollectionToSpotify,
    getUserPlaylists,
    getPlaylistTracks,
    playTrack,
    getMySavedTracks,
    checkUserSavedTracks,
    saveTracksUser,
    removeTracksUser,
    checkCurrentUserFollows,
    followArtists,
    unfollowArtists
} from '@/lib/discover-quickly/api';
import Image from 'next/image';
import { ArtistModal } from './ArtistModal';

export function Sidebar() {
    const currentTrack = useStore((state) => state.currentTrack);
    const accessToken = useStore((state) => state.accessToken);
    const pushView = useStore((state) => state.pushView);
    const viewStack = useStore((state) => state.viewStack);
    const popView = useStore((state) => state.popView);
    const deviceId = useStore((state) => state.deviceId);

    const [playlists, setPlaylists] = useState<any[]>([]);
    const [showArtistModal, setShowArtistModal] = useState(false);
    const [selectedArtist, setSelectedArtist] = useState<{ id: string; name: string } | null>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        if (accessToken) {
            getUserPlaylists(accessToken).then(setPlaylists);
        }
    }, [accessToken]);

    useEffect(() => {
        if (accessToken && currentTrack) {
            // Check if liked
            checkUserSavedTracks(accessToken, [currentTrack.id]).then(res => setIsLiked(res[0]));
            // Check if following artist
            checkCurrentUserFollows(accessToken, 'artist', [currentTrack.artists[0].id]).then(res => setIsFollowing(res[0]));
        }
    }, [accessToken, currentTrack]);

    useEffect(() => {
        const handleOpenModal = (e: CustomEvent) => {
            const { artistId, artistName } = e.detail;
            handleArtistClick(artistId, artistName);
        };

        window.addEventListener('openArtistModal', handleOpenModal as EventListener);
        return () => {
            window.removeEventListener('openArtistModal', handleOpenModal as EventListener);
        };
    }, []);

    const handlePlaylistClick = async (playlist: any) => {
        if (!accessToken) return;
        let tracks = [];
        if (playlist.id === 'liked-songs') {
            tracks = await getMySavedTracks(accessToken);
        } else {
            tracks = await getPlaylistTracks(accessToken, playlist.tracks.href);
        }

        const mappedTracks = tracks.map((t: any) => ({
            id: t.id,
            uri: t.uri,
            name: t.name,
            preview_url: t.preview_url,
            artists: t.artists.map((a: any) => ({ name: a.name, id: a.id, uri: a.uri })),
            album: { name: t.album.name, images: t.album.images },
        }));
        pushView(playlist.name, mappedTracks);
        // Removed auto-play
    };

    const handleArtistClick = async (artistId: string, artistName: string) => {
        setSelectedArtist({ id: artistId, name: artistName });
        setShowArtistModal(true);
    };

    const toggleLike = async () => {
        if (!accessToken || !currentTrack) return;
        if (isLiked) {
            await removeTracksUser(accessToken, [currentTrack.id]);
            setIsLiked(false);
        } else {
            await saveTracksUser(accessToken, [currentTrack.id]);
            setIsLiked(true);
        }
    };

    const toggleFollow = async () => {
        if (!accessToken || !currentTrack) return;
        const artistId = currentTrack.artists[0].id;
        if (isFollowing) {
            await unfollowArtists(accessToken, [artistId]);
            setIsFollowing(false);
        } else {
            await followArtists(accessToken, [artistId]);
            setIsFollowing(true);
        }
    };

    return (
        <>
            {showArtistModal && selectedArtist && (
                <ArtistModal
                    artistId={selectedArtist.id}
                    artistName={selectedArtist.name}
                    onClose={() => setShowArtistModal(false)}
                />
            )}
            <div className="w-80 h-full bg-zinc-900 p-4 border-l border-zinc-800 flex flex-col fixed right-0 top-0 bottom-0 z-50 overflow-y-auto">
                {/* Now Playing Section */}
                {!currentTrack ? (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-4">Now Playing</h2>
                        <p className="text-zinc-500">Hover an album to play</p>
                        {deviceId && <p className="text-xs text-zinc-700 mt-2">Device ID: {deviceId}</p>}
                    </div>
                ) : (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-4">Now Playing</h2>

                        <div
                            className="aspect-square relative w-full mb-4 cursor-pointer group"
                            onClick={() => handleArtistClick(currentTrack.artists[0].id, currentTrack.artists[0].name)}
                        >
                            {currentTrack.album.images[0] && (
                                <Image
                                    src={currentTrack.album.images[0].url}
                                    alt={currentTrack.album.name}
                                    fill
                                    className="object-cover rounded-md group-hover:opacity-80 transition-opacity"
                                />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-black/60 text-white px-3 py-1 rounded-full text-sm">View Artist</span>
                            </div>
                        </div>

                        <h3 className="text-lg font-bold truncate">{currentTrack.name}</h3>
                        <div className="flex flex-wrap gap-1 mt-1 mb-3">
                            {currentTrack.artists.map((artist, i) => (
                                <span key={i} className="text-zinc-400 text-sm">
                                    {artist.name}{i < currentTrack.artists.length - 1 && ", "}
                                </span>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={toggleLike}
                                className={`flex-1 py-1 px-2 rounded text-sm font-medium transition-colors ${isLiked ? 'bg-green-500 text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
                            >
                                {isLiked ? 'Liked' : 'Like'}
                            </button>
                            <button
                                onClick={toggleFollow}
                                className={`flex-1 py-1 px-2 rounded text-sm font-medium transition-colors ${isFollowing ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
                            >
                                {isFollowing ? 'Followed' : 'Follow'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Playlists Section */}
                <div className="mb-8 flex-1 overflow-y-auto min-h-0">
                    <h3 className="font-bold mb-2 text-zinc-400 uppercase text-xs tracking-wider">Playlists</h3>
                    <div className="space-y-1">
                        <button
                            onClick={() => handlePlaylistClick({ id: 'liked-songs', name: 'Liked Songs' })}
                            className="w-full text-left px-2 py-1 rounded hover:bg-zinc-800 text-sm truncate text-zinc-300 hover:text-white transition-colors font-semibold text-green-400"
                        >
                            ♥ Liked Songs
                        </button>
                        {playlists && playlists.map((playlist) => (
                            <button
                                key={playlist.id}
                                onClick={() => handlePlaylistClick(playlist)}
                                className="w-full text-left px-2 py-1 rounded hover:bg-zinc-800 text-sm truncate text-zinc-300 hover:text-white transition-colors"
                            >
                                {playlist.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
