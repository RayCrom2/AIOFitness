import React, { useEffect, useMemo, useRef, useState } from 'react'
import HumanDiagram from './components/HumanDiagram'

export default function App() {
  const [selected, setSelected] = useState(null)
  const diagramRef = useRef(null)

  // ---- Normalizers ---------------------------------------------------------
  const extractSlug = (val) => {
    // 1) already a string slug
    if (typeof val === 'string') return val

    // 2) object shapes we often see
    if (val && typeof val === 'object') {
      if (val.slug || val.name || val.id || val.key) {
        return val.slug || val.name || val.id || val.key
      }
      // 3) React/DOM event — try dataset/aria-label on target or nearest ancestor
      const t = val.target || val.currentTarget
      if (t) {
        // Prefer data-muscle on target or closest ancestor
        const el = t.closest ? t.closest('[data-muscle], [aria-label]') : t
        const byData =
          el?.dataset?.muscle ??
          el?.getAttribute?.('data-muscle') ??
          t?.dataset?.muscle ??
          t?.getAttribute?.('data-muscle')
        const byAria =
          el?.getAttribute?.('aria-label') ?? t?.getAttribute?.('aria-label')
        if (byData) return byData
        if (byAria) return byAria

        // Fallback: try an id that looks like a slug
        const id = el?.id || t?.id
        if (id && /[a-z]+(\.(left|right))?$/i.test(id)) return id
      }
    }

    return null
  }

  const normalizeForDisplay = (slug) => {
    if (!slug) return null
    const base = slug.replace(/\.(left|right)$/i, '')
    return base.charAt(0).toUpperCase() + base.slice(1)
  }

  const handleSelect = (val) => {
    const raw = extractSlug(val)
    if (typeof raw === 'string' && raw.trim()) {
      setSelected(raw.trim())
    }
  }

  useEffect(() => {
    const root = diagramRef.current
    if (!root) return

    const onClickCapture = (e) => {
      const slug = extractSlug(e)
      if (slug) setSelected(slug)
    }

    const onCustom = (e) => {
      const slug = e?.detail?.slug || extractSlug(e)
      if (slug) setSelected(slug)
    }

    root.addEventListener('click', onClickCapture, true)
    window.addEventListener('muscle-select', onCustom)

    return () => {
      root.removeEventListener('click', onClickCapture, true)
      window.removeEventListener('muscle-select', onCustom)
    }
  }, [])

  const displayName = useMemo(() => normalizeForDisplay(selected), [selected])

  return (
    <div className="app">
      <h1>AIOFitness — Muscle Selector</h1>
      <div className="layout" ref={diagramRef}>
        <HumanDiagram selected={selected} onSelect={handleSelect} />

        <div className="info">
          <h2>Selected</h2>
          {displayName ? (
            <>
              <p><strong>{displayName}</strong></p>
              <p>Information about the {displayName.toLowerCase()} muscles.</p>
            </>
          ) : (
            <p>No muscle selected. Click the diagram.</p>
          )}
        </div>
      </div>
    </div>
  )
}
