import MotifArtwork from "./MotifArtwork.jsx";
export default function CrowdDots(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "crowd_dots" }} />; }