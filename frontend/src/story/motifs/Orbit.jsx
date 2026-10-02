import MotifArtwork from "./MotifArtwork.jsx";
export default function Orbit(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "orbit" }} />; }