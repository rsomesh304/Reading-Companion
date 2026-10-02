import MotifArtwork from "./MotifArtwork.jsx";
export default function QuoteGlow(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "quote_glow" }} />; }