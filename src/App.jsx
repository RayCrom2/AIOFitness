import React, { useState } from 'react'
import HumanDiagram from './components/HumanDiagram'

export default function App() {
  const [selected, setSelected] = useState(null)
  return (
    <div className="app">
      <h1>AIOFitness — Muscle Selector</h1>
      <div className="layout">
        <HumanDiagram selected={selected} onSelect={setSelected} />
        <div className="info">
          <h2>Selected</h2>
          {selected ? (
            <>
              <p><strong>{selected}</strong></p>
              <p>Information about the {selected} muscles.</p>
            </>
          ) : (
            <p>No muscle group selected. Click the diagram.</p>
          )}
        </div>
      </div>
    </div>
  )
}
