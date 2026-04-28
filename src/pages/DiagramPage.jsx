import { useEffect, useMemo, useRef, useState } from "react";
import HumanDiagram from "../components/HumanDiagram";
import HumanDiagramBack from "../components/HumanDiagramBack";
import HumanDiagramFemaleFront from "../components/HumanDiagramFemaleFront";
import HumanDiagramFemaleBack from "../components/HumanDiagramFemaleBack";
import staticMuscles from "../data/muscles";
import { supabase } from "../lib/supabase";

export default function DiagramPage() {
  const [selected, setSelected] = useState(null);
  const [activePart, setActivePart] = useState(null);
  const [diagramView, setDiagramView] = useState("front");
  const [muscles, setMuscles] = useState(staticMuscles);
  const [videos, setVideos] = useState({});
  const [activeExercise, setActiveExercise] = useState(null);
  const diagramRef = useRef(null);

  useEffect(() => {
    supabase
      .from("muscles")
      .select("*, muscle_parts(*)")
      .order("display_order")
      .then(({ data, error }) => {
        if (error || !data?.length) return;
        const dict = {};
        for (const row of data) {
          const parts = (row.muscle_parts ?? [])
            .sort((a, b) => a.display_order - b.display_order)
            .map(({ key, name, description, tips, exercises }) => ({
              key,
              name,
              description,
              tips,
              exercises: exercises ?? [],
            }));
          dict[row.slug] = {
            slug: row.slug,
            name: row.name,
            description: row.description,
            tips: row.tips,
            exercises: row.exercises ?? [],
            contraindications: row.contraindications ?? [],
            parts,
          };
        }
        setMuscles(dict);
      });

    supabase
      .from("exercise_videos")
      .select("name, url")
      .then(({ data }) => {
        if (!data?.length) return;
        const map = {};
        for (const row of data) map[row.name.toLowerCase()] = row.url;
        setVideos(map);
      });
  }, []);

  const extractSlug = (val) => {
    if (typeof val === "string") return val;

    if (val && typeof val === "object") {
      if (val.slug || val.name || val.id || val.key) {
        return val.slug || val.name || val.id || val.key;
      }
      const t = val.target || val.currentTarget;
      if (t) {
        const el = t.closest ? t.closest("[data-muscle], [aria-label]") : t;
        const byData =
          el?.dataset?.muscle ??
          el?.getAttribute?.("data-muscle") ??
          t?.dataset?.muscle ??
          t?.getAttribute?.("data-muscle");
        const byAria =
          el?.getAttribute?.("aria-label") ?? t?.getAttribute?.("aria-label");
        if (byData) return byData;
        if (byAria) return byAria;

        const id = el?.id || t?.id;
        if (id && /[a-z]+(\.(left|right))?$/i.test(id)) return id;
      }
    }

    return null;
  };

  const normalizeForDisplay = (slug) => {
    if (!slug) return null;
    const base = slug.replace(/\.(left|right)$/i, "");
    return base.charAt(0).toUpperCase() + base.slice(1);
  };

  useEffect(() => {
    const root = diagramRef.current;
    if (!root) return;

    const onClickCapture = (e) => {
      // ignore clicks on the info panel
      if (e.target.closest('.info-panel')) return;
      const slug = extractSlug(e);
      if (slug) setSelected(slug);
      else setSelected(null);
    };

    const onCustom = (e) => {
      const slug = e?.detail?.slug || extractSlug(e);
      if (slug) setSelected(slug);
    };

    root.addEventListener("click", onClickCapture, true);
    window.addEventListener("muscle-select", onCustom);

    return () => {
      root.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("muscle-select", onCustom);
    };
  }, []);

  const displayName = useMemo(() => normalizeForDisplay(selected), [selected]);

  const displayInfo = useMemo(() => {
    if (!selected) return null;
    const base = selected.replace(/\.(left|right)$/i, "");
    return muscles[base] || null;
  }, [selected, muscles]);

  useEffect(() => {
    setActivePart(null);
    setActiveExercise(null);
  }, [selected]);

  useEffect(() => {
    setActiveExercise(null);
  }, [activePart]);

  const toEmbedUrl = (url) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}?rel=0`;
      const parts = u.pathname.split("/").filter(Boolean);
      const segIdx = parts.findIndex((p) => p === "shorts" || p === "embed" || p === "v");
      if (segIdx !== -1 && parts[segIdx + 1]) return `https://www.youtube.com/embed/${parts[segIdx + 1]}?rel=0`;
    } catch (_) {}
    return null;
  };

  const handleExerciseClick = (ex) => {
    setActiveExercise((prev) => (prev === ex ? null : ex));
  };

  return (
    <>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setDiagramView("front")}
          className={
            diagramView === "front"
              ? "px-3 py-1.5 rounded-full border cursor-pointer bg-[#ff8c42] text-white border-[#ff8c42]"
              : "px-3 py-1.5 rounded-full border border-gray-300 bg-white text-gray-900 cursor-pointer"
          }
        >
          Front (Male)
        </button>
        <button
          type="button"
          onClick={() => setDiagramView("back")}
          className={
            diagramView === "back"
              ? "px-3 py-1.5 rounded-full border cursor-pointer bg-[#ff8c42] text-white border-[#ff8c42]"
              : "px-3 py-1.5 rounded-full border border-gray-300 bg-white text-gray-900 cursor-pointer"
          }
        >
          Back (Male)
        </button>
        <button
          type="button"
          onClick={() => setDiagramView("front2")}
          className={
            diagramView === "front2"
              ? "px-3 py-1.5 rounded-full border cursor-pointer bg-[#ff8c42] text-white border-[#ff8c42]"
              : "px-3 py-1.5 rounded-full border border-gray-300 bg-white text-gray-900 cursor-pointer"
          }
        >
          Front (Female)
        </button>
        <button
          type="button"
          onClick={() => setDiagramView("back2")}
          className={
            diagramView === "back2"
              ? "px-3 py-1.5 rounded-full border cursor-pointer bg-[#ff8c42] text-white border-[#ff8c42]"
              : "px-3 py-1.5 rounded-full border border-gray-300 bg-white text-gray-900 cursor-pointer"
          }
        >
          Back (Female)
        </button>
      </div>

      <div className="flex gap-5" ref={diagramRef}>
        <div className="shrink-0 self-start">
          {diagramView === "front" ? (
            <HumanDiagram
              selectedSlugs={selected ? [selected] : []}
              selectedSubpart={
                selected && activePart ? `${selected}.${activePart}` : selected
              }
            />
          ) : diagramView === "back" ? (
            <HumanDiagramBack selectedSlugs={selected ? [selected] : []} />
          ) : diagramView === "front2" ? (
            <HumanDiagramFemaleFront
              selectedSlugs={selected ? [selected] : []}
            />
          ) : (
            <HumanDiagramFemaleBack
              selectedSlugs={selected ? [selected] : []}
            />
          )}
        </div>

        <div className="sticky top-4 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="info-panel bg-white p-3 rounded-lg flex-1 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
            <h2>
              <strong>{displayName}</strong>
            </h2>
            {displayInfo ? (
              <>
                {/* Parts selector — always visible when parts exist */}
                {displayInfo.parts && displayInfo.parts.length ? (
                  <div className="mt-1 mb-3">
                    <div className="flex gap-2 flex-wrap">
                      {displayInfo.parts.map((p) => (
                        <button
                          key={p.key}
                          onClick={() => setActivePart(activePart === p.key ? null : p.key)}
                          className={
                            activePart === p.key
                              ? "px-2.5 py-1.5 rounded-md border-2 border-[#ff8c42] bg-[#ff8c42] text-white cursor-pointer text-sm"
                              : "px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-gray-900 cursor-pointer text-sm"
                          }
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Active part detail — replaces muscle-level content */}
                {activePart ? (
                  (() => {
                    const part = displayInfo.parts?.find((pp) => pp.key === activePart);
                    if (!part) return null;
                    return (
                      <>
                        <p className="text-xs text-gray-400 mb-1 mt-0">{displayInfo.name}</p>
                        <h3 className="mt-0 mb-1">{part.name}</h3>
                        <p>{part.description}</p>
                        {part.tips ? (
                          <p><strong>Tips:</strong> {part.tips}</p>
                        ) : null}
                        {part.exercises && part.exercises.length ? (
                          <>
                            <p><strong>Exercises</strong></p>
                            <ul className="list-none p-0 m-0">
                              {part.exercises.map((ex) => {
                                const embedUrl = toEmbedUrl(videos[ex.toLowerCase()]);
                                const isActive = activeExercise === ex;
                                return (
                                  <li key={ex} className="mb-1">
                                    <button
                                      className="text-blue-600 underline text-left cursor-pointer bg-transparent border-0 p-0 font-inherit text-[inherit]"
                                      onClick={() => handleExerciseClick(ex)}
                                    >
                                      {ex}
                                    </button>
                                    {isActive && embedUrl && (
                                      <div className="mt-1.5 rounded-lg overflow-hidden" style={{ position: "relative", paddingTop: "56.25%" }}>
                                        <iframe
                                          title={ex}
                                          src={embedUrl}
                                          allow="autoplay; encrypted-media"
                                          allowFullScreen
                                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                                        />
                                      </div>
                                    )}
                                    {isActive && !embedUrl && (
                                      <p className="text-gray-400 text-sm mt-0.5">No video available</p>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </>
                        ) : null}
                      </>
                    );
                  })()
                ) : (
                  /* No part selected — show muscle-level content */
                  <>
                    <p>{displayInfo.description}</p>
                    {displayInfo.tips ? (
                      <p><strong>Tips:</strong> {displayInfo.tips}</p>
                    ) : null}
                    {displayInfo.exercises && displayInfo.exercises.length ? (
                      <>
                        <p><strong>Exercises</strong></p>
                        <ul className="list-none p-0 m-0">
                          {displayInfo.exercises.map((ex) => {
                            const embedUrl = toEmbedUrl(videos[ex.toLowerCase()]);
                            const isActive = activeExercise === ex;
                            return (
                              <li key={ex} className="mb-1">
                                <button
                                  className="text-blue-600 underline text-left cursor-pointer bg-transparent border-0 p-0 font-inherit text-[inherit]"
                                  onClick={() => handleExerciseClick(ex)}
                                >
                                  {ex}
                                </button>
                                {isActive && embedUrl && (
                                  <div className="mt-1.5 rounded-lg overflow-hidden" style={{ position: "relative", paddingTop: "56.25%" }}>
                                    <iframe
                                      title={ex}
                                      src={embedUrl}
                                      allow="autoplay; encrypted-media"
                                      allowFullScreen
                                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                                    />
                                  </div>
                                )}
                                {isActive && !embedUrl && (
                                  <p className="text-gray-400 text-sm mt-0.5">No video available</p>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    ) : null}
                    {displayInfo.contraindications && displayInfo.contraindications.length ? (
                      <>
                        <p><strong>Contraindications</strong></p>
                        <ul>
                          {displayInfo.contraindications.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </>
                )}
              </>
            ) : (
              <p>No muscle selected. Click the diagram to get started.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
