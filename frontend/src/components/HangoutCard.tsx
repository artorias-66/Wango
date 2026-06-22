// frontend/src/components/HangoutCard.tsx
import type { NearbyHangout } from '../api/wango.api';

const CATEGORY_META: Record<string, { icon: string; color: string; label: string }> = {
  SPORTS:     { icon: '⚽', color: '#f59e0b', label: 'Sports' },
  GO_KARTING: { icon: '🏎️', color: '#ef4444', label: 'Go-Karting' },
  CRICKET:    { icon: '🏏', color: '#10b981', label: 'Cricket' },
  FOOTBALL:   { icon: '🏟️', color: '#3b82f6', label: 'Football' },
  GAMING:     { icon: '🎮', color: '#8b5cf6', label: 'Gaming' },
  FOOD:       { icon: '🍜', color: '#f97316', label: 'Food' },
  OUTDOOR:    { icon: '🏕️', color: '#22c55e', label: 'Outdoor' },
  MUSIC:      { icon: '🎵', color: '#ec4899', label: 'Music' },
  SOCIAL:     { icon: '👥', color: '#06b6d4', label: 'Social' },
  FITNESS:    { icon: '💪', color: '#84cc16', label: 'Fitness' },
  TRAVEL:     { icon: '✈️', color: '#a78bfa', label: 'Travel' },
};

function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)}m away`;
  return `${(metres / 1000).toFixed(1)} km away`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface HangoutCardProps {
  hangout: NearbyHangout;
  onJoin?: (hangout: NearbyHangout) => void;
  onOpenChat?: (roomId: number) => void;
  onSelect?: (hangout: NearbyHangout) => void;
  isSelected?: boolean;
}

export function HangoutCard({ hangout, onJoin, onOpenChat, onSelect, isSelected }: HangoutCardProps) {
  const meta = CATEGORY_META[hangout.category] ?? { icon: '📍', color: '#00d4ff', label: hangout.category };
  const spotsLeft = hangout.maxParticipants - hangout.joinCount;
  const isFull = spotsLeft <= 0;

  return (
    <div
      onClick={() => onSelect?.(hangout)}
      className="glass glass-hover animate-float-in"
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        cursor: 'pointer',
        border: isSelected
          ? '1px solid var(--color-primary)'
          : '1px solid var(--glass-border)',
        boxShadow: isSelected ? '0 0 0 1px var(--color-primary), var(--shadow-glow-cyan)' : 'none',
        transition: 'all var(--transition-base)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Category accent line */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '2px',
        background: meta.color,
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {/* Category badge */}
          <span style={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 9px',
            borderRadius: 'var(--radius-full)',
            background: `${meta.color}18`,
            border: `1px solid ${meta.color}40`,
            color: meta.color,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {meta.icon} {meta.label}
          </span>
        </div>

        {/* Distance */}
        <span style={{
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--color-primary)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}>
          {formatDistance(hangout.distanceMeters)}
        </span>
      </div>

      {/* Title */}
      <h3 style={{
        fontFamily: 'var(--font-headline)',
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: '4px',
        lineHeight: 1.3,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {hangout.title}
      </h3>

      {/* Host + date */}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: '12px' }}>
        by <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{hangout.user.name}</span>
        {' · '}
        {formatDate(hangout.scheduledAt)}
      </p>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        {/* Spots */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: 12,
          fontWeight: 600,
          color: isFull ? 'var(--color-danger)' : 'var(--color-success)',
        }}>
          <span style={{
            display: 'inline-block',
            width: 7, height: 7,
            borderRadius: '50%',
            background: isFull ? 'var(--color-danger)' : 'var(--color-success)',
          }} />
          {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
            ({hangout.joinCount}/{hangout.maxParticipants})
          </span>
        </span>

        {/* Join button / Status */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {hangout.myJoinStatus === 'ACCEPTED' && hangout.chatRoomId && onOpenChat && (
            <button
              className="btn btn-primary btn-sm"
              onClick={(e) => { e.stopPropagation(); onOpenChat(hangout.chatRoomId!); }}
              style={{ fontSize: 12, padding: '5px 12px', position: 'relative' }}
            >
              💬 Open Chat
              {hangout.unreadCount && hangout.unreadCount > 0 ? (
                <span style={{
                  position: 'absolute',
                  top: '-4px', right: '-4px',
                  background: 'var(--color-danger)',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 800,
                  minWidth: '16px', height: '16px',
                  borderRadius: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 2px var(--bg-surface)'
                }}>
                  {hangout.unreadCount > 99 ? '99+' : hangout.unreadCount}
                </span>
              ) : null}
            </button>
          )}

          {hangout.myJoinStatus === 'ACCEPTED' && (
            <span style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16,185,129,0.1)',
              color: 'var(--color-success)',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center'
            }}>
              Joined
            </span>
          )}

          {hangout.myJoinStatus === 'PENDING' && (
            <span style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(245,158,11,0.1)',
              color: '#f59e0b',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center'
            }}>
              Request Pending
            </span>
          )}

          {!hangout.myJoinStatus && onJoin && !isFull && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); onJoin(hangout); }}
              style={{ fontSize: 12, padding: '5px 12px' }}
            >
              Request to Join →
            </button>
          )}

          {!hangout.myJoinStatus && isFull && (
            <span style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239,68,68,0.1)',
              color: 'var(--color-danger)',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center'
            }}>
              Full
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
