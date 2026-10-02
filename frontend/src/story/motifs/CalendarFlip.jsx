import MotifArtwork from "./MotifArtwork.jsx";
export default function CalendarFlip(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "calendar_flip" }} />; }