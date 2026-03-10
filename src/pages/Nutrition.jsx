import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'nutrition_log';
const DATE_KEY = 'nutrition_date';
const CARD_ORDER_KEY = 'nutrition_card_order';
const VISIBLE_KEY = 'nutrition_visible_macros';
const MY_FOODS_KEY = 'nutrition_my_foods';

const EMPTY_FORM = { name: '', calories: '', protein: '', fat: '', carbs: '', fiber: '', sugar: '' };

const MACROS = [
  { key: 'calories', label: 'Calories',  unit: 'kcal', color: '#ff8c42' },
  { key: 'protein',  label: 'Protein',   unit: 'g',    color: '#4f8ef7' },
  { key: 'carbs',    label: 'Carbs',     unit: 'g',    color: '#f7c948' },
  { key: 'fat',      label: 'Fat',       unit: 'g',    color: '#e05c5c' },
  { key: 'fiber',    label: 'Fiber',     unit: 'g',    color: '#5cb85c' },
  { key: 'sugar',    label: 'Sugar',     unit: 'g',    color: '#c87dd4' },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Nutrition() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [savedFoods, setSavedFoods] = useState(() => {
    try { return JSON.parse(localStorage.getItem(MY_FOODS_KEY) || '[]'); } catch { return []; }
  });
  const [myFoodsOpen, setMyFoodsOpen] = useState(false);
  const [myFoodsServings, setMyFoodsServings] = useState({});
  const [error, setError] = useState('');
  const [cardOrder, setCardOrder] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CARD_ORDER_KEY));
      if (Array.isArray(saved) && saved.length === MACROS.length) return saved;
    } catch {}
    return MACROS.map(m => m.key);
  });
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [visibleMacros, setVisibleMacros] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(VISIBLE_KEY));
      if (Array.isArray(saved)) return new Set(saved);
    } catch {}
    return new Set(MACROS.map(m => m.key));
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [servingSize, setServingSize] = useState('');
  const [servingUnit, setServingUnit] = useState('g');
  const [baseNutrients, setBaseNutrients] = useState(null);
  const searchTimeout = useRef(null);
  const searchRef = useRef(null);

  const orderedMacros = cardOrder.map(key => MACROS.find(m => m.key === key));
  const visibleOrderedMacros = orderedMacros.filter(m => visibleMacros.has(m.key));
  const visibleMacroList = MACROS.filter(m => visibleMacros.has(m.key));

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleMacro(key) {
    setVisibleMacros(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev; // always keep at least one visible
        next.delete(key);
      } else {
        next.add(key);
      }
      localStorage.setItem(VISIBLE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function handleDragStart(i) {
    setDragIndex(i);
  }

  function handleDragOver(e, i) {
    e.preventDefault();
    if (i !== dragOverIndex) setDragOverIndex(i);
  }

  function handleDrop(i) {
    if (dragIndex === null || dragIndex === i) return;
    const next = [...cardOrder];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    setCardOrder(next);
    localStorage.setItem(CARD_ORDER_KEY, JSON.stringify(next));
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function searchFood(query) {
    clearTimeout(searchTimeout.current);
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const key = import.meta.env.VITE_USDA_API_KEY;
        const res = await fetch(
          `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=8&api_key=${key}`
        );
        const data = await res.json();
        const results = (data.foods || []).map(food => {
          const n = id => food.foodNutrients?.find(x => x.nutrientId === id)?.value ?? 0;
          return {
            fdcId: food.fdcId,
            name: food.description,
            brand: food.brandOwner || '',
            calories: Math.round(n(1008)),
            protein:  Math.round(n(1003) * 10) / 10,
            carbs:    Math.round(n(1005) * 10) / 10,
            fat:      Math.round(n(1004) * 10) / 10,
            fiber:    Math.round(n(1079) * 10) / 10,
            sugar:    Math.round(n(2000) * 10) / 10,
          };
        });
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  }

  function handleSelectFood(food) {
    const base = {
      calories: food.calories,
      protein:  food.protein,
      carbs:    food.carbs,
      fat:      food.fat,
      fiber:    food.fiber,
      sugar:    food.sugar,
    };
    setBaseNutrients(base);
    setServingSize('100');
    setForm({
      name:     food.name,
      calories: base.calories || '',
      protein:  base.protein  || '',
      carbs:    base.carbs    || '',
      fat:      base.fat      || '',
      fiber:    base.fiber    || '',
      sugar:    base.sugar    || '',
    });
    setShowDropdown(false);
    setSearchResults([]);
  }

  function applyServing(size, unit, base) {
    if (!base || !size || isNaN(size)) return;
    const grams = unit === 'oz' ? Number(size) * 28.3495 : Number(size);
    const ratio = grams / 100;
    const scale = (val) => Math.round(val * ratio * 10) / 10 || '';
    setForm(f => ({
      ...f,
      calories: Math.round(base.calories * ratio) || '',
      protein:  scale(base.protein),
      carbs:    scale(base.carbs),
      fat:      scale(base.fat),
      fiber:    scale(base.fiber),
      sugar:    scale(base.sugar),
    }));
  }

  function handleServingChange(e) {
    const size = e.target.value;
    setServingSize(size);
    applyServing(size, servingUnit, baseNutrients);
  }

  function handleUnitToggle() {
    const nextUnit = servingUnit === 'g' ? 'oz' : 'g';
    setServingUnit(nextUnit);
    applyServing(servingSize, nextUnit, baseNutrients);
  }

  // Load entries, reset if it's a new day
  useEffect(() => {
    const savedDate = localStorage.getItem(DATE_KEY);
    const today = todayStr();
    if (savedDate !== today) {
      localStorage.setItem(DATE_KEY, today);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      setEntries([]);
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        setEntries(saved);
      } catch {
        setEntries([]);
      }
    }
  }, []);

  function persist(next) {
    setEntries(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setError('');
    if (name === 'name') {
      searchFood(value);
      setBaseNutrients(null);
    }
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Food name is required.'); return; }
    if (!form.calories || isNaN(Number(form.calories)) || Number(form.calories) < 0) {
      setError('Enter a valid calorie amount.'); return;
    }
    const now = new Date();
    const entry = {
      id: Date.now(),
      time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      name: form.name.trim(),
      servingSize: servingSize || '',
      servingUnit: servingUnit,
      calories: Number(form.calories) || 0,
      protein:  Number(form.protein)  || 0,
      fat:      Number(form.fat)      || 0,
      carbs:    Number(form.carbs)    || 0,
      fiber:    Number(form.fiber)    || 0,
      sugar:    Number(form.sugar)    || 0,
    };
    persist([...entries, entry]);
    setBaseNutrients(null);
    setServingSize('');
    setServingUnit('g');
    setForm(EMPTY_FORM);
  }

  function handleSaveToMyFoods() {
    if (!form.name.trim()) return;
    const already = savedFoods.some(f => f.name.toLowerCase() === form.name.trim().toLowerCase());
    if (already) return;
    const food = {
      name:     form.name.trim(),
      calories: Number(form.calories) || 0,
      protein:  Number(form.protein)  || 0,
      fat:      Number(form.fat)      || 0,
      carbs:    Number(form.carbs)    || 0,
      fiber:    Number(form.fiber)    || 0,
      sugar:    Number(form.sugar)    || 0,
      refServingSize: servingSize,
      refServingUnit: servingUnit,
    };
    const next = [...savedFoods, food];
    setSavedFoods(next);
    localStorage.setItem(MY_FOODS_KEY, JSON.stringify(next));
  }

  function handleDelete(id) {
    persist(entries.filter(e => e.id !== id));
  }

  function handleClearAll() {
    if (window.confirm('Clear all entries for today?')) persist([]);
  }

  function toGrams(size, unit) {
    return unit === 'oz' ? Number(size) * 28.3495 : Number(size);
  }

  function handleAddFromLibrary(food) {
    const serving = myFoodsServings[food.name];
    const currentSize = serving?.size;
    const currentUnit = serving?.unit ?? food.refServingUnit ?? 'g';
    const refSize = food.refServingSize;
    const refUnit = food.refServingUnit ?? 'g';

    let scaledFood = { ...food };
    if (currentSize && refSize && Number(currentSize) > 0 && Number(refSize) > 0) {
      const ratio = toGrams(currentSize, currentUnit) / toGrams(refSize, refUnit);
      const scale = (val) => Math.round((val || 0) * ratio * 10) / 10;
      scaledFood = {
        ...food,
        calories: Math.round((food.calories || 0) * ratio),
        protein:  scale(food.protein),
        carbs:    scale(food.carbs),
        fat:      scale(food.fat),
        fiber:    scale(food.fiber),
        sugar:    scale(food.sugar),
      };
    }

    const now = new Date();
    persist([...entries, {
      ...scaledFood,
      id: Date.now(),
      time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    }]);
  }

  function handleSaveEntryToMyFoods(entry) {
    const already = savedFoods.some(f => f.name.toLowerCase() === entry.name.toLowerCase());
    if (already) return;
    const { id: _id, time: _time, servingSize: ss, servingUnit: su, ...macros } = entry;
    const next = [...savedFoods, { ...macros, refServingSize: ss || '', refServingUnit: su || 'g' }];
    setSavedFoods(next);
    localStorage.setItem(MY_FOODS_KEY, JSON.stringify(next));
  }

  function handleDeleteSaved(name) {
    const next = savedFoods.filter(f => f.name !== name);
    setSavedFoods(next);
    localStorage.setItem(MY_FOODS_KEY, JSON.stringify(next));
  }

  const totals = MACROS.reduce((acc, m) => {
    acc[m.key] = entries.reduce((sum, e) => sum + (e[m.key] || 0), 0);
    return acc;
  }, {});

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 8px' }}>
      <h2 style={{ marginBottom: 4 }}>Nutrition Tracker</h2>
      <p style={{ color: '#888', marginBottom: 20, fontSize: 14 }}>{today} — entries reset each day</p>

      {/* Daily Summary Cards */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Totals</span>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#aaa', padding: '2px 6px', borderRadius: 6, lineHeight: 1 }}
              title="Show/hide macros"
            >⋯</button>
            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', zIndex: 100,
                background: '#fff', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                padding: '8px 0', minWidth: 160,
              }}>
                <p style={{ margin: '0 0 4px', padding: '4px 14px', fontSize: 11, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Show macros</p>
                {MACROS.map(m => (
                  <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', cursor: 'pointer', fontSize: 14 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f7f7fb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <input
                      type="checkbox"
                      checked={visibleMacros.has(m.key)}
                      onChange={() => toggleMacro(m.key)}
                      style={{ accentColor: m.color, width: 15, height: 15, cursor: 'pointer' }}
                    />
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                    {m.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleOrderedMacros.length}, 1fr)`, gap: 12 }}>
        {visibleOrderedMacros.map((m, i) => (
          <div
            key={m.key}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={e => handleDragOver(e, i)}
            onDrop={() => handleDrop(i)}
            onDragEnd={handleDragEnd}
            style={{
              background: '#fff',
              borderRadius: 10,
              padding: '14px 18px',
              boxShadow: dragOverIndex === i && dragIndex !== i
                ? `0 0 0 2px ${m.color}`
                : '0 4px 14px rgba(0,0,0,0.07)',
              borderTop: `4px solid ${m.color}`,
              textAlign: 'center',
              cursor: 'grab',
              opacity: dragIndex === i ? 0.4 : 1,
              transition: 'opacity 0.15s, box-shadow 0.15s',
              userSelect: 'none',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>
              {totals[m.key].toFixed(m.key === 'calories' ? 0 : 1)}
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{m.unit}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{m.label}</div>
          </div>
        ))}
        </div>
      </div>

      {/* Entry Form */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 4px 14px rgba(0,0,0,0.07)', marginBottom: 24 }}>
        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 16 }}>Add Food</h3>
        <form onSubmit={handleAdd}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <div ref={searchRef} style={{ flex: '2 1 180px', position: 'relative' }}>
              <input
                name="name"
                placeholder="Food name *"
                value={form.name}
                onChange={handleChange}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                style={inputStyle({ width: '100%', boxSizing: 'border-box' })}
                autoComplete="off"
              />
              {searchLoading && (
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#aaa' }}>
                  searching…
                </span>
              )}
              {showDropdown && (
                <div style={{
                  position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 200,
                  background: '#fff', borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.13)',
                  border: '1px solid #e8e8e8',
                  maxHeight: 320, overflowY: 'auto',
                }}>
                  {searchResults.map(food => (
                    <button
                      key={food.fdcId}
                      type="button"
                      onClick={() => handleSelectFood(food)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '10px 14px', borderBottom: '1px solid #f0f0f0',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fff8f3'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{food.name}</div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                        {food.calories} kcal · {food.protein}g protein · {food.carbs}g carbs · {food.fat}g fat
                        {food.brand && <span> · {food.brand}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 150px' }}>
              <input
                type="number"
                min="0.1"
                step="any"
                placeholder="Serving size"
                value={servingSize}
                onChange={handleServingChange}
                style={inputStyle({ flex: 1, minWidth: 0 })}
              />
              <button
                type="button"
                onClick={handleUnitToggle}
                style={{
                  background: '#f0f0f0', border: 'none', borderRadius: 6,
                  padding: '7px 10px', cursor: 'pointer', fontSize: 12,
                  fontWeight: 600, color: '#555', whiteSpace: 'nowrap',
                }}
              >{servingUnit}</button>
            </div>
            <input
              name="calories"
              type="number"
              min="0"
              step="any"
              placeholder="Calories *"
              value={form.calories}
              onChange={handleChange}
              style={inputStyle({ flex: '1 1 100px' })}
            />
            <input
              name="protein"
              type="number"
              min="0"
              step="any"
              placeholder="Protein (g)"
              value={form.protein}
              onChange={handleChange}
              style={inputStyle({ flex: '1 1 100px' })}
            />
            <input
              name="carbs"
              type="number"
              min="0"
              step="any"
              placeholder="Carbs (g)"
              value={form.carbs}
              onChange={handleChange}
              style={inputStyle({ flex: '1 1 100px' })}
            />
            <input
              name="fat"
              type="number"
              min="0"
              step="any"
              placeholder="Fat (g)"
              value={form.fat}
              onChange={handleChange}
              style={inputStyle({ flex: '1 1 100px' })}
            />
            <input
              name="fiber"
              type="number"
              min="0"
              step="any"
              placeholder="Fiber (g)"
              value={form.fiber}
              onChange={handleChange}
              style={inputStyle({ flex: '1 1 90px' })}
            />
            <input
              name="sugar"
              type="number"
              min="0"
              step="any"
              placeholder="Sugar (g)"
              value={form.sugar}
              onChange={handleChange}
              style={inputStyle({ flex: '1 1 90px' })}
            />
          </div>
          {error && <p style={{ color: '#e05c5c', margin: '0 0 10px', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button type="submit" style={{
              background: '#ff8c42', color: '#fff', border: 'none',
              borderRadius: 8, padding: '9px 22px', fontWeight: 600,
              cursor: 'pointer', fontSize: 14,
            }}>
              + Add Entry
            </button>
            <button
              type="button"
              onClick={handleSaveToMyFoods}
              disabled={!form.name.trim() || savedFoods.some(f => f.name.toLowerCase() === form.name.trim().toLowerCase())}
              style={{
                background: 'none', border: '1px solid #ddd', borderRadius: 8,
                padding: '9px 18px', cursor: 'pointer', fontSize: 14, color: '#555',
                fontWeight: 500, opacity: (!form.name.trim() || savedFoods.some(f => f.name.toLowerCase() === form.name.trim().toLowerCase())) ? 0.4 : 1,
              }}
            >
              {savedFoods.some(f => f.name.toLowerCase() === form.name.trim().toLowerCase()) ? 'Already in My Foods' : 'Save to My Foods'}
            </button>
          </div>
        </form>
      </div>

      {/* My Foods Library */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 4px 14px rgba(0,0,0,0.07)', marginBottom: 24, overflow: 'hidden' }}>
        <button
          onClick={() => setMyFoodsOpen(o => !o)}
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 20px', fontSize: 15, fontWeight: 600, color: '#333',
          }}
        >
          <span>My Foods <span style={{ fontSize: 12, fontWeight: 400, color: '#aaa', marginLeft: 6 }}>{savedFoods.length} saved</span></span>
          <span style={{ fontSize: 12, color: '#aaa' }}>{myFoodsOpen ? '▲' : '▼'}</span>
        </button>
        {myFoodsOpen && (
          savedFoods.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#bbb', padding: '20px 0', margin: 0, fontSize: 14 }}>
              No saved foods yet — check "Save to My Foods" when adding an entry.
            </p>
          ) : (
            <div style={{ padding: '0 16px 16px' }}>
              {savedFoods.map(food => {
                const serving = myFoodsServings[food.name];
                const currentSize = serving?.size ?? food.refServingSize ?? '';
                const currentUnit = serving?.unit ?? food.refServingUnit ?? 'g';
                const refSize = food.refServingSize;
                const refUnit = food.refServingUnit ?? 'g';

                let preview = { calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat };
                if (currentSize && refSize && Number(currentSize) > 0 && Number(refSize) > 0) {
                  const ratio = toGrams(currentSize, currentUnit) / toGrams(refSize, refUnit);
                  preview = {
                    calories: Math.round((food.calories || 0) * ratio),
                    protein:  Math.round((food.protein  || 0) * ratio * 10) / 10,
                    carbs:    Math.round((food.carbs    || 0) * ratio * 10) / 10,
                    fat:      Math.round((food.fat      || 0) * ratio * 10) / 10,
                  };
                }

                return (
                  <div key={food.name} style={{
                    padding: '10px 12px', borderRadius: 8, marginBottom: 6,
                    background: '#fafafa', border: '1px solid #f0f0f0',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{food.name}</span>
                        {refSize && (
                          <span style={{ fontSize: 11, color: '#bbb', marginLeft: 8 }}>
                            ref: {refSize}{refUnit}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteSaved(food.name)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}
                        title="Remove from My Foods"
                      >✕</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        placeholder={`Amount (${currentUnit})`}
                        value={currentSize}
                        onChange={e => setMyFoodsServings(prev => ({
                          ...prev,
                          [food.name]: { size: e.target.value, unit: currentUnit },
                        }))}
                        style={inputStyle({ width: 90 })}
                      />
                      <button
                        type="button"
                        onClick={() => setMyFoodsServings(prev => ({
                          ...prev,
                          [food.name]: { size: currentSize, unit: currentUnit === 'g' ? 'oz' : 'g' },
                        }))}
                        style={{
                          background: '#f0f0f0', border: 'none', borderRadius: 6,
                          padding: '7px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#555',
                        }}
                      >{currentUnit}</button>
                      <span style={{ fontSize: 12, color: '#aaa' }}>
                        {preview.calories} kcal
                        {preview.protein > 0 && ` · ${preview.protein}g protein`}
                        {preview.carbs > 0 && ` · ${preview.carbs}g carbs`}
                        {preview.fat > 0 && ` · ${preview.fat}g fat`}
                      </span>
                      <button
                        onClick={() => handleAddFromLibrary(food)}
                        style={{
                          background: '#ff8c42', color: '#fff', border: 'none',
                          borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                          fontSize: 12, fontWeight: 600, marginLeft: 'auto',
                        }}
                      >+ Add</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Log Table */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 4px 14px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Today's Log ({entries.length} {entries.length === 1 ? 'item' : 'items'})</h3>
          {entries.length > 0 && (
            <button onClick={handleClearAll} style={{
              background: 'none', border: '1px solid #ddd', borderRadius: 6,
              padding: '5px 12px', cursor: 'pointer', fontSize: 12, color: '#888',
            }}>
              Clear All
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#bbb', padding: '32px 0', margin: 0 }}>
            No foods logged yet — add your first entry above.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={thStyle({ textAlign: 'left' })}>Food</th>
                  {visibleMacroList.map(m => (
                    <th key={m.key} style={thStyle()}>{m.label}<br /><span style={{ fontWeight: 400, color: '#aaa', fontSize: 11 }}>{m.unit}</span></th>
                  ))}
                  <th style={thStyle({ color: '#aaa' })}>Time</th>
                  <th style={thStyle()}></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={entry.id} style={{ borderTop: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>
                      {entry.name}
                      {entry.servingSize && (
                        <div style={{ fontSize: 11, color: '#bbb', fontWeight: 400, marginTop: 2 }}>
                          {entry.servingSize}{entry.servingUnit}
                        </div>
                      )}
                    </td>
                    {visibleMacroList.map(m => (
                      <td key={m.key} style={{ padding: '10px 16px', textAlign: 'center', color: m.key === 'calories' ? '#ff8c42' : '#333', fontWeight: m.key === 'calories' ? 600 : 400 }}>
                        {entry[m.key] > 0 ? (m.key === 'calories' ? entry[m.key] : entry[m.key].toFixed(1)) : <span style={{ color: '#ddd' }}>—</span>}
                      </td>
                    ))}
                    <td style={{ padding: '10px 16px', textAlign: 'center', color: '#aaa', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {entry.time || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleSaveEntryToMyFoods(entry)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#bbb', lineHeight: 1, padding: 4,
                          visibility: savedFoods.some(f => f.name.toLowerCase() === entry.name.toLowerCase()) ? 'hidden' : 'visible',
                        }}
                        title="Save to My Foods"
                      >
                        <svg width="13" height="15" viewBox="0 0 13 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                          <path d="M1.5 1.5h10v12l-5-3-5 3V1.5z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(entry.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#ccc', fontSize: 16, lineHeight: 1, padding: 4,
                      }} title="Remove">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #eee', background: '#fff8f3' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 700, color: '#555' }}>Total</td>
                  {visibleMacroList.map(m => (
                    <td key={m.key} style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: m.color }}>
                      {m.key === 'calories' ? totals[m.key].toFixed(0) : totals[m.key].toFixed(1)}
                    </td>
                  ))}
                  <td />
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function inputStyle(extra = {}) {
  return {
    padding: '9px 12px',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    background: '#fafafa',
    minWidth: 0,
    ...extra,
  };
}

function thStyle(extra = {}) {
  return {
    padding: '10px 16px',
    fontWeight: 600,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    ...extra,
  };
}
