import MotifArtwork from "./MotifArtwork.jsx";
export default function KnotUntie(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "knot_untie" }} />; }