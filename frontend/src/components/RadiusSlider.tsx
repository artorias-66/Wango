// frontend/src/components/RadiusSlider.tsx

interface RadiusSliderProps {
  value: number; // in metres
  onChange: (metres: number) => void;
}

const STEPS = [
  { label: '1 km',  value: 1000 },
  { label: '5 km',  value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '25 km', value: 25000 },
  { label: '50 km', value: 50000 },
];

export function RadiusSlider({ value, onChange }: RadiusSliderProps) {
  const km = (value / 1000).toFixed(0);

  return (
    <div style={{ padding: '2px 0' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
      }}>
        <span className="input-label" style={{ margin: 0 }}>Search Radius</span>
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--color-primary)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {km} km
        </span>
      </div>

      <input
        id="radius-slider"
        type="range"
        min={1000}
        max={50000}
        step={1000}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${((value - 1000) / 49000) * 100}%, var(--glass-border) ${((value - 1000) / 49000) * 100}%, var(--glass-border) 100%)`,
        }}
      />

      {/* Quick-select buttons */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', justifyContent: 'space-between' }}>
        {STEPS.map((step) => (
          <button
            key={step.value}
            onClick={() => onChange(step.value)}
            style={{
              flex: 1,
              padding: '4px 0',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${value === step.value ? 'var(--color-primary)' : 'var(--glass-border)'}`,
              background: value === step.value ? 'var(--color-primary-dim)' : 'transparent',
              color: value === step.value ? 'var(--color-primary)' : 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {step.label}
          </button>
        ))}
      </div>
    </div>
  );
}
