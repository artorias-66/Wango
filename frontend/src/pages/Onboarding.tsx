// frontend/src/pages/Onboarding.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useGeolocation } from '../hooks/useGeolocation';
import { syncUser } from '../api/wango.api';

export function Onboarding() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { position, loading: geoLoading, error: geoError, refresh } = useGeolocation();

  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    if (!position) { setError('Location access is required to use Wango.'); return; }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      await syncUser({
        name: user?.fullName ?? user?.firstName ?? 'Explorer',
        email: user?.primaryEmailAddress?.emailAddress ?? '',
        bio: bio || undefined,
        lat: position.lat,
        lng: position.lng,
      }, token!);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? 'Failed to sync location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'var(--bg-base)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow orbs */}
      <div style={{
        position: 'absolute', width: 600, height: 600,
        borderRadius: '50%', top: '-200px', left: '-200px',
        background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 500, height: 500,
        borderRadius: '50%', bottom: '-150px', right: '-150px',
        background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="glass animate-float-in" style={{
        width: '100%', maxWidth: 460,
        borderRadius: 'var(--radius-xl)',
        padding: '40px 36px',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo + brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: '18px',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 32px var(--color-primary-glow)',
            fontSize: 32, fontWeight: 800,
            color: 'white',
            fontFamily: 'var(--font-headline)',
            margin: '0 auto 20px',
          }}>W</div>

          <h1 style={{
            fontFamily: 'var(--font-headline)',
            fontSize: 30, fontWeight: 800,
            marginBottom: '8px',
            background: 'linear-gradient(135deg, var(--text-primary), var(--color-primary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Welcome to Wango
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Find your people. Near you.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: '6px' }}>
            Hey <strong style={{ color: 'var(--text-secondary)' }}>
              {user?.firstName ?? 'there'}
            </strong>! Just one more step to get started.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Bio */}
          <div>
            <label className="input-label" htmlFor="bio">
              Bio <span style={{ textTransform: 'none', letterSpacing: 'normal', color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <textarea
              id="bio"
              className="input"
              placeholder="What are you into? Cricket lover, weekend hiker, gamer…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              maxLength={300}
            />
          </div>

          {/* Location permission box */}
          <div style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${position ? 'rgba(16,185,129,0.3)' : geoError ? 'rgba(239,68,68,0.3)' : 'rgba(0,212,255,0.25)'}`,
            background: position
              ? 'rgba(16,185,129,0.06)'
              : geoError ? 'rgba(239,68,68,0.06)' : 'rgba(0,212,255,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>
                {position ? '✅' : geoError ? '❌' : geoLoading ? '📡' : '📍'}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: 13, fontWeight: 600,
                  color: position ? 'var(--color-success)' : geoError ? 'var(--color-danger)' : 'var(--color-primary)',
                  marginBottom: 2,
                }}>
                  {position
                    ? 'Location detected'
                    : geoError ? 'Location access denied'
                    : geoLoading ? 'Detecting location…'
                    : 'Waiting for location…'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {position
                    ? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`
                    : geoError
                    ? geoError
                    : 'Please allow location access in your browser to discover nearby hangouts.'}
                </p>
              </div>
              {geoError && (
                <button className="btn btn-ghost btn-sm" onClick={refresh} style={{ flexShrink: 0 }}>
                  Retry
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: 'var(--color-danger)', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleComplete}
            disabled={loading || geoLoading || !position}
          >
            {loading ? 'Setting up…' : "Let's Go →"}
          </button>

          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Your location is only used to find hangouts near you and is never shared publicly.
          </p>
        </div>
      </div>
    </div>
  );
}
