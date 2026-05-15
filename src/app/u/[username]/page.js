'use client';

import { use } from 'react';
import ClassementPage from '../../rankings/[[...view]]/page';

// Public, shareable trainer profile URL: /u/<username>
//
// Renders the same page as /rankings but auto-opens the profile modal
// for the given username. The rankings grid stays in the background
// (blurred by the modal backdrop) and clicking another trainer rewrites
// the URL to their /u/<username>.
export default function UserProfilePage({ params }) {
    const { username } = use(params);
    return <ClassementPage initialUsername={username} />;
}
