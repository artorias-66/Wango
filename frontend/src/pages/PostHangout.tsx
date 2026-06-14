// frontend/src/pages/PostHangout.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSyncUser } from '../hooks/useSyncUser';
import { createHangout } from '../api/wango.api';

const CATEGORIES = [
  { id: 'SPORTS',     label: 'Sports',      icon: '⚽' },
  { id: 'GO_KARTING', label: 'Go-Karting',  icon: '🏎️' },
  { id: 'CRICKET',    label: 'Cricket',     icon: '🏏' },
  { id: 'FOOTBALL',   label: 'Football',    icon: '🏟️' },
  { id: 'GAMING',     label: 'Gaming',      icon: '🎮' },
  { id: 'FOOD',       label: 'Food',        icon: '🍜' },
  { id: 'OUTDOOR',    label: 'Outdoor',     icon: '🏕️' },
  { id: 'MUSIC',      label: 'Music',       icon: '🎵' },
  { id: 'SOCIAL',     label: 'Social',      icon: '👥' },
  { id: 'FITNESS',    label: 'Fitness',     icon: '💪' },
  { id: 'TRAVEL',     label: 'Travel',      icon: '✈️' },
];

export function PostHangout() {
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const { position, loading: geoLoading, refresh } = useGeolocation();

  // Auto-sync Clerk user into DB if not already synced
  useSyncUser(position);

  const [form, setForm] = useState({
    category: '',
    title: '',
    description: '',
    scheduledAt: '',
    maxParticipants: 8,
    radiusKm: 10,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: string, value: any) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!position) { setError('Location is required. Please allow location access.'); return; }
    if (!form.category) { setError('Please select an activity category.'); return; }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      await createHangout({
        title: form.title,
        description: form.description || undefined,
        category: form.category,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        radiusKm: form.radiusKm,
        maxParticipants: form.maxParticipants,
        lat: position.lat,
        lng: position.lng,
      }, token!);
      navigate('/');
    } catch (err: any) {
      setError(err.message ?? 'Failed to create hangout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: '80px',
      paddingBottom: '40px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '80px 20px 40px',
      background: 'var(--bg-base)',
    }}>
      <div className="glass animate-float-in" style={{
        width: '100%',
        maxWidth: 600,
        borderRadius: 'var(--radius-xl)',
        padding: '32px',
        border: '1px solid var(--glass-border)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 13, marginBottom: '12px',
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: 0, fontFamily: 'var(--font-body)',
            }}
          >
            ← Back to Discover
          </button>
          <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: 28, fontWeight: 800 }}>
            Post a Hangout
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
            Find your people nearby. Share what you want to do.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {/* Category grid */}
          <div>
            <label className="input-label">Activity Type</label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
            }}>
              {CATEGORIES.map((cat) => {
                const isActive = form.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => set('category', cat.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '12px 8px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--glass-border)'}`,
                      background: isActive ? 'var(--color-primary-dim)' : 'var(--glass-bg)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      boxShadow: isActive ? '0 0 12px var(--color-primary-glow)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{cat.icon}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="input-label" htmlFor="title">Title</label>
            <input
              id="title"
              className="input"
              type="text"
              placeholder="e.g. Casual cricket match this weekend!"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              required
              maxLength={120}
            />
          </div>

          {/* Description */}
          <div>
            <label className="input-label" htmlFor="description">
              Description <span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 'normal' }}>(optional)</span>
            </label>
            <textarea
              id="description"
              className="input"
              placeholder="Tell people more — skill level, what to bring, meetup point..."
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Date/time + max participants row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="input-label" htmlFor="scheduled-at">When</label>
              <input
                id="scheduled-at"
                className="input"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => set('scheduledAt', e.target.value)}
                required
                min={new Date().toISOString().slice(0, 16)}
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="input-label" htmlFor="max-participants">Max Participants</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => set('maxParticipants', Math.max(2, form.maxParticipants - 1))}
                  style={{ padding: '10px 14px', fontSize: 18, fontWeight: 300 }}
                >−</button>
                <input
                  id="max-participants"
                  className="input"
                  type="number"
                  value={form.maxParticipants}
                  onChange={(e) => set('maxParticipants', Number(e.target.value))}
                  min={2} max={100}
                  style={{ textAlign: 'center' }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => set('maxParticipants', Math.min(100, form.maxParticipants + 1))}
                  style={{ padding: '10px 14px', fontSize: 18, fontWeight: 300 }}
                >+</button>
              </div>
            </div>
          </div>

          {/* Radius slider */}
          <div>
            <label className="input-label">Discovery Radius</label>
            <div style={{ padding: '4px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>How far should this show up for others?</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>{form.radiusKm} km</span>
              </div>
              <input
                type="range"
                min={1} max={50} step={1}
                value={form.radiusKm}
                onChange={(e) => set('radiusKm', Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${((form.radiusKm - 1) / 49) * 100}%, var(--glass-border) ${((form.radiusKm - 1) / 49) * 100}%, var(--glass-border) 100%)`,
                }}
              />
            </div>
          </div>

          {/* Location */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: 20, color: 'var(--color-primary)' }}>📍</span>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Your Location</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {geoLoading
                    ? 'Detecting…'
                    : position
                    ? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`
                    : 'Location unavailable'}
                </p>
              </div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={refresh}>
              Re-detect
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: 'var(--color-danger)',
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading || geoLoading || !position}
            style={{ marginTop: '4px' }}
          >
            {loading ? 'Posting…' : '🚀 Post Hangout'}
          </button>
        </form>
      </div>
    </div>
  );
}
