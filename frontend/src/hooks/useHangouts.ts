// frontend/src/hooks/useHangouts.ts
import { useState, useEffect, useCallback } from 'react';
import { discoverHangouts, getChatRooms } from '../api/wango.api';
import type { NearbyHangout } from '../api/wango.api';
import type { GeoPosition } from './useGeolocation';
import { useAuth } from '@clerk/clerk-react';

interface UseHangoutsOptions {
  position: GeoPosition | null;
  radiusMeters: number;
  category?: string;
}

interface UseHangoutsReturn {
  hangouts: NearbyHangout[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useHangouts({
  position,
  radiusMeters,
  category,
}: UseHangoutsOptions): UseHangoutsReturn {
  const [hangouts, setHangouts] = useState<NearbyHangout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getToken, isSignedIn } = useAuth();

  const fetchHangouts = useCallback(async () => {
    if (!position) return;

    setLoading(true);
    setError(null);

    try {
      let token: string | undefined;
      const chatRoomsByRoomId: Record<number, number> = {};

      if (isSignedIn) {
        token = (await getToken()) ?? undefined;
        if (token) {
          try {
            const chatRes = await getChatRooms(token);
            if (chatRes.success) {
              chatRes.data.forEach((r) => {
                chatRoomsByRoomId[r.id] = r.unreadCount;
              });
            }
          } catch (e) {
            console.warn('Failed to load chat rooms for unread counts', e);
          }
        }
      }
      
      const res = await discoverHangouts(
        position.lat,
        position.lng,
        radiusMeters,
        category || undefined,
        token
      );

      const merged = res.data.map((h) => {
        if (h.chatRoomId && chatRoomsByRoomId[h.chatRoomId] !== undefined) {
          return { ...h, unreadCount: chatRoomsByRoomId[h.chatRoomId] };
        }
        return h;
      });

      setHangouts(merged);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load hangouts.');
    } finally {
      setLoading(false);
    }
  }, [position, radiusMeters, category, isSignedIn, getToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHangouts();
  }, [fetchHangouts]);

  return { hangouts, loading, error, refetch: fetchHangouts };
}
