'use client';

import { useEffect, useState, useRef } from 'react';
import { useStore } from '@/lib/discover-quickly/store';
import { getArtistTopTracks, getArtistAlbums, checkUserSavedTracks, saveTracksUser, removeTracksUser, checkUserSavedAlbums, saveAlbumsUser, removeAlbumsUser, getAlbumTracks, playTrack } from '@/lib/discover-quickly/api';
import Image from 'next/image';

interface ArtistModalProps {
    artistId: string;
    artistName: string;
    onClose: () => void;
}

export function ArtistModal({ artistId, artistName, onClose }: ArtistModalProps) {
    const accessToken = useStore((state) => state.accessToken);
    const deviceId = useStore((state) => state.deviceId);
    const pushView = useStore((state) => state.pushView);

    const [tracks, setTracks] = useState<any[]>([]);
    const [albums, setAlbums] = useState<any[]>([]);
    const [savedAlbums, setSavedAlbums] = useState<Record<string, boolean>>({});

    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (accessToken && artistId) {
            // Fetch Top Tracks
            getArtistTopTracks(accessToken, artistId).then((fetchedTracks) => {
                const mapped = fetchedTracks.map((t: any) => ({
                    id: t.id,
                    uri: t.uri,
                    name: t.name,
                    preview_url: t.preview_url,
                    artists: t.artists.map((a: any) => ({ name: a.name, id: a.id, uri: a.uri })),
                    album: { name: t.album.name, images: t.album.images },
                }));
                setTracks(mapped);
            });

            // Fetch Albums
            getArtistAlbums(accessToken, artistId).then(async (fetchedAlbums) => {
                // Filter out duplicates (same name)
                const uniqueAlbums = fetchedAlbums.filter((album: any, index: number, self: any[]) =>
                    index === self.findIndex((t) => (
                        t.name === album.name
                    ))
                );
                setAlbums(uniqueAlbums);

                // Check saved status
                const ids = uniqueAlbums.map((a: any) => a.id);
                if (ids.length > 0) {
                    const savedStatus = await checkUserSavedAlbums(accessToken, ids);
                    const statusMap: Record<string, boolean> = {};
                    ids.forEach((id: string, index: number) => {
                        statusMap[id] = savedStatus[index];
                    });
                    setSavedAlbums(statusMap);
                }
            });
        }
    }, [accessToken, artistId]);

    const handlePlay = async (trackUri: string) => {
        if (accessToken && deviceId) {
            await playTrack(accessToken, deviceId, trackUri);
        }
    };

    const handleAlbumClick = async (album: any) => {
        if (!accessToken) return;
        const albumTracks = await getAlbumTracks(accessToken, album.id);
        const mappedTracks = albumTracks.map((t: any) => ({
            id: t.id,
            uri: t.uri,
            name: t.name,
            preview_url: t.preview_url,
            artists: t.artists.map((a: any) => ({ name: a.name, id: a.id, uri: a.uri })),
            album: { name: album.name, images: album.images },
        }));
        pushView(album.name, mappedTracks);
        onClose();
    };

    const toggleSaveAlbum = async (e: React.MouseEvent, albumId: string) => {
        e.stopPropagation();
        if (!accessToken) return;

        if (savedAlbums[albumId]) {
            await removeAlbumsUser(accessToken, [albumId]);
            setSavedAlbums(prev => ({ ...prev, [albumId]: false }));
        } else {
            await saveAlbumsUser(accessToken, [albumId]);
            setSavedAlbums(prev => ({ ...prev, [albumId]: true }));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-8" onClick={onClose}>
            <div className="bg-zinc-900 w-full max-w-6xl max-h-[90vh] rounded-lg flex flex-col border border-zinc-800" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 sticky top-0 z-10 rounded-t-lg">
                    <h2 className="text-3xl font-bold text-white">{artistName}</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl">&times;</button>
                </div>

                <div className="overflow-y-auto p-6 space-y-8">
                    {/* Top Tracks Section */}
                    <div>
                        <h3 className="text-xl font-bold mb-4 text-zinc-300">Top Tracks</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {tracks.map((track) => (
                                <div
                                    key={track.id}
                                    className="relative aspect-square group cursor-pointer rounded-md overflow-hidden"
                                    onClick={() => handlePlay(track.uri)}
                                    onMouseEnter={() => {
                                        if (track.preview_url) {
                                            if (!audioRef.current) {
                                                audioRef.current = new Audio(track.preview_url);
                                            } else {
                                                audioRef.current.src = track.preview_url;
                                            }
                                            audioRef.current.play().catch(console.error);
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        if (audioRef.current) {
                                            audioRef.current.pause();
                                            audioRef.current.currentTime = 0;
                                        }
                                    }}
                                >
                                    {track.album.images[0] && (
                                        <Image
                                            src={track.album.images[0].url}
                                            alt={track.name}
                                            fill
                                            className="object-cover transition-opacity group-hover:opacity-80"
                                        />
                                    )}
                                    <div className="absolute inset-0 flex flex-col justify-end p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white text-sm font-medium truncate">{track.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Albums Section */}
                    <div>
                        <h3 className="text-xl font-bold mb-4 text-zinc-300">Albums</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {albums.map((album) => (
                                <div
                                    key={album.id}
                                    className="relative aspect-square group cursor-pointer rounded-md overflow-hidden"
                                    onClick={() => handleAlbumClick(album)}
                                >
                                    {album.images[0] && (
                                        <Image
                                            src={album.images[0].url}
                                            alt={album.name}
                                            fill
                                            className="object-cover transition-opacity group-hover:opacity-80"
                                        />
                                    )}
                                    <div className="absolute inset-0 flex flex-col justify-between p-3 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="self-end">
                                            <button
                                                onClick={(e) => toggleSaveAlbum(e, album.id)}
                                                className={`p-2 rounded-full ${savedAlbums[album.id] ? 'text-green-500 bg-white' : 'text-white bg-black/50 hover:scale-110 transition-transform'}`}
                                            >
                                                {savedAlbums[album.id] ? '♥' : '♡'}
                                            </button>
                                        </div>
                                        <div>
                                            <p className="text-white font-bold truncate">{album.name}</p>
                                            <p className="text-zinc-300 text-sm">{album.release_date.split('-')[0]} • {album.total_tracks} tracks</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
