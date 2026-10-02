import MotifArtwork from "./MotifArtwork.jsx";
export default function FallingDusk(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "falling_dusk" }} />; }