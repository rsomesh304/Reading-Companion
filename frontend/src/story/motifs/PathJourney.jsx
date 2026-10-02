import MotifArtwork from "./MotifArtwork.jsx";
export default function PathJourney(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "path_journey" }} />; }