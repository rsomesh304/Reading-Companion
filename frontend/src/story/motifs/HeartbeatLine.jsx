import MotifArtwork from "./MotifArtwork.jsx";
export default function HeartbeatLine(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "heartbeat_line" }} />; }