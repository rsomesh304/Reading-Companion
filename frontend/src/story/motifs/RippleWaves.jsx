import MotifArtwork from "./MotifArtwork.jsx";
export default function RippleWaves(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "ripple_waves" }} />; }