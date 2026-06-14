// frontend/src/hooks/useHangouts.ts
import { useState, useEffect, useCallback } from 'react';
import { discoverHangouts } from '../api/wango.api';
import type { NearbyHangout } from '../api/wango.api';
import type { GeoPosition } from './useGeolocation';

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

  const fetchHangouts = useCallback(async () => {
    if (!position) return;

    setLoading(true);
    setError(null);

    try {
      const res = await discoverHangouts({
        lat: position.lat,
        lng: position.lng,
        radius: radiusMeters,
        category: category || undefined,
      });
      setHangouts(res.data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load hangouts.');
    } finally {
      setLoading(false);
    }
  }, [position, radiusMeters, category]);

  useEffect(() => {
    fetchHangouts();
  }, [fetchHangouts]);

  return { hangouts, loading, error, refetch: fetchHangouts };
}
