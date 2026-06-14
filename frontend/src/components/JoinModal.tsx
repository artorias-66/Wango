// frontend/src/components/JoinModal.tsx
import { useState } from 'react';
import type { NearbyHangout } from '../api/wango.api';

const CATEGORY_ICONS: Record<string, string> = {
  SPORTS: '⚽', GO_KARTING: '🏎️', CRICKET: '🏏', FOOTBALL: '🏟️',
  GAMING: '🎮', FOOD: '🍜', OUTDOOR: '🏕️', MUSIC: '🎵',
  SOCIAL: '👥', FITNESS: '💪', TRAVEL: '✈️',
};

interface JoinModalProps {
  hangout: NearbyHangout;
  onConfirm: (message: string) => Promise<void>;
  onClose: () => void;
}

export function JoinModal({ hangout, onConfirm, onClose }: JoinModalProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onConfirm(message);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Overlay */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass animate-float-in"
        style={{
          width: '100%', maxWidth: 460,
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: 24 }}>{CATEGORY_ICONS[hangout.category] ?? '📍'}</span>
            <div>
              <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: 18, color: 'var(--text-primary)' }}>
                Request to Join
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {hangout.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 20, lineHeight: 1,
              padding: '4px',
            }}
          >×</button>
        </div>

        {/* Info strip */}
        <div style={{
          display: 'flex', gap: '12px', marginBottom: '20px',
          padding: '12px', borderRadius: 'var(--radius-md)',
          background: 'rgba(0,212,255,0.06)',
          border: '1px solid rgba(0,212,255,0.15)',
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Host</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{hangout.user.name}</p>
          </div>
          <div style={{ width: 1, background: 'var(--glass-border)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Spots</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-success)', marginTop: 2 }}>
              {hangout.maxParticipants - hangout.joinCount} left
            </p>
          </div>
          <div style={{ width: 1, background: 'var(--glass-border)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Distance</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', marginTop: 2 }}>
              {(hangout.distanceMeters / 1000).toFixed(1)} km
            </p>
          </div>
        </div>

        {/* Message */}
        <div style={{ marginBottom: '20px' }}>
          <label className="input-label" htmlFor="join-message">
            Message to host <span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 'normal' }}>(optional)</span>
          </label>
          <textarea
            id="join-message"
            className="input"
            placeholder="Hey! I'd love to join — I've been playing cricket for 3 years..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-ghost btn-full"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary btn-full"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Sending…' : 'Send Request →'}
          </button>
        </div>
      </div>
    </div>
  );
}
