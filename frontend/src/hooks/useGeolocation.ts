// frontend/src/hooks/useGeolocation.ts
import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';

export interface GeoPosition {
  lat: number;
  lng: number;
}

interface GeolocationState {
  position: GeoPosition | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

export function useGeolocation(): GeolocationState {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    let watchId: string | null = null;
    let mounted = true;

    const start = async () => {
      try {
        // Request permissions — on Android/iOS this shows the native OS dialog.
        // On web it falls back to the browser prompt automatically.
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== 'granted') {
          if (mounted) {
            setError('Location permission denied. Please allow access to discover hangouts nearby.');
            setLoading(false);
          }
          return;
        }

        watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
          (pos, err) => {
            if (!mounted) return;
            if (err || !pos) {
              setError('Unable to determine your location. Please try again.');
              setLoading(false);
              return;
            }
            setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setLoading(false);
            setError(null);
          }
        );
      } catch {
        if (mounted) {
          setError('Unable to determine your location. Please try again.');
          setLoading(false);
        }
      }
    };

    start();

    return () => {
      mounted = false;
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  }, [trigger]);

  return {
    position,
    error,
    loading,
    refresh: () => {
      setLoading(true);
      setError(null);
      setTrigger((t) => t + 1);
    },
  };
}
