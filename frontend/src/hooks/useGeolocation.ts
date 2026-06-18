// frontend/src/hooks/useGeolocation.ts
import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

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
        if (Capacitor.getPlatform() !== 'web') {
          const perm = await Geolocation.requestPermissions();
          if (perm.location !== 'granted') {
            if (mounted) {
              setError('Location permission denied. Please allow access to discover hangouts nearby.');
              setLoading(false);
            }
            return;
          }
        }

        // Attempt a quick one-shot location first
        try {
          const initialPos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
          if (mounted && initialPos) {
            setPosition({ lat: initialPos.coords.latitude, lng: initialPos.coords.longitude });
            setLoading(false);
            setError(null);
          }
        } catch (e) {
          console.warn('Initial location fetch failed:', e);
        }

        watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
          (pos, err) => {
            if (!mounted) return;
            if (err || !pos) {
              console.error('WatchPosition Error:', err);
              // Only show error if we don't have a fallback position
              setPosition((prev) => {
                if (!prev) {
                  setError('Unable to determine your location. Please try again.');
                  setLoading(false);
                }
                return prev;
              });
              return;
            }
            setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setLoading(false);
            setError(null);
          }
        );
      } catch (err) {
        console.error('Geolocation setup error:', err);
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
