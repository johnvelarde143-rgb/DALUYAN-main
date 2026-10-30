import { useEffect, useMemo, useState } from "react";
import { backend, configured } from "../lib/supabase";
import { municipalityVisuals as fallbackVisuals, type MunicipalityVisual } from "../data/municipalityVisuals";

const ROTATION_MS = 9000;

function TownStory({ town, visuals, index, selected, onSelect }: { town: string; visuals: MunicipalityVisual[]; index: number; selected: boolean; onSelect: () => void }) {
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const active = visuals[current] ?? visuals[0];
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    setCurrent(0); setFailed(false);
  }, [visuals]);
  useEffect(() => {
    if (reducedMotion || visuals.length < 2) return;
    const timer = window.setInterval(() => setCurrent((value) => (value + 1) % visuals.length), ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [reducedMotion, visuals.length]);
  const fallback = `/landscape-${(index % 6) + 1}.svg`;
  return (
    <button className={"town-story " + (selected ? "selected" : "")} aria-label={`Show ${town} stories`} aria-pressed={selected} title={`${active?.image_title ?? town} · ${active?.source_name ?? "DALUYAN"}`} onClick={onSelect}>
      <span className="story-ring story-photo-ring">
        <img className="story-photo" key={active?.image_url ?? fallback} src={failed ? fallback : active?.image_url ?? fallback} alt={active?.image_title ? `${active.image_title}, ${town}` : `${town} tourism preview`} loading="lazy" onError={() => setFailed(true)} />
        <span className="story-photo-shade" />
        <span className="story-initial">{town.slice(0, 2).toUpperCase()}</span>
      </span>
      <span>{town}</span>
      {visuals.length > 1 && <span className="story-dots" aria-hidden="true">{visuals.map((visual, i) => <i className={i === current ? "active" : ""} key={`${visual.image_url}-${i}`} />)}</span>}
    </button>
  );
}

export function MunicipalityStories({ towns, selected, onSelect }: { towns: readonly string[]; selected: string; onSelect: (town: string) => void }) {
  const [visuals, setVisuals] = useState<MunicipalityVisual[]>(fallbackVisuals);
  useEffect(() => {
    if (!configured) return;
    let active = true;
    void backend().from("municipality_visuals").select("*").eq("is_active", true).order("municipality_name").order("display_order").then(({ data }) => {
      if (active && data?.length) setVisuals(data as MunicipalityVisual[]);
    });
    return () => { active = false; };
  }, []);
  const byTown = useMemo(() => new Map(towns.map((town) => [town, visuals.filter((visual) => visual.municipality_name === town)])), [towns, visuals]);
  return <div className="stories-track">{towns.map((town, index) => <TownStory key={town} town={town} index={index} visuals={byTown.get(town) ?? []} selected={selected === town} onSelect={() => onSelect(town)} />)}</div>;
}
