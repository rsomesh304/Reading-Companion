import { MotifRenderer } from "./motifs/registry.jsx";
import { MOTIF_IDS } from "./motifs/motifIds.js";
import "./StoryAssetGallery.css";

const PALETTES = [
  { bg1: "#101b35", bg2: "#343d71", accent: "#e9c878", accent2: "#79d9ca" },
  { bg1: "#211824", bg2: "#58303d", accent: "#eea454", accent2: "#c96957" },
  { bg1: "#281932", bg2: "#563454", accent: "#f0a4a6", accent2: "#efcb78" },
  { bg1: "#102d32", bg2: "#31574e", accent: "#d9ca79", accent2: "#83d0ac" },
];

function Preview({ motif, index }) {
  const palette = PALETTES[index % PALETTES.length];
  const items = index % 3 === 0 ? ["Julian", "choice"] : index % 3 === 1 ? ["river", "return"] : ["memory", "hope"];
  const beat = { motif, label: motif === "quote_glow" ? "A turning point" : null, items, intensity: .4 + index % 5 / 10 };
  return <MotifRenderer beat={beat} palette={palette} mood={index % 4 === 0 ? "tense" : index % 4 === 1 ? "joyful" : index % 4 === 2 ? "sad" : "reflective"} />;
}

export default function StoryAssetGallery() {
  return (
    <main className="sa-gallery">
      <header className="sa-header">
        <div><span className="sa-kicker">READING COMPANION / STORY THEATRE</span><h1>Motif Gallery</h1></div>
        <p>{MOTIF_IDS.length} animated motifs</p>
      </header>
      <section className="sa-grid">
        {MOTIF_IDS.map((motif, index) => <article className="sa-item" key={motif}>
          <Preview motif={motif} index={index} />
          <span>{motif.replaceAll("_", " ")}</span>
        </article>)}
      </section>
    </main>
  );
}