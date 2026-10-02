import MotifArtwork from "./MotifArtwork.jsx";
export default function Constellation(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "constellation" }} />; }