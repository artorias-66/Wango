// frontend/src/components/CategoryFilter.tsx

const CATEGORIES = [
  { id: 'SPORTS',     label: 'Sports',      icon: '⚽' },
  { id: 'GO_KARTING', label: 'Karting',     icon: '🏎️' },
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

interface CategoryFilterProps {
  selected: string | null;
  onSelect: (cat: string | null) => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      overflowX: 'auto',
      paddingBottom: '4px',
      scrollbarWidth: 'none',
    }}>
      {/* "All" pill */}
      <button
        onClick={() => onSelect(null)}
        style={{
          flexShrink: 0,
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
          border: `1px solid ${selected === null ? 'var(--color-primary)' : 'var(--glass-border)'}`,
          background: selected === null ? 'var(--color-primary-dim)' : 'var(--glass-bg)',
          color: selected === null ? 'var(--color-primary)' : 'var(--text-secondary)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
          fontFamily: 'var(--font-body)',
          whiteSpace: 'nowrap',
        }}
      >
        ✦ All
      </button>

      {CATEGORIES.map((cat) => {
        const isActive = selected === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(isActive ? null : cat.id)}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--glass-border)'}`,
              background: isActive ? 'var(--color-primary-dim)' : 'var(--glass-bg)',
              color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export { CATEGORIES };
