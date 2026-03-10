import { useState, useRef, useEffect } from 'react';
import muscles from '../data/muscles.js';

const ROUTINES_KEY = 'exercise_routines';

// Deduplicated list of all exercises from muscles.js
const ALL_EXERCISES = [...new Set(
  Object.values(muscles).flatMap(m => [
    ...(m.exercises || []),
    ...(m.parts || []).flatMap(p => p.exercises || []),
  ])
)].sort();


export default function ExerciseLogger() {
  const [view, setView] = useState('select');

  // ── routines (persisted)
  const [routines, setRoutines] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ROUTINES_KEY) || '[]'); } catch { return []; }
  });

  // ── create-routine state
  // cExs shape: [{ name, unit, sets: [{ reps, weight, rir }] }]
  const [cName,         setCName]         = useState('');
  const [cExs,          setCExs]          = useState([]);
  const [cSearch,       setCSearch]       = useState('');
  const [cDropdownOpen, setCDropdownOpen] = useState(false);
  const [cError,        setCError]        = useState('');
  const cSearchRef = useRef(null);

  // ── session state
  // sessionExs shape: [{ name, unit, sets: [{ reps, weight, rir, done }] }]
  const [sessionName,   setSessionName]   = useState('');
  const [sessionSource, setSessionSource] = useState('free');
  const [sessionExs,    setSessionExs]    = useState([]);
  const [sSearch,       setSSearch]       = useState('');
  const [sDropdownOpen, setSDropdownOpen] = useState(false);
  const [ending,        setEnding]        = useState(false);
  const [saveName,      setSaveName]      = useState('');
  const sSearchRef = useRef(null);

  // Derived session stats — only count sets marked done
  const doneSets  = sessionExs.flatMap(ex => ex.sets.filter(s => s.done));
  const totalSets = doneSets.length;
  const uniqueEx  = new Set(
    sessionExs.filter(ex => ex.sets.some(s => s.done)).map(ex => ex.name)
  ).size;
  const totalVol  = doneSets.reduce((sum, s) => {
    const w = Number(s.weight), r = Number(s.reps);
    return sum + (w > 0 && r > 0 ? w * r : 0);
  }, 0);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Close both search dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (cSearchRef.current && !cSearchRef.current.contains(e.target)) setCDropdownOpen(false);
      if (sSearchRef.current && !sSearchRef.current.contains(e.target)) setSDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── helpers
  function persistRoutines(next) {
    setRoutines(next);
    localStorage.setItem(ROUTINES_KEY, JSON.stringify(next));
  }

  // ── select actions
  function goCreate() {
    setCName(''); setCExs([]); setCSearch(''); setCDropdownOpen(false); setCError('');
    setView('create');
  }
  function goFreeSession() {
    setSessionName('New Workout'); setSessionSource('free');
    setSessionExs([]); setSSearch(''); setSDropdownOpen(false);
    setEnding(false); setSaveName('');
    setView('session');
  }
  function goRoutineSession(r) {
    setSessionName(r.name); setSessionSource('routine');
    // Pre-populate exercise cards from the saved routine
    const initialExs = r.exercises.map(ex => {
      const sets = Array.isArray(ex.sets)
        ? ex.sets.map(s => ({
            reps:   String(s.reps   != null ? s.reps   : ''),
            weight: String(s.weight != null ? s.weight : ''),
            rir:    String(s.rir    != null ? s.rir    : ''),
            done:   false,
          }))
        : [{ reps: String(ex.reps || ''), weight: String(ex.weight != null ? ex.weight : ''), rir: String(ex.rir != null ? ex.rir : ''), done: false }];
      return { name: ex.name, unit: ex.unit || 'lbs', sets };
    });
    setSessionExs(initialExs);
    setSSearch(''); setSDropdownOpen(false);
    setEnding(false); setSaveName(r.name);
    setView('session');
  }
  function deleteRoutine(id) {
    if (window.confirm('Delete this routine?')) persistRoutines(routines.filter(r => r.id !== id));
  }

  // ── create-routine: search
  const cSearchResults = cSearch.trim()
    ? ALL_EXERCISES.filter(ex => ex.toLowerCase().includes(cSearch.toLowerCase()))
    : [];

  function cAddExercise(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (cExs.some(e => e.name.toLowerCase() === trimmed.toLowerCase())) {
      setCSearch(''); setCDropdownOpen(false); return;
    }
    setCExs(prev => [...prev, { name: trimmed, unit: 'lbs', sets: [{ reps: '', weight: '', rir: '' }] }]);
    setCSearch(''); setCDropdownOpen(false); setCError('');
  }
  function cHandleSearchKey(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (cSearchResults.length > 0) cAddExercise(cSearchResults[0]);
    else if (cSearch.trim()) cAddExercise(cSearch);
  }
  function cAddSet(exIdx) {
    setCExs(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      return { ...ex, sets: [...ex.sets, { ...ex.sets[ex.sets.length - 1] }] };
    }));
  }
  function cRemoveSet(exIdx, setIdx) {
    setCExs(prev => prev.map((ex, i) => {
      if (i !== exIdx || ex.sets.length <= 1) return ex;
      return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) };
    }));
  }
  function cUpdateSet(exIdx, setIdx, field, value) {
    setCExs(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      return { ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value }) };
    }));
  }
  function cUpdateUnit(exIdx, value) {
    setCExs(prev => prev.map((ex, i) => i !== exIdx ? ex : { ...ex, unit: value }));
  }
  function cRemoveEx(exIdx) {
    setCExs(prev => prev.filter((_, i) => i !== exIdx));
  }
  function cSave() {
    if (!cName.trim())     { setCError('Routine name is required.'); return; }
    if (cExs.length === 0) { setCError('Add at least one exercise.'); return; }
    const exercises = cExs.map(ex => ({
      name: ex.name,
      unit: ex.unit,
      sets: ex.sets.map(s => ({
        reps:   Number(s.reps)  || 1,
        weight: s.weight !== '' ? Number(s.weight) : null,
        rir:    s.rir    !== '' ? Number(s.rir)    : null,
      })),
    }));
    persistRoutines([...routines, { id: String(Date.now()), name: cName.trim(), exercises }]);
    setView('select');
  }

  // ── session: search
  const sSearchResults = sSearch.trim()
    ? ALL_EXERCISES.filter(ex => ex.toLowerCase().includes(sSearch.toLowerCase()))
    : [];

  function sAddExercise(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (sessionExs.some(e => e.name.toLowerCase() === trimmed.toLowerCase())) {
      setSSearch(''); setSDropdownOpen(false); return;
    }
    setSessionExs(prev => [...prev, { name: trimmed, unit: 'lbs', sets: [{ reps: '', weight: '', rir: '', done: false }] }]);
    setSSearch(''); setSDropdownOpen(false);
  }
  function sHandleSearchKey(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (sSearchResults.length > 0) sAddExercise(sSearchResults[0]);
    else if (sSearch.trim()) sAddExercise(sSearch);
  }
  function sAddSet(exIdx) {
    setSessionExs(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      const last = ex.sets[ex.sets.length - 1];
      return { ...ex, sets: [...ex.sets, { ...last, done: false }] };
    }));
  }
  function sRemoveSet(exIdx, setIdx) {
    setSessionExs(prev => prev.map((ex, i) => {
      if (i !== exIdx || ex.sets.length <= 1) return ex;
      return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) };
    }));
  }
  function sUpdateSet(exIdx, setIdx, field, value) {
    setSessionExs(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      return { ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value }) };
    }));
  }
  function sToggleDone(exIdx, setIdx) {
    setSessionExs(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      return { ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, done: !s.done }) };
    }));
  }
  function sUpdateUnit(exIdx, value) {
    setSessionExs(prev => prev.map((ex, i) => i !== exIdx ? ex : { ...ex, unit: value }));
  }
  function sRemoveEx(exIdx) {
    setSessionExs(prev => prev.filter((_, i) => i !== exIdx));
  }
  function doSaveAsRoutine() {
    if (!saveName.trim()) return;
    const exercises = sessionExs.map(ex => ({
      name: ex.name,
      unit: ex.unit,
      sets: ex.sets.map(({ done: _, ...s }) => ({
        reps:   Number(s.reps)  || 1,
        weight: s.weight !== '' ? Number(s.weight) : null,
        rir:    s.rir    !== '' ? Number(s.rir)    : null,
      })),
    }));
    persistRoutines([...routines, { id: String(Date.now()), name: saveName.trim(), exercises }]);
    finishSession();
  }
  function finishSession() { setView('select'); setEnding(false); setSessionExs([]); }

  // ═══════════════════════════════════════════════
  // SELECT VIEW
  // ═══════════════════════════════════════════════
  if (view === 'select') return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 8px' }}>
      <h2 style={{ marginBottom: 4 }}>Exercise Logger</h2>
      <p style={{ color: '#888', marginBottom: 24, fontSize: 14 }}>{today}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
        <button
          onClick={goCreate}
          style={{ background: '#fff', border: '2px dashed #e0e0e0', borderRadius: 12, padding: '28px 24px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#ff8c42'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#e0e0e0'}
        >
          <div style={{ fontSize: 26, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>Create Routine</div>
          <div style={{ fontSize: 13, color: '#aaa', marginTop: 6, lineHeight: 1.4 }}>Build a named template with exercises to reuse later</div>
        </button>
        <button
          onClick={goFreeSession}
          style={{ background: '#ff8c42', border: 'none', borderRadius: 12, padding: '28px 24px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 4px 16px rgba(255,140,66,0.35)' }}
        >
          <div style={{ fontSize: 26, marginBottom: 10 }}>⚡</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>New Workout</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6, lineHeight: 1.4 }}>Log exercises as you go — option to save as a routine when done</div>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Routines</span>
        <span style={{ fontSize: 12, color: '#ccc' }}>({routines.length})</span>
      </div>

      {routines.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 10, padding: '36px 0', textAlign: 'center', color: '#bbb', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          No routines yet — create your first one above.
        </div>
      ) : (
        routines.map(r => (
          <div key={r.id} style={{
            background: '#fff', borderRadius: 10, padding: '16px 20px', marginBottom: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.exercises.length} exercise{r.exercises.length !== 1 ? 's' : ''}: {r.exercises.map(e => e.name).join(', ')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => goRoutineSession(r)} style={{ background: '#ff8c42', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>▶ Start</button>
              <button onClick={() => deleteRoutine(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, padding: '4px 6px' }} title="Delete routine">✕</button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ═══════════════════════════════════════════════
  // CREATE ROUTINE VIEW
  // ═══════════════════════════════════════════════
  if (view === 'create') return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
        <button onClick={() => setView('select')} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: '#555' }}>← Back</button>
        <h2 style={{ margin: 0 }}>Create Routine</h2>
      </div>
      <p style={{ color: '#888', marginBottom: 24, fontSize: 14 }}>Build a reusable workout template</p>

      {/* Routine name */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 4px 14px rgba(0,0,0,0.07)', marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>Routine Name *</label>
        <input
          value={cName}
          onChange={e => { setCName(e.target.value); setCError(''); }}
          placeholder="e.g. Push Day, Full Body, Upper/Lower…"
          style={inputStyle({ width: '100%', boxSizing: 'border-box' })}
        />
      </div>

      {/* Exercise search */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 4px 14px rgba(0,0,0,0.07)', marginBottom: 16 }}>
        <div ref={cSearchRef} style={{ position: 'relative' }}>
          <input
            value={cSearch}
            onChange={e => { setCSearch(e.target.value); setCDropdownOpen(true); setCError(''); }}
            onKeyDown={cHandleSearchKey}
            onFocus={() => setCDropdownOpen(true)}
            placeholder="Search exercises or type a custom name…"
            style={inputStyle({ width: '100%', boxSizing: 'border-box', paddingLeft: 36 })}
          />
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none', color: '#aaa' }}>🔍</span>
          {cDropdownOpen && cSearch.trim() && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 220, overflowY: 'auto' }}>
              {cSearchResults.length > 0 ? (
                cSearchResults.map(ex => (
                  <button key={ex} onMouseDown={e => { e.preventDefault(); cAddExercise(ex); }}
                    style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#333', display: 'block' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fff8f2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >{ex}</button>
                ))
              ) : (
                <button onMouseDown={e => { e.preventDefault(); cAddExercise(cSearch); }}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#ff8c42', display: 'block' }}
                >+ Add &ldquo;{cSearch}&rdquo; as custom exercise</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Exercise cards */}
      {cExs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {cExs.map((ex, exIdx) => (
            <ExerciseCard
              key={exIdx}
              ex={ex}
              showDone={false}
              onUpdateSet={(si, field, val) => cUpdateSet(exIdx, si, field, val)}
              onRemoveSet={si => cRemoveSet(exIdx, si)}
              onAddSet={() => cAddSet(exIdx)}
              onUpdateUnit={val => cUpdateUnit(exIdx, val)}
              onRemove={() => cRemoveEx(exIdx)}
            />
          ))}
        </div>
      )}

      {cError && <p style={{ color: '#e05c5c', margin: '0 0 12px', fontSize: 13 }}>{cError}</p>}

      <button onClick={cSave} style={{ background: '#ff8c42', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 32px', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
        Save Routine
      </button>
    </div>
  );

  // ═══════════════════════════════════════════════
  // SESSION VIEW
  // ═══════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <h2 style={{ margin: 0 }}>{sessionName}</h2>
          {sessionSource === 'routine' && (
            <span style={{ fontSize: 11, fontWeight: 600, background: '#f0f4ff', color: '#4f8ef7', borderRadius: 5, padding: '3px 8px', flexShrink: 0 }}>ROUTINE</span>
          )}
        </div>
        {!ending && (
          <button onClick={() => setEnding(true)} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13, color: '#555', fontWeight: 600, flexShrink: 0 }}>
            End Session
          </button>
        )}
      </div>
      <p style={{ color: '#888', marginBottom: 20, fontSize: 14 }}>{today}</p>

      {/* End session panel */}
      {ending && (
        <div style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 4px 14px rgba(0,0,0,0.07)', marginBottom: 24, border: '2px solid #ff8c42' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Finish Workout</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
                {uniqueEx} exercise{uniqueEx !== 1 ? 's' : ''} · {totalSets} set{totalSets !== 1 ? 's' : ''} completed{totalVol > 0 ? ` · ${totalVol.toLocaleString()} vol` : ''}
              </p>
            </div>
            <button onClick={() => setEnding(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <input
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="Routine name to save as…"
              style={inputStyle({ flex: '1 1 200px' })}
            />
            <button
              onClick={doSaveAsRoutine}
              disabled={!saveName.trim()}
              style={{ background: saveName.trim() ? '#ff8c42' : '#f0f0f0', color: saveName.trim() ? '#fff' : '#aaa', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 600, cursor: saveName.trim() ? 'pointer' : 'default', fontSize: 14 }}
            >Save as Routine</button>
          </div>
          <button onClick={finishSession} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, color: '#666' }}>
            Finish Without Saving
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Exercises',  value: uniqueEx,                                        sub: 'with completed sets', color: '#ff8c42' },
          { label: 'Sets Done',  value: totalSets,                                       sub: 'sets completed',      color: '#4f8ef7' },
          { label: 'Volume',     value: totalVol > 0 ? totalVol.toLocaleString() : '—', sub: 'weighted only',       color: '#5cb85c' },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 4px 14px rgba(0,0,0,0.07)', borderTop: `4px solid ${card.color}`, textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{card.sub}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Add exercise search */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 4px 14px rgba(0,0,0,0.07)', marginBottom: 16 }}>
        <div ref={sSearchRef} style={{ position: 'relative' }}>
          <input
            value={sSearch}
            onChange={e => { setSSearch(e.target.value); setSDropdownOpen(true); }}
            onKeyDown={sHandleSearchKey}
            onFocus={() => setSDropdownOpen(true)}
            placeholder="Search exercises or type a custom name…"
            style={inputStyle({ width: '100%', boxSizing: 'border-box', paddingLeft: 36 })}
          />
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none', color: '#aaa' }}>🔍</span>
          {sDropdownOpen && sSearch.trim() && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 220, overflowY: 'auto' }}>
              {sSearchResults.length > 0 ? (
                sSearchResults.map(ex => (
                  <button key={ex} onMouseDown={e => { e.preventDefault(); sAddExercise(ex); }}
                    style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#333', display: 'block' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fff8f2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >{ex}</button>
                ))
              ) : (
                <button onMouseDown={e => { e.preventDefault(); sAddExercise(sSearch); }}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#ff8c42', display: 'block' }}
                >+ Add &ldquo;{sSearch}&rdquo; as custom exercise</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Exercise cards */}
      {sessionExs.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 10, padding: '40px 0', textAlign: 'center', color: '#bbb', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          Search for an exercise above to get started.
        </div>
      ) : (
        sessionExs.map((ex, exIdx) => (
          <ExerciseCard
            key={exIdx}
            ex={ex}
            showDone={true}
            onUpdateSet={(si, field, val) => sUpdateSet(exIdx, si, field, val)}
            onRemoveSet={si => sRemoveSet(exIdx, si)}
            onAddSet={() => sAddSet(exIdx)}
            onUpdateUnit={val => sUpdateUnit(exIdx, val)}
            onRemove={() => sRemoveEx(exIdx)}
            onToggleDone={si => sToggleDone(exIdx, si)}
          />
        ))
      )}
    </div>
  );
}

// ── Shared exercise card component
function ExerciseCard({ ex, showDone, onUpdateSet, onRemoveSet, onAddSet, onUpdateUnit, onRemove, onToggleDone }) {
  // Grid columns differ based on whether the done toggle is shown
  const cols = showDone
    ? '32px 40px 1fr 1fr 1fr 24px'   // toggle | set# | reps | weight | rir | remove
    : '40px 1fr 1fr 1fr 24px';        // set# | reps | weight | rir | remove

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 4px 14px rgba(0,0,0,0.07)', marginBottom: 12 }}>
      {/* Exercise header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#222' }}>{ex.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={ex.unit}
            onChange={e => onUpdateUnit(e.target.value)}
            style={{ ...inputStyle(), padding: '6px 8px', fontSize: 13, cursor: 'pointer', width: 64 }}
          >
            <option value="lbs">lbs</option>
            <option value="kg">kg</option>
          </select>
          <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, padding: '2px 4px', lineHeight: 1 }} title="Remove exercise">✕</button>
        </div>
      </div>

      {/* Column labels */}
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 6, marginBottom: 4 }}>
        {showDone && <span />}
        <span />
        <span style={{ fontSize: 11, color: '#bbb', fontWeight: 600, textAlign: 'center' }}>REPS</span>
        <span style={{ fontSize: 11, color: '#bbb', fontWeight: 600, textAlign: 'center' }}>WEIGHT</span>
        <span style={{ fontSize: 11, color: '#bbb', fontWeight: 600, textAlign: 'center' }}>RIR</span>
        <span />
      </div>

      {/* Set rows */}
      {ex.sets.map((s, si) => {
        const done = showDone && s.done;
        return (
          <div key={si} style={{
            display: 'grid', gridTemplateColumns: cols, gap: 6, marginBottom: 6, alignItems: 'center',
            background: done ? '#f0fdf4' : 'transparent',
            borderRadius: done ? 7 : 0,
            padding: done ? '2px 4px' : '0',
            transition: 'background 0.15s',
          }}>
            {showDone && (
              <button
                onClick={() => onToggleDone(si)}
                title={done ? 'Mark incomplete' : 'Mark complete'}
                style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0, margin: '0 auto',
                  border: done ? 'none' : '2px solid #d0d0d0',
                  background: done ? '#5cb85c' : 'transparent',
                  cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                }}
              >{done ? '✓' : ''}</button>
            )}
            <span style={{ fontSize: 12, color: '#aaa', fontWeight: 600, textAlign: 'right', paddingRight: 4 }}>
              {si + 1}
            </span>
            <input
              type="number" min="1" placeholder="—" value={s.reps}
              onChange={e => onUpdateSet(si, 'reps', e.target.value)}
              style={inputStyle({ textAlign: 'center', padding: '7px 6px', opacity: done ? 0.5 : 1 })}
            />
            <input
              type="number" min="0" step="0.5" placeholder="—" value={s.weight}
              onChange={e => onUpdateSet(si, 'weight', e.target.value)}
              style={inputStyle({ textAlign: 'center', padding: '7px 6px', opacity: done ? 0.5 : 1 })}
            />
            <input
              type="number" min="0" max="10" placeholder="—" value={s.rir}
              onChange={e => onUpdateSet(si, 'rir', e.target.value)}
              style={inputStyle({ textAlign: 'center', padding: '7px 6px', opacity: done ? 0.5 : 1 })}
            />
            <button
              onClick={() => onRemoveSet(si)}
              disabled={ex.sets.length === 1}
              style={{ background: 'none', border: 'none', cursor: ex.sets.length > 1 ? 'pointer' : 'default', color: ex.sets.length > 1 ? '#ccc' : '#eee', fontSize: 15, padding: 0, lineHeight: 1 }}
              title="Remove set"
            >✕</button>
          </div>
        );
      })}

      {/* Add set */}
      <button
        onClick={onAddSet}
        style={{ marginTop: 6, background: 'none', border: '1px dashed #e0e0e0', borderRadius: 7, padding: '5px 14px', cursor: 'pointer', fontSize: 13, color: '#888' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff8c42'; e.currentTarget.style.color = '#ff8c42'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.color = '#888'; }}
      >+ Add Set</button>
    </div>
  );
}

function inputStyle(extra = {}) {
  return { padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fafafa', minWidth: 0, ...extra };
}
