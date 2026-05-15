async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, backoff = 1000): Promise<Response> {
    try {
        const res = await fetch(url, options);
        if (res.status === 429) {
            const retryAfter = res.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoff;
            console.warn(`Rate limited. Retrying in ${waitTime}ms...`);
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return fetchWithRetry(url, options, retries - 1, backoff * 2);
            }
        }
        return res;
    } catch (error) {
        if (retries > 0) {
            console.warn(`Fetch failed. Retrying in ${backoff}ms...`, error);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
}

export async function playTrack(accessToken: string, deviceId: string, trackUri: string) {
    const res = await fetchWithRetry(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [trackUri] }),
    });
    if (!res.ok) {
        console.error('playTrack failed', res.status, await res.text());
    } else {
        console.log('playTrack succeeded');
    }
}

export async function pausePlayback(accessToken: string, deviceId: string) {
    await fetchWithRetry(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });
}

export async function getDiscoverWeekly(accessToken: string) {
    // Search for "j-shoegaze diggage" playlist
    const searchRes = await fetchWithRetry('https://api.spotify.com/v1/search?q=j-shoegaze%20diggage&type=playlist&limit=1', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const searchData = await searchRes.json();
    const playlist = searchData.playlists?.items[0];

    if (!playlist) return null;

    // Fetch tracks
    const tracksRes = await fetchWithRetry(playlist.tracks.href, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const tracksData = await tracksRes.json();

    return tracksData.items.map((item: any) => item.track);
}

export async function getArtistTopTracks(accessToken: string, artistId: string) {
    const res = await fetchWithRetry(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    return data.tracks;
}

export async function saveCollectionToSpotify(accessToken: string, trackUris: string[]) {
    // Get current user ID
    const meRes = await fetchWithRetry('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meData = await meRes.json();
    const userId = meData.id;

    // Create Playlist
    const createRes = await fetchWithRetry(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: `Discover Quickly Save ${new Date().toLocaleDateString()}`,
            description: 'Created via Discover Quickly 2025',
        }),
    });
    const playlistData = await createRes.json();
    const playlistId = playlistData.id;

    // Add Tracks
    await fetchWithRetry(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            uris: trackUris,
        }),
    });

    return playlistData;
}

export async function getUserPlaylists(accessToken: string) {
    const res = await fetchWithRetry('https://api.spotify.com/v1/me/playlists?limit=50', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        console.error('Failed to fetch user playlists', res.status);
        return [];
    }
    const data = await res.json();
    return data.items || [];
}

export async function getPlaylistTracks(accessToken: string, href: string) {
    const res = await fetchWithRetry(href, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        console.error('Failed to fetch playlist tracks', res.status);
        return [];
    }
    const data = await res.json();
    return data.items?.map((item: any) => item.track) ?? [];
}

export async function getMySavedTracks(accessToken: string) {
    const res = await fetchWithRetry('https://api.spotify.com/v1/me/tracks?limit=50', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items.map((item: any) => item.track);
}

export async function checkUserSavedTracks(accessToken: string, ids: string[]) {
    const res = await fetchWithRetry(`https://api.spotify.com/v1/me/tracks/contains?ids=${ids.join(',')}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.json();
}

export async function saveTracksUser(accessToken: string, ids: string[]) {
    await fetchWithRetry(`https://api.spotify.com/v1/me/tracks?ids=${ids.join(',')}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

export async function removeTracksUser(accessToken: string, ids: string[]) {
    await fetchWithRetry(`https://api.spotify.com/v1/me/tracks?ids=${ids.join(',')}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

export async function checkCurrentUserFollows(accessToken: string, type: 'artist', ids: string[]) {
    const res = await fetchWithRetry(`https://api.spotify.com/v1/me/following/contains?type=${type}&ids=${ids.join(',')}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.json();
}

export async function followArtists(accessToken: string, ids: string[]) {
    await fetchWithRetry(`https://api.spotify.com/v1/me/following?type=artist&ids=${ids.join(',')}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

export async function unfollowArtists(accessToken: string, ids: string[]) {
    await fetchWithRetry(`https://api.spotify.com/v1/me/following?type=artist&ids=${ids.join(',')}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

export async function getArtistAlbums(accessToken: string, artistId: string) {
    const res = await fetchWithRetry(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=20`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    return data.items || [];
}

export async function checkUserSavedAlbums(accessToken: string, ids: string[]) {
    const res = await fetchWithRetry(`https://api.spotify.com/v1/me/albums/contains?ids=${ids.join(',')}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.json();
}

export async function saveAlbumsUser(accessToken: string, ids: string[]) {
    await fetchWithRetry(`https://api.spotify.com/v1/me/albums?ids=${ids.join(',')}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

export async function removeAlbumsUser(accessToken: string, ids: string[]) {
    await fetchWithRetry(`https://api.spotify.com/v1/me/albums?ids=${ids.join(',')}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

export async function getAlbumTracks(accessToken: string, albumId: string) {
    const res = await fetchWithRetry(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    return data.items || [];
}

export async function getAlbum(accessToken: string, albumId: string) {
    const res = await fetchWithRetry(`https://api.spotify.com/v1/albums/${albumId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.json();
}
