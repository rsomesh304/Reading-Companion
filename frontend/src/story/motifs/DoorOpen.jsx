import MotifArtwork from "./MotifArtwork.jsx";
export default function DoorOpen(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "door_open" }} />; }