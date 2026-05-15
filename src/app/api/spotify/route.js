import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { DATA_DIR } from '@/lib/dataPath';

// Last.fm API key — override via LASTFM_API_KEY in .env.local. The
// fallback is a widely-shared public key (read-only music metadata).
const LASTFM_API_KEY = process.env.LASTFM_API_KEY || 'b25b959554ed76058ac220b7b2e0a026';

export async function GET() {
    const settingsPath = path.join(DATA_DIR, 'settings.json');
    let settings = {};

    try {
        const fileContents = await fs.readFile(settingsPath, 'utf8');
        settings = JSON.parse(fileContents);
        console.log('📝 Settings loaded:', settings);
    } catch (error) {
        console.log('⚠️ Failed to load settings');
    }

    // If Last.fm mode
    if (settings.widgetMode === 'lastfm' && settings.lastFmUsername) {
        console.log('🎵 Last.fm mode detected, fetching data...');
        try {
            // Extract username from URL or use directly
            let username = settings.lastFmUsername;
            if (username.includes('last.fm/user/')) {
                username = username.split('last.fm/user/')[1].replace(/\/$/, '');
            }

            console.log('👤 Last.fm username:', username);

            const lastFmUrl = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${LASTFM_API_KEY}&format=json&limit=1`;
            const response = await fetch(lastFmUrl);
            const data = await response.json();

            console.log('📡 Last.fm API response:', JSON.stringify(data, null, 2));

            if (data.recenttracks && data.recenttracks.track && data.recenttracks.track.length > 0) {
                const track = data.recenttracks.track[0];
                const isPlaying = track['@attr']?.nowplaying === 'true';

                const result = {
                    isPlaying: isPlaying,
                    title: track.name || 'Unknown Track',
                    artist: track.artist?.['#text'] || track.artist || 'Unknown Artist',
                    album: track.album?.['#text'] || '',
                    albumImageUrl: track.image?.[3]?.['#text'] || track.image?.[2]?.['#text'] || '',
                    url: track.url || `https://www.last.fm/user/${username}`
                };

                console.log('✅ Returning Last.fm data:', result);
                return NextResponse.json(result);
            } else {
                console.log('⚠️ No tracks found in Last.fm response');
            }
        } catch (error) {
            console.error('❌ Last.fm API error:', error);
        }
    }

    // If Spotify mode (Mock for now, but ready for real implementation)
    console.log('🎧 Returning Spotify mock data');

    const mockData = {
        isPlaying: true,
        title: "Digital Realism",
        artist: "Uppermost",
        album: "Digital Realism",
        albumImageUrl: "https://i.scdn.co/image/ab67616d0000b273295254199988585472702750",
        url: "https://open.spotify.com/track/6M5d7d6c8b9c8a7e6f5g4h"
    };

    return NextResponse.json(mockData);
}
