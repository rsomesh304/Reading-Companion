import MotifArtwork from "./MotifArtwork.jsx";
export default function LightBeam(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "light_beam" }} />; }