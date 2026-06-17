// frontend/src/pages/Discover.tsx
import { useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { MapView } from '../components/MapView';
import { HangoutCard } from '../components/HangoutCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { RadiusSlider } from '../components/RadiusSlider';
import { JoinModal } from '../components/JoinModal';
import { useGeolocation } from '../hooks/useGeolocation';
import { useHangouts } from '../hooks/useHangouts';
import { requestToJoin } from '../api/wango.api';
import type { NearbyHangout } from '../api/wango.api';
import { useSyncUser } from '../hooks/useSyncUser';
import { useNavigate } from 'react-router-dom';

export function Discover() {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const { position, error: geoError, loading: geoLoading } = useGeolocation();

  // Auto-sync the Clerk user into our DB whenever they sign in + location is known
  useSyncUser(position);
  const [radiusMeters, setRadiusMeters] = useState(10000);
  const [category, setCategory] = useState<string | null>(null);
  const [selectedHangout, setSelectedHangout] = useState<NearbyHangout | null>(null);
  const [joiningHangout, setJoiningHangout] = useState<NearbyHangout | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const { hangouts, loading: hangoutsLoading, refetch } = useHangouts({
    position,
    radiusMeters,
    category: category ?? undefined,
  });

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleJoin = async (hangout: NearbyHangout) => {
    if (!isSignedIn) {
      showToast('Sign in to request to join a hangout.', 'error');
      return;
    }
    setJoiningHangout(hangout);
  };

  const handleJoinConfirm = async (message: string) => {
    if (!joiningHangout) return;
    try {
      const token = await getToken();
      await requestToJoin(joiningHangout.id, message || undefined, token!);
      showToast('Join request sent! The host will respond soon.', 'success');
      refetch();
    } catch (err) {
      showToast((err as Error).message ?? 'Failed to send join request.', 'error');
      throw err;
    }
  };

  return (
    <div className="discover-container" style={{ display: 'flex', height: '100vh', paddingTop: 'calc(60px + var(--safe-top))' }}>
      {/* ─── Left Panel ──────────────────────────────── */}
      <div className="discover-panel" style={{
        width: '380px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--glass-border)',
        overflow: 'hidden',
      }}>
        {/* Panel header */}
        <div style={{ padding: '20px 20px 0', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: 20, fontWeight: 800 }}>
                Discover
              </h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {hangoutsLoading
                  ? 'Finding hangouts…'
                  : `${hangouts.length} hangout${hangouts.length !== 1 ? 's' : ''} near you`}
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/post')}
            >
              + Post
            </button>
          </div>

          {/* Category filter */}
          <CategoryFilter selected={category} onSelect={setCategory} />
        </div>

        {/* Radius slider */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--glass-border)' }}>
          <RadiusSlider value={radiusMeters} onChange={setRadiusMeters} />
        </div>

        {/* Hangout list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {geoLoading && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
              <p style={{ fontSize: 14 }}>Locating you…</p>
            </div>
          )}

          {geoError && !geoLoading && (
            <div style={{
              margin: '12px 0', padding: '16px',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <p style={{ fontSize: 13, color: 'var(--color-danger)', fontWeight: 500 }}>
                📍 {geoError}
              </p>
            </div>
          )}

          {!geoLoading && !geoError && hangoutsLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass" style={{
                  height: 120, borderRadius: 'var(--radius-lg)',
                  opacity: 0.5, animation: 'pulse 1.5s ease infinite',
                }} />
              ))}
            </div>
          )}

          {!geoLoading && !hangoutsLoading && hangouts.length === 0 && !geoError && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
              <h3 style={{ fontFamily: 'var(--font-headline)', fontSize: 16, marginBottom: 8 }}>
                No hangouts nearby
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                Be the first to post one! Expand the radius or try a different category.
              </p>
              <button className="btn btn-primary" onClick={() => navigate('/post')}>
                Post a Hangout
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {hangouts.map((h) => (
              <HangoutCard
                key={h.id}
                hangout={h}
                onJoin={handleJoin}
                onOpenChat={(roomId) => navigate(`/chat/${roomId}`)}
                onSelect={(selected) => setSelectedHangout(selected)}
                isSelected={selectedHangout?.id === h.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ─── Map Panel ───────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Post hangout FAB */}
        <button
          className="btn btn-primary"
          onClick={() => navigate('/post')}
          style={{
            position: 'absolute',
            top: 16, right: 16,
            zIndex: 900,
            boxShadow: 'var(--shadow-glow-cyan)',
          }}
        >
          + Post Hangout
        </button>

        {position ? (
          <MapView
            position={position}
            hangouts={hangouts}
            radiusMeters={radiusMeters}
            selectedId={selectedHangout?.id ?? null}
            onSelectHangout={setSelectedHangout}
            onJoin={handleJoin}
            onOpenChat={(roomId) => navigate(`/chat/${roomId}`)}
          />
        ) : (
          <div style={{
            height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '16px',
            background: 'var(--bg-base)',
          }}>
            <div style={{ fontSize: 64 }}>🌍</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {geoLoading ? 'Getting your location…' : 'Location unavailable'}
            </p>
          </div>
        )}
      </div>

      {/* Join modal */}
      {joiningHangout && (
        <JoinModal
          hangout={joiningHangout}
          onConfirm={handleJoinConfirm}
          onClose={() => setJoiningHangout(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 3000,
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
          color: toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
          fontSize: 14, fontWeight: 500,
          backdropFilter: 'blur(12px)',
          boxShadow: 'var(--shadow-glass)',
          animation: 'float-in 0.3s ease',
          maxWidth: 320,
        }}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}
    </div>
  );
}
