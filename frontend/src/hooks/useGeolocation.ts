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
        // Attempt manual permission flow on native devices
        if (Capacitor.isNativePlatform()) {
          try {
            let perm = await Geolocation.checkPermissions();
            if (perm.location !== 'granted') {
              perm = await Geolocation.requestPermissions({ permissions: ['location'] });
            }

            if (perm.location !== 'granted') {
              if (mounted) {
                setError('Location permission denied. Please allow access to discover hangouts nearby.');
                setLoading(false);
              }
              return;
            }
          } catch (permErr) {
            console.warn('Permission check failed, proceeding to location request:', permErr);
          }
        }

        // Attempt a quick one-shot location first to prevent initial watchPosition hang
        try {
          const initialPos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
          if (mounted && initialPos) {
            setPosition({ lat: initialPos.coords.latitude, lng: initialPos.coords.longitude });
            setLoading(false);
            setError(null);
          }
        } catch (e) {
          console.warn('Initial location fetch failed:', e);
        }

        watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
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
