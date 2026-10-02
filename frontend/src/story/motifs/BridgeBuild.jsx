import MotifArtwork from "./MotifArtwork.jsx";
export default function BridgeBuild(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "bridge_build" }} />; }