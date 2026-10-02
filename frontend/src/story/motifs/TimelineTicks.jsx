import MotifArtwork from "./MotifArtwork.jsx";
export default function TimelineTicks(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "timeline_ticks" }} />; }