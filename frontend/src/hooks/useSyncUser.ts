// frontend/src/hooks/useSyncUser.ts
import { useEffect, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { syncUser } from '../api/wango.api';

/**
 * Automatically syncs the Clerk-authenticated user into our database.
 * Called once on mount when the user is signed in.
 * Silently retries on transient failures — never blocks the UI.
 */
export function useSyncUser(position: { lat: number; lng: number } | null) {
  const { user, isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const hasSynced = useRef(false);

  useEffect(() => {
    // Only run once per session, when signed in AND we have a position
    if (!isLoaded || !isSignedIn || !user || !position || hasSynced.current) return;

    const doSync = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        await syncUser(
          {
            name: user.fullName ?? user.firstName ?? 'Explorer',
            email: user.primaryEmailAddress?.emailAddress ?? '',
            bio: undefined,
            lat: position.lat,
            lng: position.lng,
          },
          token
        );
        hasSynced.current = true;
        console.log('[Wango] User synced to DB ✓');
      } catch (err: any) {
        // 404 = not yet in DB (first time), sync will handle upsert
        // Any other error: log but don't crash the app
        console.warn('[Wango] Sync warning:', err.message);
      }
    };

    doSync();
  }, [isLoaded, isSignedIn, user, position]);
}
