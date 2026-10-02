import MotifArtwork from "./MotifArtwork.jsx";
export default function ChainBreak(props) { return <MotifArtwork {...props} beat={{ ...props.beat, motif: "chain_break" }} />; }