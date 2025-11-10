import React from 'react'

const groups = [
  'Shoulders',
  'Chest',
  'Back',
  'Arms',
  'Core',
  'Legs'
]

function makeHandlers(name, onSelect) {
  return {
    onClick: () => onSelect(name),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(name)
      }
    }
  }
}

export default function HumanDiagram({ selected, onSelect }) {
  return (
    <div className="diagram" aria-label="Human muscle diagram">
      <svg viewBox="0 0 200 400" width="300" height="600" role="img">
        {/* Head */}
        <circle cx="100" cy="30" r="18" fill="#f5d6c6" stroke="#333" />

        {/* Shoulders */}
        <g
          className={`muscle ${selected === 'Shoulders' ? 'selected' : ''}`}
          tabIndex={0}
          role="button"
          aria-pressed={selected === 'Shoulders'}
          {...makeHandlers('Shoulders', onSelect)}
        >
          <ellipse cx="60" cy="80" rx="20" ry="12" />
          <ellipse cx="140" cy="80" rx="20" ry="12" />
        </g>

        {/* Chest */}
        <g
          className={`muscle ${selected === 'Chest' ? 'selected' : ''}`}
          tabIndex={0}
          role="button"
          aria-pressed={selected === 'Chest'}
          {...makeHandlers('Chest', onSelect)}
        >
          <path d="M60 90 Q100 70 140 90 L140 150 Q100 170 60 150 Z" />
        </g>

        {/* Back (represented behind chest slightly offset) */}
        <g
          className={`muscle ${selected === 'Back' ? 'selected-back' : ''}`}
          tabIndex={0}
          role="button"
          aria-pressed={selected === 'Back'}
          {...makeHandlers('Back', onSelect)}
        >
          <path d="M60 95 Q100 115 140 95 L140 160 Q100 180 60 160 Z" />
        </g>

        {/* Arms */}
        <g
          className={`muscle ${selected === 'Arms' ? 'selected' : ''}`}
          tabIndex={0}
          role="button"
          aria-pressed={selected === 'Arms'}
          {...makeHandlers('Arms', onSelect)}
        >
          <rect x="30" y="92" width="12" height="80" rx="6" />
          <rect x="158" y="92" width="12" height="80" rx="6" />
        </g>

        {/* Core */}
        <g
          className={`muscle ${selected === 'Core' ? 'selected' : ''}`}
          tabIndex={0}
          role="button"
          aria-pressed={selected === 'Core'}
          {...makeHandlers('Core', onSelect)}
        >
          <rect x="80" y="150" width="40" height="80" rx="8" />
        </g>

        {/* Legs */}
        <g
          className={`muscle ${selected === 'Legs' ? 'selected' : ''}`}
          tabIndex={0}
          role="button"
          aria-pressed={selected === 'Legs'}
          {...makeHandlers('Legs', onSelect)}
        >
          <rect x="70" y="230" width="18" height="120" rx="8" />
          <rect x="112" y="230" width="18" height="120" rx="8" />
        </g>

      </svg>

      <div className="legend">
        {groups.map((g) => (
          <button
            key={g}
            className={`legend-btn ${selected === g ? 'active' : ''}`}
            onClick={() => onSelect(g)}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  )
}
